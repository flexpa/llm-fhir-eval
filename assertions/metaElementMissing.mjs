export default (output, _context) => {
  try {
    const result = JSON.parse(output);
    if (!result || typeof result !== 'object') {
      return false;
    }

    // Bundle itself should not include a meta element.
    if (result.meta !== undefined) {
      return false;
    }

    if (!Array.isArray(result.entry)) {
      return false;
    }

    // Each resource must either:
    // 1. Have no meta element, OR
    // 2. Have a meta element whose only property is `profile`.
    const resourceMetaIsValid = (meta) => {
      if (meta === undefined) return true;
      // meta must be an object with exactly one key: "profile"
      return typeof meta === 'object' && meta !== null && Object.keys(meta).length === 1 && 'profile' in meta;
    };

    return result.entry.every((e) => resourceMetaIsValid(e.resource?.meta));
  } catch {
    return false;
  }
};
