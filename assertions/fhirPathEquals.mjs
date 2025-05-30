import { evalFhirPath } from '@medplum/core';

export default (output, context) => {
  try {
    const result = JSON.parse(output);
    const fhirPath = context.fhirpath;
    const evalResults = evalFhirPath(fhirPath, result);
    return evalResults.length > 0;
  } catch {
    return false;
  }
};
