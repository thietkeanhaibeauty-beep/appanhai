// Error handling utilities

import type { FacebookAPIError } from "@/types";

/**
 * Parse Facebook API error response
 */
export function parseFacebookError(error: any): string {
  if (!error) return 'Unknown error occurred';
  
  // Handle Facebook API error format
  if (error.error) {
    const fbError = error.error as FacebookAPIError;
    
    // Specific error code handling
    switch (fbError.code) {
      case 190:
        return 'Access token is invalid or expired. Please re-authenticate.';
      case 100:
        return 'Invalid parameter provided. Please check your input.';
      case 200:
        return 'Permission denied. Please check your access token permissions.';
      case 613:
        return 'Rate limit exceeded. Please try again later.';
      default:
        return fbError.message || 'Facebook API error occurred';
    }
  }
  
  // Handle standard Error object
  if (error instanceof Error) {
    return error.message;
  }
  
  // Handle string error
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Log error to console with context
 */
export function logError(context: string, error: any) {
  console.error(`[${context}]`, error);
  
  // In production, you might want to send to error tracking service
  // e.g., Sentry, LogRocket, etc.
}

/**
 * Check if error is network-related
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message || String(error);
  const networkKeywords = ['network', 'fetch', 'timeout', 'connection', 'offline'];
  
  return networkKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
}

/**
 * Check if error is authentication-related
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;
  
  // Check Facebook error code
  if (error.error?.code === 190 || error.error?.code === 200) {
    return true;
  }
  
  const message = error.message || String(error);
  const authKeywords = ['token', 'auth', 'permission', 'access', 'unauthorized'];
  
  return authKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on auth errors
      if (isAuthError(error)) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Create a user-friendly error message
 */
export function getUserFriendlyError(error: any): string {
  const errorMessage = parseFacebookError(error);
  
  // Map technical errors to user-friendly messages
  const friendlyMessages: Record<string, string> = {
    'Access token is invalid': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    'Permission denied': 'Bạn không có quyền thực hiện thao tác này.',
    'Rate limit exceeded': 'Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.',
    'Invalid parameter': 'Thông tin không hợp lệ. Vui lòng kiểm tra lại.',
    'network': 'Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.',
    'Column alias': 'Lỗi cấu trúc dữ liệu. Vui lòng liên hệ admin.',
    'NocoDB API error: 422': 'Lỗi truy vấn dữ liệu. Vui lòng thử lại.',
  };
  
  for (const [key, message] of Object.entries(friendlyMessages)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }
  
  return 'Đã xảy ra lỗi. Vui lòng thử lại sau.';
}
