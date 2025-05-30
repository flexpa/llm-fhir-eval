import { randomUUID } from 'crypto';

// Validate a FHIR resource using the local validator and return error issues or true if none found
export async function validate(modelResponse) {
  const response = await fetch('http://localhost:8082/validate', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cliContext: {
        sv: '4.0.1',
        ig: ['hl7.fhir.us.core#4.0.0'],
        locale: 'en',
      },
      filesToValidate: [
        {
          fileName: 'manually_entered_file.json',
          fileContent: modelResponse,
          fileType: 'json',
        },
      ],
      sessionId: randomUUID(),
    }),
  });
  const data = await response.json();

  const errorIssues = data.outcomes.flatMap((outcome) => outcome.issues).filter((issue) => issue.level === 'ERROR');

  return errorIssues;
}

export default async function evaluate(modelResponse) {
  const response = await validate(modelResponse);

  return response.length === 0 ? true : response;
}
