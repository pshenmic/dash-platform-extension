/**
 * Kept out of `src/utils/index.ts` on purpose.
 *
 * That barrel calls `PrivateKeyWASM.fromBytes()`, so importing anything from it
 * drags the 7.5MB WASM module into whichever chunk the importer lands in. The
 * popup needs this helper for message ids and nothing else, so it lives here
 * where it costs nothing to import.
 */
export const generateRandomHex = (size: number): string =>
  [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
