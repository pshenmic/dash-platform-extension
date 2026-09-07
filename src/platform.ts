/**
 * Cross-browser WebExtension namespace.
 *
 * Firefox exposes the promise-based API as `browser` and keeps `chrome` as a
 * callback-style alias, so `await chrome.storage.local.get()` silently resolves
 * to `undefined` there. Chrome MV3 only has `chrome`, and it is promise-based.
 * Preferring `browser` gives promises on both without pulling in a polyfill.
 */
export const ext: typeof chrome = (globalThis as any).browser ?? globalThis.chrome
