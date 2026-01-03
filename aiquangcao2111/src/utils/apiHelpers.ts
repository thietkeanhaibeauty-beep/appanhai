// API Helper utilities for consistent error handling and retry logic

import { retryWithBackoff, parseFacebookError, isAuthError } from './errorHandling';
import type { ServiceResponse } from '@/services/types';

/**
 * Wrapper for API calls with automatic retry logic
 * @param fn - Async function to call
 * @param options - Retry options
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    baseDelay?: number;
    onRetry?: (attempt: number, error: any) => void;
  }
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, onRetry } = options || {};

  return await retryWithBackoff(
    async () => {
      try {
        return await fn();
      } catch (error) {
        // Don't retry auth errors
        if (isAuthError(error)) {
          throw error;
        }
        throw error;
      }
    },
    maxRetries,
    baseDelay
  );
}

/**
 * Wrapper for service calls with consistent error handling
 * @param fn - Async service function
 */
export async function callService<T>(
  fn: () => Promise<T>
): Promise<ServiceResponse<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: {
        message: parseFacebookError(error),
        details: error,
      },
    };
  }
}

/**
 * Wrapper combining retry logic and error handling
 * @param fn - Async service function
 * @param options - Retry options
 */
export async function callServiceWithRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    baseDelay?: number;
  }
): Promise<ServiceResponse<T>> {
  try {
    const data = await withRetry(fn, options);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: {
        message: parseFacebookError(error),
        details: error,
      },
    };
  }
}

/**
 * Create a rate-limited queue for API calls
 */
export class APIQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private delayMs: number;

  constructor(delayMs: number = 100) {
    this.delayMs = delayMs;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.process();
      }
    });
  }

  private async process() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const fn = this.queue.shift();

    if (fn) {
      await fn();
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      this.process();
    }
  }

  clear() {
    this.queue = [];
    this.processing = false;
  }

  get length() {
    return this.queue.length;
  }
}

/**
 * Upload progress tracker
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload file with progress tracking using XMLHttpRequest
 */
export function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress?: (progress: UploadProgress) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          });
        }
      });
    }

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          resolve(xhr.responseText);
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    // Send request
    xhr.open('POST', url);
    xhr.send(formData);
  });
}

/**
 * Check if browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Wait for browser to be online
 */
export function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve();
      return;
    }

    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve();
    };

    window.addEventListener('online', handleOnline);
  });
}

/**
 * Execute function when online, queue if offline
 */
export async function executeWhenOnline<T>(fn: () => Promise<T>): Promise<T> {
  await waitForOnline();
  return await fn();
}
