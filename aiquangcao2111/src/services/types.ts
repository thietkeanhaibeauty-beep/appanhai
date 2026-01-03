// Service-specific types
// These types are used internally by services and may differ from public API types

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

export interface ServiceError {
  message: string;
  code?: string | number;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface RequestConfig {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}
