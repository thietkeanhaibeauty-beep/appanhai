// Currency helpers for budget formatting and conversion

// Exchange rates (cập nhật theo tỉ giá thực tế)
export const EXCHANGE_RATES: Record<string, number> = {
  VND: 25000,  // 1 USD = 25,000 VND
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149,
  KRW: 1320,
  THB: 35,
  SGD: 1.34,
  MYR: 4.47,
  PHP: 56,
  IDR: 15700,
  INR: 83,
  AUD: 1.52,
  CAD: 1.36,
};

/**
 * Calculate minimum budget based on currency (minimum $1 USD)
 */
export function getMinBudget(currency: string): number {
  const rate = EXCHANGE_RATES[currency] || 1;
  return Math.ceil(rate); // Min 1 USD equivalent
}

/**
 * Format number with thousands separator
 */
export function formatNumberWithSeparator(value: string | number): string {
  const numStr = value.toString().replace(/[^\d]/g, '');
  if (!numStr) return '';
  
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Parse formatted number string to number
 */
export function parseFormattedNumber(formattedValue: string): number {
  return parseInt(formattedValue.replace(/[^\d]/g, '')) || 0;
}

/**
 * Format currency for display with symbol
 */
export function formatCurrencyDisplay(amount: number, currency: string): string {
  const formatted = formatNumberWithSeparator(amount);
  
  const symbols: Record<string, string> = {
    VND: '₫',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    KRW: '₩',
    THB: '฿',
  };
  
  const symbol = symbols[currency] || currency;
  
  if (currency === 'VND' || currency === 'KRW' || currency === 'JPY') {
    return `${formatted} ${symbol}`;
  }
  
  return `${symbol}${formatted}`;
}

/**
 * Convert budget to Facebook API format
 * Some currencies don't have cents (VND, JPY, KRW, IDR) - don't multiply by 100
 */
export function convertBudgetForAPI(amount: number, currency: string): number {
  const noCentsCurrencies = ['VND', 'JPY', 'KRW', 'IDR', 'CLP', 'TWD'];
  
  if (noCentsCurrencies.includes(currency)) {
    return amount; // No conversion needed
  }
  
  return amount * 100; // Convert to cents for currencies like USD, EUR, etc.
}
