/**
 * Safely appends an image field to a FormData object.
 *
 * Rules:
 * - File object (or file-like: has .name property) → append as binary file
 * - null → append empty string (signals server to remove the image)
 * - non-empty string (existing URL) → append as string
 * - undefined / empty string (no change) → skip (do not append)
 *
 * @param {FormData} formData  - The FormData instance to append to
 * @param {string}   fieldName - The multipart field name
 * @param {File|string|null|undefined} value - The current image value from state
 * @param {boolean}  [appendExistingUrl=false] - Whether to append existing URLs (default: skip)
 */
export const appendImageField = (formData, fieldName, value, appendExistingUrl = false) => {
  if (value && typeof value === 'object' && value.name) {
    // File or File-like object — append as binary
    formData.append(fieldName, value);
  } else if (value === null) {
    // Explicit null means "remove this image"
    formData.append(fieldName, '');
  } else if (typeof value === 'string' && value.trim() !== '') {
    // Existing URL — only append if requested (for re-save without changing image)
    if (appendExistingUrl) {
      formData.append(fieldName, value);
    }
    // If appendExistingUrl=false (default), skip — server keeps the existing value
  }
  // undefined / empty string → do nothing
};
