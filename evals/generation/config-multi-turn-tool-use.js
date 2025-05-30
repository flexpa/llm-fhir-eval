import validateFhirBundle from '../../tools/validateFhirBundle.mjs';

const openAItools = {
  tools: [
    {
      type: 'function',
      name: 'validate_fhir_bundle',
      description:
        'Validate a FHIR bundle - you should use this tool recursively to fix errors, using it again after you have called it to ensure that FHIR resources are fully valid after making changes',
      parameters: {
        type: 'object',
        properties: {
          bundle: {
            type: 'object',
            description: 'The FHIR bundle to validate',
          },
        },
        required: ['bundle'],
      },
    },
  ],
  functionToolCallbacks: {
    validate_fhir_bundle: validateFhirBundle,
  },
};

const anthropicTools = {
  tools: [
    {
      name: 'validate_fhir_bundle',
      description:
        'Validate a FHIR bundle - you should use this tool recursively to fix errors, using it again after you have called it to ensure that FHIR resources are fully valid after making changes',
      input_schema: {
        type: 'object',
        properties: {
          bundle: {
            type: 'object',
            description: 'The FHIR bundle to validate',
          },
        },
        required: ['bundle'],
      },
    },
  ],
  functionToolCallbacks: {
    validate_fhir_bundle: validateFhirBundle,
  },
};

const anthropicModel = {
  id: 'file://../../providers/AnthropicMessagesWithRecursiveToolCallsProvider.ts',
  transform: 'file://./markdown-transformer.js',
};

const anthropicModelConfig = {
  max_tokens: 8092,
  // tool_choice: 'auto',
  max_tool_calls: 10,
  ...anthropicTools,
};

const openAIModel = {
  id: 'file://../../providers/OpenAiResponsesWithRecursiveToolCallsProvider.ts',
  transform: 'file://./markdown-transformer.js',
};

const openAIModelConfig = {
  max_output_tokens: 16184,
  tool_choice: 'auto',
  max_tool_calls: 10,
  ...openAItools,
};

/** @type {import('promptfoo').TestSuiteConfig} */
const config = {
  description: 'FHIR Bundle Generation (Multi Turn Tool Use)',

  providers: [
    {
      ...openAIModel,
      config: {
        ...openAIModelConfig,
        model: 'gpt-3.5-turbo',
      },
      label: 'openai-gpt-3.5-turbo',
    },
    {
      ...openAIModel,
      config: {
        ...openAIModelConfig,
        model: 'gpt-4.1',
      },
      label: 'openai-gpt-4.1',
    },
    {
      ...openAIModel,
      config: {
        ...openAIModelConfig,
        model: 'o3',
        reasoning_effort: 'low',
      },
      label: 'openai-o3-low',
    },
    {
      ...openAIModel,
      config: {
        ...openAIModelConfig,
        model: 'o3',
        reasoning_effort: 'high',
      },
      label: 'openai-o3-high',
    },
    {
      ...anthropicModel,
      config: {
        ...anthropicModelConfig,
        model: 'claude-3-5-haiku-20241022',
      },
      label: 'anthropic-claude-3-5-haiku-20241022',
    },
    {
      ...anthropicModel,
      config: {
        ...anthropicModelConfig,
        model: 'claude-3-5-sonnet-20241022',
      },
      label: 'anthropic-claude-3-5-sonnet-202410224',
    },
    {
      ...anthropicModel,
      config: {
        ...anthropicModelConfig,
        model: 'claude-sonnet-4-20250514',
      },
      label: 'anthropic-claude-sonnet-4-20250514',
    },
    {
      ...anthropicModel,
      config: {
        ...anthropicModelConfig,
        model: 'claude-opus-4-20250514',
      },
      label: 'anthropic-claude-opus-4-20250514',
    },
  ],

  prompts: [
    {
      label: 'Unstructured Note to FHIR',
      raw: `You are a health informaticist expert in FHIR. 
You will receive unstructured notes and you need to structure them into FHIR resources.
You must only include data that is present in the note.
You must only return a valid FHIR JSON Bundle, with the appropriate resources, with no additional explanation.
You may include multiple resources in the bundle.
You must follow the FHIR R4 specification.
You mut not include a meta element in the resources.
When generating a CodeableConcept, you must include a coding element with a system, code, and display.
When generating a CodeableConcept, you must use a display matching what is expected by the CodeSystem.
Each entry in a Bundle must have a fullUrl which is the identity of the resource in the entry.
The id of a resource must be a valid UUID in lowercase.

You have access to a validator tool that will validate the FHIR bundle.
You should use this tool recursively to fix errors, using it again after you have called it to ensure that FHIR resources are fully valid after making changes.

Include the FHIR JSON bundle in your final response.
<note>
{{note}}
</note>`,
    },
  ],

  defaultTest: {
    assert: [
      { type: 'is-json' },
      { type: 'javascript', value: 'file://../../assertions/isBundle.mjs' },
      { type: 'javascript', value: 'file://../../assertions/metaElementMissing.mjs' },
      { type: 'javascript', value: 'file://../../assertions/validateOperation.mjs' },
    ],
  },

  tests: ['file://tests.yaml'],
};

export default config;
