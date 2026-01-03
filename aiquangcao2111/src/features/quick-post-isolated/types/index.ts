// Shared types for AI Assistant flows

export type QuickPostStage =
  | 'idle'
  | 'parsing'
  | 'awaiting_budget'
  | 'awaiting_age'
  | 'awaiting_gender'
  | 'awaiting_location'
  | 'awaiting_radius'
  | 'awaiting_interests'
  | 'confirming'
  | 'creating'
  | 'done'
  | 'error';

export interface ParsedCampaignData {
  campaignType: 'post' | 'message';
  name: string;
  objective: string;
  age?: {
    min: number;
    max: number;
  };
  gender?: 'all' | 'male' | 'female';
  location?: Array<{
    name: string;
    type: string;
    key: string;
    radius?: number;
    distance_unit?: string;
  }>;
  locationType?: 'coordinate' | 'city' | 'country';
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  interests?: Array<{
    id: string;
    name: string;
  }>;
  budget?: number;
  // ✅ Lifetime Budget fields (supports both cases from Edge Function)
  budgetType?: 'DAILY' | 'LIFETIME' | 'daily' | 'lifetime';
  lifetimeBudget?: number;
  startTime?: string;
  endTime?: string;
  enableSchedule?: boolean;
  scheduleSlots?: Array<{
    days: number[];
    startHour: number;
    endHour: number;
  }>;
  postUrl?: string;
  resolvedPostId?: string;
  pageId?: string;
  content?: {
    greeting?: string;
    title: string;
    message: string;
  };
  // ⭐ Message Ads specific fields (from template)
  headline?: string;
  greetingTemplate?: string;
  frequentQuestions?: string[];
  // Media preview
  uploadedImageHash?: string;
  uploadedVideoId?: string;
}

export interface QuickPostTokens {
  adsToken: string;
  pageToken: string;
  adAccountId: string;
  pageId: string;
}

export interface QuickPostResult {
  campaignId: string;
  adSetId: string;
  adId: string;
}

export interface QuickPostError {
  type: 'missing_token' | 'invalid_link' | 'validation_error' | 'api_error';
  message: string;
  field?: string;
}
