export function usd(n: number | null | undefined, compact = true): string {
  if (n === null || n === undefined || Number.isNaN(n)) return 'n/a';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(n);
}

export function num(n: number | null | undefined, compact = true): string {
  if (n === null || n === undefined || Number.isNaN(n)) return 'n/a';
  return new Intl.NumberFormat('en-US', { notation: compact ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n);
}

export function pct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return 'n/a';
  return `${(n * 100).toFixed(digits)}%`;
}

export function shortDate(s: string | null | undefined): string {
  if (!s) return 'n/a';
  const d = new Date(s.length <= 10 ? `${s}T00:00:00Z` : s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function weekLabel(s: string): string {
  const d = new Date(s.length <= 10 ? `${s}T00:00:00Z` : s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  return Number.NaN;
}

export function toBool(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}
