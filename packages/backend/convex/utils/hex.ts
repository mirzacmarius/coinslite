/** Bytes as lowercase hex, two digits each: for tokens, hashes and signatures. */
export const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
