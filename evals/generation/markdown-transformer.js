module.exports = (output, _context) => {
  // If the output contains a fenced JSON code block, extract and return the JSON inside the fence.
  if (typeof output === 'string') {
    // Look for ```json ... ``` first
    const jsonFenceMatch = output.match(/```json\s*([\s\S]*?)```/i);
    if (jsonFenceMatch && jsonFenceMatch[1]) {
      return jsonFenceMatch[1].trim();
    }

    const alternateFenchMatch = output.match(/```\s*([\s\S]*?)```/i);
    if (alternateFenchMatch && alternateFenchMatch[1]) {
      return alternateFenchMatch[1].trim();
    }
  }

  // Default: return the original output untouched.
  return output;
};
