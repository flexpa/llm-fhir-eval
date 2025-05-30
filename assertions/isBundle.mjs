export default (output, _context) => {
  try {
    const result = JSON.parse(output);
    return result.resourceType === 'Bundle';
  } catch {
    return false;
  }
};
