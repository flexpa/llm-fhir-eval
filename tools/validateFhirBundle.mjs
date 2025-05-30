import { validate } from '../assertions/validateOperation.mjs';

export default async function validateFhirBundle(bundle) {
  const response = await validate(JSON.stringify(JSON.parse(bundle).bundle));
  if (response.length > 0) {
    return JSON.stringify(response);
  }
  return `No errors found. Here is the bundle: ${JSON.stringify(JSON.parse(bundle).bundle)}`;
}
