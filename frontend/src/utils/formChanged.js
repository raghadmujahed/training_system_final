/**
 * Normalize a single form value for comparison.
 * Handles: null/undefined → "", number strings, booleans (0/1/"true"/"false"), trimmed strings.
 */
function normalizeValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value;
  const str = String(value).trim();
  // Coerce "true"/"false" strings
  if (str === "true") return true;
  if (str === "false") return false;
  // Coerce numeric strings that are purely numeric
  if (str !== "" && !isNaN(str) && str !== " ") return Number(str);
  return str;
}

/**
 * Compare two flat form objects and return true if any value has meaningfully changed.
 * Handles: strings, numbers, booleans, null/empty, arrays (sorted comparison).
 *
 * @param {object} original  - The data as loaded from the server.
 * @param {object} current   - The current form state.
 * @returns {boolean} true if at least one field changed, false if identical.
 */
export function hasFormChanged(original, current) {
  if (!original) return true; // no baseline → treat as changed

  const allKeys = new Set([...Object.keys(original), ...Object.keys(current)]);

  for (const key of allKeys) {
    const orig = normalizeValue(original[key]);
    const curr = normalizeValue(current[key]);

    // Both are arrays → compare sorted stringified
    if (Array.isArray(orig) || Array.isArray(curr)) {
      const o = Array.isArray(orig) ? [...orig].sort() : [];
      const c = Array.isArray(curr) ? [...curr].sort() : [];
      if (JSON.stringify(o) !== JSON.stringify(c)) return true;
      continue;
    }

    if (orig !== curr) return true;
  }

  return false;
}
