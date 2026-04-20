const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function randomAlphanumeric(n: number): string {
  let result = '';
  for (let i = 0; i < n; i++) {
    result += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)];
  }
  return result;
}

export function randomDigits(n: number): string {
  let result = '';
  for (let i = 0; i < n; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

export function dateCompact(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}
