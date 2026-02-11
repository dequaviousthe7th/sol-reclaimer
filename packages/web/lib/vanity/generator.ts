const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58_SET = new Set(BASE58_ALPHABET.split(""));

const CASE_INSENSITIVE_REGEX = /^[1-9A-Za-z]+$/;

function validatePattern(
  pattern: string,
  label: "Prefix" | "Suffix",
  caseSensitive: boolean,
): void {
  if (!pattern || pattern.length === 0) {
    throw new Error(`${label} must be non-empty.`);
  }

  if (caseSensitive) {
    for (const char of pattern) {
      if (!BASE58_SET.has(char)) {
        throw new Error(
          `Invalid character "${char}" in ${label.toLowerCase()}. Base58 excludes 0, O, I, and l.`,
        );
      }
    }
    return;
  }

  if (!CASE_INSENSITIVE_REGEX.test(pattern)) {
    throw new Error(
      `Invalid ${label.toLowerCase()}. Use only letters A-Z or a-z and digits 1-9 for case-insensitive matching.`,
    );
  }
}

export function validatePrefix(prefix: string, caseSensitive: boolean): void {
  validatePattern(prefix, "Prefix", caseSensitive);
}

export function validateSuffix(suffix: string, caseSensitive: boolean): void {
  validatePattern(suffix, "Suffix", caseSensitive);
}

export function normalizePattern(
  pattern: string,
  caseSensitive: boolean,
): string {
  return caseSensitive ? pattern : pattern.toLowerCase();
}

export function matchesPrefixSuffix(
  address: string,
  prefix: string | undefined,
  suffix: string | undefined,
  caseSensitive: boolean,
): boolean {
  if (caseSensitive) {
    if (prefix && !address.startsWith(prefix)) {
      return false;
    }
    if (suffix && !address.endsWith(suffix)) {
      return false;
    }
    return true;
  }

  const normalized = address.toLowerCase();
  if (prefix && !normalized.startsWith(prefix)) {
    return false;
  }
  if (suffix && !normalized.endsWith(suffix)) {
    return false;
  }
  return true;
}
