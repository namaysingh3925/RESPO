import { randomInt } from "node:crypto";

/** Crockford base-32 without look-alike letters (no I, L, O or U). */
export const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE_PREFIX = "EH-";
const CODE_LENGTH = 6;
const CODE_PATTERN = /^EH-[0-9A-HJKMNP-TV-Z]{6}$/;

/** A cryptographically random public reference such as "EH-7K3Q9P". */
export function generatePublicCode(): string {
  let suffix = "";
  for (let i = 0; i < CODE_LENGTH; i++) suffix += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `${CODE_PREFIX}${suffix}`;
}

/**
 * Normalises a user-typed code: case-insensitive, tolerant of spaces and a missing dash, and
 * Crockford look-alikes (O to 0, I/L to 1). Returns null when the input can't be a valid code.
 */
export function normalizePublicCode(input: string): string | null {
  const compact = input.trim().toUpperCase().replace(/\s+/g, "");
  const body = compact.startsWith(CODE_PREFIX)
    ? compact.slice(CODE_PREFIX.length)
    : compact.startsWith("EH")
      ? compact.slice(2)
      : compact;
  const suffix = body.replace(/O/g, "0").replace(/[IL]/g, "1");
  const code = `${CODE_PREFIX}${suffix}`;
  return CODE_PATTERN.test(code) ? code : null;
}

/** Draws codes until `isTaken` reports a free one. With 32^6 codes, a retry is vanishingly rare. */
export async function generateUniqueCode(
  isTaken: (code: string) => Promise<boolean>,
  maxAttempts = 8,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generatePublicCode();
    if (!(await isTaken(code))) return code;
  }
  throw new Error("Could not generate a unique public code");
}
