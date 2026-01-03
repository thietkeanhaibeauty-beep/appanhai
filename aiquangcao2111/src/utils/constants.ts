// Application constants

// Facebook Graph API
export const GRAPH_API_VERSION = 'v21.0';
export const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// LocalStorage keys
export const STORAGE_KEYS = {
  MODE: 'fb-ads-mode',
  SETTINGS: 'fb-ads-settings',
  ADS_TOKEN: 'fb-ads-token',
  PAGE_TOKEN: 'fb-page-token',
  SELECTED_ACCOUNT: 'fb-selected-account',
  SELECTED_PAGE: 'fb-selected-page',
} as const;

// Campaign objectives
export const CAMPAIGN_OBJECTIVES = {
  AWARENESS: 'OUTCOME_AWARENESS',
  ENGAGEMENT: 'OUTCOME_ENGAGEMENT',
  TRAFFIC: 'OUTCOME_TRAFFIC',
  LEADS: 'OUTCOME_LEADS',
  SALES: 'OUTCOME_SALES',
  MESSAGES: 'MESSAGES',
} as const;

// Campaign status options
export const CAMPAIGN_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  DELETED: 'DELETED',
  ARCHIVED: 'ARCHIVED',
} as const;

// Budget types
export const BUDGET_TYPES = {
  DAILY: 'DAILY',
  LIFETIME: 'LIFETIME',
} as const;

// Gender options for targeting
export const GENDER_OPTIONS = {
  ALL: 0,
  MALE: 1,
  FEMALE: 2,
} as const;

// Age range limits
export const AGE_RANGE = {
  MIN: 18,
  MAX: 65,
} as const;

// File upload limits
export const UPLOAD_LIMITS = {
  IMAGE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  VIDEO_MAX_SIZE: 100 * 1024 * 1024, // 100MB
  IMAGE_FORMATS: ['image/jpeg', 'image/png', 'image/jpg'],
  VIDEO_FORMATS: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
} as const;

// API rate limits
export const API_LIMITS = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  REQUEST_TIMEOUT: 30000,
} as const;

// UI constants
export const UI = {
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 500,
  ANIMATION_DURATION: 300,
} as const;
