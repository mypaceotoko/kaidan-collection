/**
 * loader.js
 * Utility for fetching JSON scenario files.
 * Throws an Error with a descriptive message on failure.
 */

/**
 * Fetch and parse a JSON file.
 * @param {string} path  URL or relative path
 * @returns {Promise<unknown>}
 */
export async function loadJSON(path) {
  let response;
  try {
    response = await fetch(path);
  } catch (networkErr) {
    throw new Error(`[Loader] Network error fetching "${path}": ${networkErr.message}`);
  }

  if (!response.ok) {
    throw new Error(`[Loader] HTTP ${response.status} for "${path}"`);
  }

  return response.json();
}
