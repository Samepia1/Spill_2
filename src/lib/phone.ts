/**
 * Normalize a phone number to E.164 format (+1XXXXXXXXXX).
 * Accepts: 10-digit (5551234567), 11-digit starting with 1 (15551234567),
 * or already formatted with parens/dashes/spaces.
 * Returns null if invalid.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/**
 * Format E.164 phone for display: "+15551234567" → "(555) 123-4567"
 */
export function formatPhoneDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, "").slice(-10);
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Extract last 4 digits from an E.164 phone number.
 */
export function lastFour(e164: string): string {
  return e164.slice(-4);
}
