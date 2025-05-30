/* eslint-disable @typescript-eslint/no-explicit-any */
import promptfoo from 'promptfoo';
import { OpenAiResponsesProvider } from 'promptfoo/dist/src/providers/openai/responses';
import { getTokenUsage, calculateOpenAICost, formatOpenAiError } from 'promptfoo/dist/src/providers/openai/util';
import logger from 'promptfoo/dist/src/logger';
import type { CallApiContextParams, CallApiOptionsParams, ProviderResponse, EnvOverrides } from 'promptfoo';
import type { OpenAiCompletionOptions } from 'promptfoo/dist/src/providers/openai/types';

const fetchWithCache = promptfoo.cache.fetchWithCache;

const REQUEST_TIMEOUT_MS = 1200000; // 30 seconds

type ApiResponse = {
  data: any;
  cached: boolean;
  status: number;
  statusText: string;
};

type FunctionCall = {
  call_id: string;
  name: string;
  input?: any;
  arguments?: any;
};

type OpenAiResponsesWithRecursiveToolCallsProviderOptions = OpenAiCompletionOptions & {
  model: string;
};

/**
 * Extended version of OpenAI responses provider that recursively handles function calls
 * until no more functions need to be called or max depth is reached.
 */
export default class OpenAiResponsesWithRecursiveToolCallsProvider extends OpenAiResponsesProvider {
  constructor(
    options: { config?: OpenAiResponsesWithRecursiveToolCallsProviderOptions; id?: string; env?: EnvOverrides } = {},
  ) {
    super(options.config?.model || 'o3', options);
  }

  private async makeApiCall(body: any, config: any): Promise<ApiResponse> {
    return await fetchWithCache(
      `${this.getApiUrl()}/responses`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getApiKey()}`,
          ...(this.getOrganization() ? { 'OpenAI-Organization': this.getOrganization() } : {}),
          ...config.headers,
        },
        body: JSON.stringify(body),
      },
      REQUEST_TIMEOUT_MS,
    );
  }

  private extractFunctionCalls(output: any[]): {
    functionCalls: FunctionCall[];
    result: string;
    refusal: string | null;
  } {
    let result = '';
    let refusal = null;
    const functionCalls: FunctionCall[] = [];

    for (const item of output) {
      if (item.type === 'function_call') {
        functionCalls.push(item);
        result = JSON.stringify(item);
      } else if (item.type === 'message' && item.role === 'assistant') {
        if (item.content) {
          for (const contentItem of item.content) {
            if (contentItem.type === 'output_text') {
              result += contentItem.text;
            } else if (contentItem.type === 'tool_use' || contentItem.type === 'function_call') {
              functionCalls.push(contentItem);
              result = JSON.stringify(contentItem);
            } else if (contentItem.type === 'refusal') {
              refusal = contentItem.refusal;
            }
          }
        } else if (item.refusal) {
          refusal = item.refusal;
        }
      } else if (item.type === 'tool_result') {
        result = JSON.stringify(item);
      }
    }

    return { functionCalls, result, refusal };
  }

  private async executeFunctionCall(
    functionCall: FunctionCall,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    callbacks: Record<string, Function>,
  ): Promise<{ type: string; call_id: string; output: any }> {
    const functionName = functionCall.name;
    const functionArgs = functionCall.input || functionCall.arguments;

    try {
      const functionResult = await callbacks[functionName](
        typeof functionArgs === 'string' ? functionArgs : JSON.stringify(functionArgs),
      );

      return {
        type: 'function_call_output',
        call_id: functionCall.call_id,
        output: functionResult,
      };
    } catch (error) {
      logger.error(`Error executing function ${functionName}: ${error}`);
      return {
        type: 'function_call_output',
        call_id: functionCall.call_id,
        output: `error: ${error}`,
      };
    }
  }

  private async processResponse(
    initialBody: any,
    response: ApiResponse,
    config: any,
    depth: number = 0,
    maxDepth: number = 10,
    accumTokenUsage: { prompt: number; completion: number; total: number } = { prompt: 0, completion: 0, total: 0 },
    accumCost: number = 0,
  ): Promise<ProviderResponse> {
    const { data, cached } = response;

    if (data.error) {
      await data.deleteFromCache?.();
      return { error: formatOpenAiError(data) };
    }

    const { functionCalls, result, refusal } = this.extractFunctionCalls(data.output || []);

    // Handle refusal
    const currentTokenUsage = getTokenUsage(data, cached);
    const currentCost = calculateOpenAICost(
      this.modelName,
      config,
      data.usage?.input_tokens,
      data.usage?.output_tokens,
      0,
      0,
    );
    const totalTokenUsage = {
      prompt: (accumTokenUsage.prompt || 0) + (currentTokenUsage.prompt || 0),
      completion: (accumTokenUsage.completion || 0) + (currentTokenUsage.completion || 0),
      total: (accumTokenUsage.total || 0) + (currentTokenUsage.total || 0),
    };
    const totalCost = (accumCost || 0) + (currentCost || 0);

    if (refusal) {
      return {
        output: refusal,
        tokenUsage: totalTokenUsage,
        isRefusal: true,
        cached,
        cost: totalCost,
        raw: data,
        metadata: {
          depth,
        },
      };
    }

    // If no function calls or reached max depth, return current result
    if (functionCalls.length === 0 || depth >= maxDepth) {
      return {
        output: result,
        tokenUsage: totalTokenUsage,
        cached,
        cost: totalCost,
        raw: data,
        metadata: {
          depth,
        },
      };
    }

    // Execute functions and update conversation history
    if (config.functionToolCallbacks) {
      const newHistory = [];

      // Execute functions and add results to history
      for (const functionCall of functionCalls) {
        if (config.functionToolCallbacks[functionCall.name]) {
          const result = await this.executeFunctionCall(functionCall, config.functionToolCallbacks);
          newHistory.push(result);
        }
      }

      // Make next recursive call
      const nextBody = {
        ...initialBody,
        input: newHistory,
        previous_response_id: response.data.id,
      };

      try {
        const nextResponse = await this.makeApiCall(nextBody, config);

        if (nextResponse.status < 200 || nextResponse.status >= 300) {
          logger.info(`API ERROR: ${JSON.stringify(nextResponse.data)}`);
          return {
            error: `API error: ${nextResponse.status} ${nextResponse.statusText}`,
            output: result,
            tokenUsage: totalTokenUsage,
            cached: false,
            cost: totalCost,
            raw: data,
            metadata: {
              depth,
            },
          };
        }

        // Process next response recursively
        const nextResult = await this.processResponse(
          nextBody,
          nextResponse,
          config,
          depth + 1,
          maxDepth,
          totalTokenUsage,
          totalCost,
        );

        return {
          ...nextResult,
          cached: false,
        };
      } catch (err) {
        logger.error(`API call error in recursive call: ${err}`);
        return {
          error: `API call error in recursive call: ${err}`,
          output: result,
          tokenUsage: totalTokenUsage,
          cached: false,
          cost: totalCost,
          raw: data,
          metadata: {
            depth,
          },
        };
      }
    }

    // If no callbacks configured, return current result
    return {
      output: result,
      tokenUsage: totalTokenUsage,
      cached,
      cost: totalCost,
      raw: data,
      metadata: {
        depth,
      },
    };
  }

  async callApi(
    prompt: string,
    context?: CallApiContextParams,
    callApiOptions?: CallApiOptionsParams,
  ): Promise<ProviderResponse> {
    if (!this.getApiKey()) {
      throw new Error(
        'OpenAI API key is not set. Set the OPENAI_API_KEY environment variable or add `apiKey` to the provider config.',
      );
    }

    const { body: initialBody, config } = this.getOpenAiBody(prompt, context, callApiOptions);
    logger.debug(`Calling OpenAI Responses API: ${JSON.stringify(initialBody)}`);

    try {
      const initialResponse = await this.makeApiCall(initialBody, config);

      if (initialResponse.status < 200 || initialResponse.status >= 300) {
        return {
          error: `API error: ${initialResponse.status} ${initialResponse.statusText}\n${
            typeof initialResponse.data === 'string' ? initialResponse.data : JSON.stringify(initialResponse.data)
          }`,
        };
      }

      // Start recursive processing
      return await this.processResponse(initialBody, initialResponse, config);
    } catch (err) {
      logger.error(`Initial API call error: ${err}`);
      return {
        error: `Initial API call error: ${err}`,
      };
    }
  }
}
