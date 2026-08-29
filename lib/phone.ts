/** Normalize a US-first mobile number to E.164. Returns null if unusable. */
export function parsePhoneToE164(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

export function formatPhoneDisplay(e164: string | null | undefined) {
  if (!e164) return "";
  if (e164.startsWith("+1") && e164.length === 12) {
    const digits = e164.slice(2);
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return e164;
}

export function maskPhone(e164: string | null | undefined) {
  if (!e164) return "";
  return `•••${e164.slice(-4)}`;
}
