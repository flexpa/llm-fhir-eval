import { type EnvOverrides, type ProviderResponse } from 'promptfoo';
import type Anthropic from '@anthropic-ai/sdk';
import { APIError } from '@anthropic-ai/sdk';
import { getEnvInt, getEnvFloat } from 'promptfoo/dist/src/envars';
import logger from 'promptfoo/dist/src/logger';
import { maybeLoadToolsFromExternalFile } from 'promptfoo/dist/src/util';
import { AnthropicGenericProvider } from 'promptfoo/dist/src/providers/anthropic/generic';
import type { AnthropicMessageOptions } from 'promptfoo/dist/src/providers/anthropic/types';
import {
  outputFromMessage,
  parseMessages,
  calculateAnthropicCost,
  getTokenUsage,
  ANTHROPIC_MODELS,
} from 'promptfoo/dist/src/providers/anthropic/util';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default class AnthropicMessagesProvider extends AnthropicGenericProvider {
  declare config: AnthropicMessageOptions;
  private initializationPromise: Promise<void> | null = null;

  static ANTHROPIC_MODELS = ANTHROPIC_MODELS;

  static ANTHROPIC_MODELS_NAMES = ANTHROPIC_MODELS.map((model) => model.id);

  constructor(options: { id?: string; config?: AnthropicMessageOptions; env?: EnvOverrides } = {}) {
    if (!AnthropicMessagesProvider.ANTHROPIC_MODELS_NAMES.includes(options.config!.model!)) {
      logger.warn(`Using unknown Anthropic model: ${options.config?.model}`);
    }
    super(options.config?.model || 'claude-3-5-sonnet-20241022', options);
    const { id } = options;
    this.id = id ? () => id : this.id;
  }

  async cleanup(): Promise<void> {}

  toString(): string {
    if (!this.modelName) {
      throw new Error('Anthropic model name is not set. Please provide a valid model name.');
    }
    return `[Anthropic Messages Provider ${this.modelName}]`;
  }

  private extractToolUses(message: any): {
    toolUses: Array<{ id: string; name: string; arguments: any }>;
    resultText: string;
  } {
    const toolUses: Array<{ id: string; name: string; arguments: any }> = [];
    let resultText = '';

    // The assistant message content is an array of blocks. Iterate over them to find tool calls.
    if (Array.isArray((message as any).content)) {
      for (const block of (message as any).content) {
        if (block.type === 'tool_use') {
          toolUses.push({ id: block.id, name: block.name, arguments: block.input });
        } else if (block.type === 'text') {
          resultText += block.text;
        }
      }
    } else if (typeof (message as any).content === 'string') {
      // Fallback: if the content is a simple string, treat it as text.
      resultText += (message as any).content;
    }

    return { toolUses, resultText };
  }

  private async executeToolCall(
    toolUse: { id: string; name: string; arguments: any },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callbacks: Record<string, (...args: any[]) => any>,
  ): Promise<{ role: 'user'; content: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> }> {
    const { name, id, arguments: args } = toolUse;

    if (!callbacks[name]) {
      logger.warn(`No callback configured for tool '${name}'. Returning placeholder result.`);
      return {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: id,
            content: `No callback configured for tool '${name}'.`,
          },
        ],
      } as any;
    }

    try {
      const toolResult = await callbacks[name](typeof args === 'string' ? args : JSON.stringify(args));
      return {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: id,
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
          },
        ],
      } as any;
    } catch (error) {
      logger.error(`Error executing tool '${name}': ${error}`);
      return {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: id,
            content: `error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      } as any;
    }
  }

  async callApi(prompt: string): Promise<ProviderResponse> {
    // Wait for MCP initialization if it's in progress
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    if (!this.apiKey) {
      throw new Error(
        'Anthropic API key is not set. Set the ANTHROPIC_API_KEY environment variable or add `apiKey` to the provider config.',
      );
    }

    if (!this.modelName) {
      throw new Error('Anthropic model name is not set. Please provide a valid model name.');
    }

    const { system, extractedMessages, thinking } = parseMessages(prompt);

    // Get MCP tools if client is initialized
    const fileTools = maybeLoadToolsFromExternalFile(this.config.tools) || [];
    const allTools = [...fileTools];

    const maxDepth = (this.config as any)?.maxDepth ?? 10;
    const toolCallbacks: Record<string, (...args: any[]) => any> | undefined = (this.config as any)
      ?.functionToolCallbacks;

    let depth = 0;
    let messages: any[] = extractedMessages as any[];

    let accumTokenUsage = { prompt: 0, completion: 0, total: 0 } as {
      prompt: number;
      completion: number;
      total: number;
    };
    let accumCost = 0;

    const headers: Record<string, string> = {
      ...(this.config.headers || {}),
    };

    // Add beta features header if specified
    if (this.config.beta?.length) {
      headers['anthropic-beta'] = this.config.beta.join(',');
    }

    while (depth <= maxDepth) {
      const params: Anthropic.MessageCreateParams = {
        model: this.modelName,
        ...(system ? { system } : {}),
        max_tokens:
          this.config?.max_tokens || getEnvInt('ANTHROPIC_MAX_TOKENS', this.config.thinking || thinking ? 2048 : 1024),
        messages,
        stream: false,
        temperature:
          this.config.thinking || thinking
            ? this.config.temperature
            : this.config.temperature || getEnvFloat('ANTHROPIC_TEMPERATURE', 0),
        ...(allTools.length > 0 ? { tools: allTools } : {}),
        ...(this.config.tool_choice ? { tool_choice: this.config.tool_choice } : {}),
        ...(this.config.thinking || thinking ? { thinking: this.config.thinking || thinking } : {}),
        ...(typeof this.config?.extra_body === 'object' && this.config.extra_body ? this.config.extra_body : {}),
      };

      logger.debug(`Calling Anthropic Messages API (depth ${depth}): ${JSON.stringify(params)}`);

      let response: any;
      try {
        response = await this.anthropic.messages.create(params, {
          ...(Object.keys(headers).length > 0 ? { headers } : {}),
        });
      } catch (err) {
        logger.error(`Anthropic Messages API call error: ${err instanceof Error ? err.message : String(err)}`);
        if (err instanceof APIError && err.error) {
          const errorDetails = err.error as { error: { message: string; type: string } };
          return {
            error: `API call error: ${errorDetails.error.message}, status ${err.status}, type ${errorDetails.error.type}`,
          };
        }
        return {
          error: `API call error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }

      // Aggregate token usage and cost
      const tokenUsage = getTokenUsage(response, false);
      accumTokenUsage = {
        prompt: (accumTokenUsage.prompt || 0) + (tokenUsage.prompt || 0),
        completion: (accumTokenUsage.completion || 0) + (tokenUsage.completion || 0),
        total: (accumTokenUsage.total || 0) + (tokenUsage.total || 0),
      };

      const callCost = calculateAnthropicCost(
        this.modelName,
        this.config,
        (response as any).usage?.input_tokens,
        (response as any).usage?.output_tokens,
      );
      accumCost += callCost || 0;

      // Push assistant response to history for next iteration (if any)
      messages.push({ role: 'assistant', content: (response as any).content } as any);

      // Extract tool uses from this response
      const { toolUses } = this.extractToolUses(response);

      if (toolUses.length === 0 || depth >= maxDepth) {
        return {
          output: outputFromMessage(response, this.config.showThinking ?? true),
          tokenUsage: accumTokenUsage,
          cost: accumCost,
          metadata: {
            depth,
          },
        };
      }

      // Execute tools and append their results to history
      const toolResultMessages: any[] = [];
      for (const toolUse of toolUses) {
        const toolMessage = await this.executeToolCall(toolUse, toolCallbacks || {});
        toolResultMessages.push(toolMessage);
      }

      messages = [...messages, ...toolResultMessages];

      depth += 1;
    }

    // If loop exits without returning, it means we exceeded maxDepth with pending tool calls
    return {
      output: 'Reached maximum recursion depth without completing all tool calls.',
      tokenUsage: accumTokenUsage,
      cost: accumCost,
      metadata: {
        depth,
        reachedMaxDepth: true,
      },
    };
  }
}
