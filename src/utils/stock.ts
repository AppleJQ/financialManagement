/**
 * Convert a 6-digit stock code to East Money secid format.
 * 6开头 -> 上交所 (1.xxx), 0/3开头 -> 深交所 (0.xxx)
 */
export function getSecid(code: string): string {
  if (code.startsWith('6')) {
    return `1.${code}`
  }
  return `0.${code}`
}

/** Validate a stock code is 6 digits. */
export function isValidCode(code: string): boolean {
  return /^\d{6}$/.test(code)
}

/** Format large amounts to readable string, e.g. 1234567890 -> "12.35亿" */
export function formatAmount(value: number): string {
  if (Math.abs(value) >= 1e8) {
    return (value / 1e8).toFixed(2) + '亿'
  }
  if (Math.abs(value) >= 1e4) {
    return (value / 1e4).toFixed(2) + '万'
  }
  return value.toFixed(2)
}

/** Format percentage with sign, e.g. 2.32 -> "+2.32%" */
export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

/** Return CSS class based on positive/negative value */
export function priceColor(value: number): string {
  if (value > 0) return 'text-red-500'
  if (value < 0) return 'text-green-500'
  return 'text-gray-400'
}
