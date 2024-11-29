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

1. **FHIR Resource Validation**:

   - Validate FHIR resources using operations like `$validate`.
   - Check for schema compliance, required field presence, and value set binding verification.

1. **Summarization**:

   - Summarize clinical notes into FHIR-compliant resources.
   - Evaluate the proficiency of LLMs in generating concise and accurate summaries.

1. **FHIR Path Evaluation**:
   - Assess the ability of models to evaluate complex FHIR Path expressions.
   - Validate extraction accuracy and handle nested data structures.

## Configuration

The evaluation benchmark is configured using a YAML file. See `promptfooconfig.yaml` for an example.

## Evaluations

> [!IMPORTANT]
> The tests for each evaluation are placeholders in this preview release. They may require a separate process to execute or may have distribution restrictions.

1. **Structured FHIR Data Extraction** (extract-structured.yaml)

   - Description: Evaluates the ability to extract specific information from structured FHIR resources.
   - Tests: Includes demographic extraction, nested data extraction, and interpretation-based extraction.

1. **Unstructured Encounter Profile Extraction** (extract-unstructured-encounter-profile-first-experiment.yaml)

   - Description: Success at extracting US Core Encounter Profile from clinical notes.
   - Tests: Validates JSON output and checks for the presence of an Encounter FHIR resource.

1. **Unstructured Data Extraction** (extract-unstructured.yaml)

   - Description: Extracts structured FHIR-compliant data from clinical notes.
   - Tests: Ensures JSON output includes specific FHIR resources like Patient, Observation, and MedicationRequest.

1. **FHIR Path Evaluation** (fhir-path.yaml)

   - Description: Tests the ability to extract data using FHIR Path expressions.
   - Tests: Includes extraction from nested arrays, date manipulation, and boolean logic.

1. **Tool Use Validation** (tool-use-validator.yaml)
   - Description: Validates FHIR resources using tool functions.
   - Tests: Includes basic validation, terminology validation, and profile-based validation.

This preview release also includes an implementation of the [FHIR-GPT](https://github.com/flexpa/fhir-gpt) prompt as prior art:

1. **FHIR-GPT Prompt Evaluation** (fhir-gpt.yaml)

- Description: Focuses on extracting medication data, specifically the drug route, from narratives.
- Tests: Validates JSON output and checks for correct SNOMED code extraction.

## Commands to Run Evaluations

Assuming you have Bun installed, copy the `.env.template` file to `.env` and supply your OpenAI and Anthropic API keys.

Then, run the following command to execute an evaluation:

```bash
bun run eval -c evals/extract-unstructured.yaml
```

The evaluation will print its performance metrics to the console.

## Roadmap

The framework is continuously evolving, with ongoing efforts to expand its capabilities:

- **Model Comparison**: Expand model coverage to support HealthSage Llama fine-tune.
