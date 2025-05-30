# @flexpa/llm-fhir-eval

> [!IMPORTANT]
> This is an early preview release. All evaluations are experimental.
> Follow the development progress on [FHIR Chat](https://chat.fhir.org/#narrow/channel/323443-Artificial-Intelligence.2FMachine-Learning-.28AI.2FML.29/topic/LLM.20FHIR.20Eval.20Preview/near/483998202).

## Overview

`@flexpa/llm-fhir-eval` is a preview of an evaluation framework designed to benchmark the performance of LLMs on FHIR-specific tasks including generation, validation, and extraction. This framework aims to systematically test and validate the capabilities of LLMs in handling various healthcare-interoperability related tasks, ensuring they meet the standards required for effective FHIR implementations. It implements evaluations from prior art such as [FHIR-GPT](https://ai.nejm.org/doi/10.1056/AIcs2300301). We are seeking feedback on the benchmark and its evaluations.

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

1. **Card Scanning** (`evals/card-scanning/`)
   - Description: Evaluates the ability to extract structured data from insurance card images or scans.

2. **CARIN Digital Insurance Cards** (`evals/carin-digital-insurance-cards/`)
   - Description: Tests extraction of standardized insurance card data following CARIN specifications.
   - Provider-specific prompts available for Google and OpenAI models.

3. **Data Extraction** (`evals/extraction/`)
   - Description: Comprehensive evaluation of extracting structured FHIR data from unstructured clinical text.
   - Configurations: Both minimalist and specialist approaches available.
   - Test categories: Basic demographics, conditions, explanations of benefit, medication requests, observations.

4. **FHIR Resource Generation** (`evals/generation/`)
   - Description: Tests the ability to generate valid FHIR resources and bundles.
   - Configurations: Zero-shot bundle generation and multi-turn tool use scenarios.

5. **Model Evaluation** (`evals/evaluation/`)
   - Description: Meta-evaluation framework for assessing model performance on FHIR tasks.

6. **Tool Use** (`evals/tool-use/`)
   - Description: Validates FHIR resources using tool functions and proper tool calling patterns.

## Custom Assertions

The framework includes custom assertion functions:

- `fhirPathEquals.mjs`: Validates FHIR Path expressions
- `isBundle.mjs`: Checks if output is a valid FHIR Bundle
- `metaElementMissing.mjs`: Validates required metadata elements
- `validateOperation.mjs`: Validates FHIR operation results

## Tools

- `validateFhirBundle.mjs`: Tool for validating FHIR Bundle resources

## Custom Providers

- `AnthropicMessagesWithRecursiveToolCallsProvider.ts`: Enhanced Anthropic provider with recursive tool calling
- `OpenAiResponsesWithRecursiveToolCallsProvider.ts`: Enhanced OpenAI provider with recursive tool calling

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

# Example: Run the CARIN digital insurance cards evaluation
promptfoo eval -c evals/carin-digital-insurance-cards/config.yaml

# Example: Run tool use evaluation
promptfoo eval -c evals/tool-use/config.yaml
```

The evaluation will print its performance metrics to the console and optionally save results to files.

## Roadmap

The framework is continuously evolving, with ongoing efforts to expand its capabilities:

- **Model Comparison**: Expand model coverage to support additional healthcare-specific fine-tuned models
- **Evaluation Coverage**: Add more comprehensive FHIR operation testing
- **Real-world Data**: Incorporate more diverse healthcare scenarios and edge cases
