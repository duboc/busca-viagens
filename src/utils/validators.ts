export function isValidIATA(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

export function isValidDate(dateStr: string): boolean {
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

export function isValidApiKey(key: string): boolean {
  return key.length >= 20;
}

export function isValidPrice(price: number): boolean {
  return price > 0 && price < 1_000_000;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
