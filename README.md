# @flexpa/llm-fhir-eval

> [!NOTE]
> Follow the development progress on [FHIR Chat](https://chat.fhir.org/#narrow/channel/323443-Artificial-Intelligence.2FMachine-Learning-.28AI.2FML.29/topic/LLM.20FHIR.20Eval.20Preview/near/483998202).

## Overview

`@flexpa/llm-fhir-eval` is an evaluation framework designed to benchmark the performance of LLMs on FHIR-specific tasks including generation, validation, and extraction. This framework systematically tests and validates the capabilities of LLMs in handling various healthcare-interoperability related tasks, ensuring they meet the standards required for effective FHIR implementations. It implements evaluations from prior art such as [FHIR-GPT](https://ai.nejm.org/doi/10.1056/AIcs2300301).

## Benchmark

`@flexpa/llm-fhir-eval` benchmarks FHIR-specific tasks including:

1. **FHIR Resource Generation**:
   - Generate accurate FHIR resources such as `Patient`, `Observation`, `MedicationStatement`, etc.
   - Test the ability to create complex resource relationships and validate terminology bindings.

2. **FHIR Resource Validation**:
   - Validate FHIR resources using operations like `$validate`.
   - Check for schema compliance, required field presence, and value set binding verification.

3. **Data Extraction**:
   - Extract structured FHIR-compliant data from clinical notes and other unstructured data.
   - Evaluate the proficiency of LLMs in extracting specific healthcare data elements.

4. **Tool Use**:
   - Test models' ability to use FHIR validation tools and other healthcare-specific functions.
   - Validate proper tool calling for FHIR operations.

## Available Evaluations

1. **Data Extraction** (`evals/extraction/`)
   - Description: Comprehensive evaluation of extracting structured FHIR data from unstructured clinical text.
   - Configurations: Both minimalist and specialist approaches available.
   - Test categories: Basic demographics, conditions, explanations of benefit, medication requests, observations.

2. **FHIR Resource Generation** (`evals/generation/`)
   - Description: Tests the ability to generate valid FHIR resources and bundles.
   - Configurations: Zero-shot bundle generation and multi-turn tool use scenarios.
   - Models supported: GPT-3.5-turbo, GPT-4.1, O3 (low/high reasoning), Claude 3.5 Haiku, Claude 3.5 Sonnet, Claude Sonnet 4, Claude Opus 4

## Custom Assertions

The framework includes custom assertion functions:

- `fhirPathEquals.mjs`: Validates FHIR Path expressions
- `isBundle.mjs`: Checks if output is a valid FHIR Bundle
- `metaElementMissing.mjs`: Validates required metadata elements
- `validateOperation.mjs`: Validates FHIR operation results

## Tools

- `validateFhirBundle.mjs`: Tool for validating FHIR Bundle resources

## Custom Providers

- `AnthropicMessagesWithRecursiveToolCallsProvider.ts`: Enhanced Anthropic provider with recursive tool calling (up to 10 depth levels)
- `OpenAiResponsesWithRecursiveToolCallsProvider.ts`: Enhanced OpenAI provider with recursive tool calling

These providers enable multi-turn tool interactions where models can iteratively call validation tools to improve their FHIR resource generation.

## Commands to Run Evaluations

Install dependencies and set up environment variables:

```bash
yarn install
```

Copy the `.env.template` file to `.env` and supply your API keys for the models you plan to test.

Run an evaluation:

```bash
# Example: Run the extraction evaluation with minimalist config
promptfoo eval -c evals/extraction/config-minimalist.yaml

# Example: Run the FHIR bundle generation evaluation
promptfoo eval -c evals/generation/config-zero-shot-bundle.yaml

# Example: Run multi-turn tool use evaluation
promptfoo eval -c evals/generation/config-multi-turn-tool-use.js
```

The evaluation will print its performance metrics to the console and optionally save results to files.

