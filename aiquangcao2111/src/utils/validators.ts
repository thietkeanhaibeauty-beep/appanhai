// Validation utilities

/**
 * Validate Facebook access token format
 */
export function isValidAccessToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  // Basic validation - should be a long string
  return token.length > 50 && !token.includes(' ');
}

/**
 * Validate Facebook post URL
 */
export function isValidPostUrl(url: string): boolean {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('facebook.com');
  } catch {
    return false;
  }
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Vietnamese phone number
 */
export function isValidVietnamesePhone(phone: string): boolean {
  // Remove all spaces and special characters
  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Vietnamese phone patterns:
  // Mobile: 09x, 08x, 07x, 05x, 03x (10 digits)
  // With country code: +84 or 84
  const patterns = [
    /^(0[3|5|7|8|9])\d{8}$/,           // 10 digits starting with 03, 05, 07, 08, 09
    /^\+84[3|5|7|8|9]\d{8}$/,          // +84 followed by 9 digits
    /^84[3|5|7|8|9]\d{8}$/,            // 84 followed by 9 digits
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
}

/**
 * Validate budget amount
 */
export function isValidBudget(amount: number, currency: string = 'VND'): boolean {
  if (amount <= 0) return false;
  
  // Minimum daily budget for VND is 40,000
  if (currency === 'VND') {
    return amount >= 40000;
  }
  
  // For other currencies, minimum is $1
  return amount >= 1;
}

/**
 * Validate campaign name
 */
export function isValidCampaignName(name: string): boolean {
  return name.trim().length > 0 && name.length <= 200;
}

/**
 * Validate age range for targeting
 */
export function isValidAgeRange(min: number, max: number): boolean {
  return min >= 18 && max <= 65 && min <= max;
}

/**
 * Validate date range
 */
export function isValidDateRange(startDate: Date, endDate?: Date): boolean {
  const now = new Date();
  
  // Start date must be in the future or today
  if (startDate < now) {
    return false;
  }
  
  // If end date is provided, it must be after start date
  if (endDate && endDate <= startDate) {
    return false;
  }
  
  return true;
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'VND'): string {
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
