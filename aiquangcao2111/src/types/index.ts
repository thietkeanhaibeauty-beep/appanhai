// Core Type Definitions - Framework Agnostic
// DO NOT modify these types without updating all dependent components

// ============================================================================
// ACCOUNT & AUTHENTICATION TYPES
// ============================================================================

export interface AdAccount {
  id: string;
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;
  disable_reason?: string;
  funding_source_details?: {
    id: string;
    display_string: string;
    type: number;
  };
}

export interface PageDetails {
  id: string;
  name: string;
  category: string;
  tasks?: string[];
}

// ============================================================================
// CONVERSATION & MESSAGING TYPES
// ============================================================================

export interface Conversation {
  id: string;
  participants: {
    data: Array<{
      id: string;
      name: string;
      email?: string;
    }>;
  };
  updated_time: string;
  message_count?: number;
  unread_count?: number;
  snippet?: string;
  can_reply?: boolean;
  is_subscribed?: boolean;
  labels?: Label[];
}

export interface Message {
  id: string;
  from: {
    id: string;
    name: string;
    email?: string;
  };
  to?: {
    data: Array<{
      id: string;
      name: string;
      email?: string;
    }>;
  };
  message: string;
  created_time: string;
  attachments?: {
    data: Array<{
      id: string;
      mime_type: string;
      name: string;
      size: number;
      image_data?: {
        url: string;
        width: number;
        height: number;
      };
      video_data?: {
        url: string;
        width: number;
        height: number;
      };
    }>;
  };
}

export interface Label {
  id: string;
  name: string;
  color?: string;
}

export interface IceBreaker {
  question: string;
  payload?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  text: string;
  category?: string;
}

// ============================================================================
// POST & CREATIVE TYPES
// ============================================================================

export interface PostValidationResult {
  isValid: boolean;
  postId?: string;
  preview?: PostPreview;
  error?: string;
}

export interface PostPreview {
  id: string;
  message?: string;
  full_picture?: string;
  permalink_url?: string;
  created_time?: string;
  type?: string;
}

export interface CreativeUpload {
  hash?: string;
  url?: string;
  id?: string;
  thumbnailUrl?: string;
}

// ============================================================================
// TARGETING & INTERESTS TYPES
// ============================================================================

export interface Interest {
  id: string;
  name: string;
  audience_size?: number;
  path?: string[];
  description?: string;
  topic?: string;
  disambiguation_category?: string;
}

export interface TargetingSpec {
  geo_locations?: {
    countries?: string[];
    regions?: Array<{
      key: string;
    }>;
    cities?: Array<{
      key: string;
      radius?: number;
      distance_unit?: string;
    }>;
    custom_locations?: Array<{
      latitude: number;
      longitude: number;
      radius: number;
      distance_unit?: string;
    }>;
  };
  age_min?: number;
  age_max?: number;
  genders?: number[];
  flexible_spec?: Array<{
    interests?: Array<{ id: string; name: string }>;
  }>;
  excluded_geo_locations?: {
    countries?: string[];
  };
  publisher_platforms?: string[];
  facebook_positions?: string[];
  device_platforms?: string[];
}

export interface AudienceEstimate {
  users: number;
  estimate_ready: boolean;
  estimate_dau?: number;
  estimate_mau?: number;
}

// ============================================================================
// CAMPAIGN TYPES
// ============================================================================

export type CampaignObjective = 
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_SALES'
  | 'MESSAGES';

export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';

export interface Campaign {
  id: string;
  name: string;
  objective?: CampaignObjective;
  status?: CampaignStatus;
  configured_status?: string; // User-set status (ACTIVE/PAUSED)
  effective_status?: string; // Status from Facebook API (ACTIVE, PAUSED, DELETED, etc.)
  daily_budget?: string;
  lifetime_budget?: string;
  special_ad_categories?: string[];
  created_time?: string;
  updated_time?: string;
  issues_info?: any[]; // Payment and policy issues from Facebook API
}

export interface AdSet {
  id: string;
  name: string;
  campaign_id: string;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time: string;
  end_time?: string;
  targeting: TargetingSpec;
  billing_event: string;
  optimization_goal: string;
  bid_strategy: string;
  status: CampaignStatus;
  promoted_object?: {
    page_id?: string;
    object_story_id?: string;
  };
}

export interface Ad {
  id: string;
  name: string;
  adset_id: string;
  creative: AdCreative;
  status: CampaignStatus;
  created_time?: string;
}

export interface AdCreative {
  object_story_id?: string;
  object_story_spec?: {
    page_id: string;
    link_data?: {
      message: string;
      link: string;
      image_hash?: string;
      video_id?: string;
      call_to_action?: {
        type: string;
        value?: {
          link?: string;
        };
      };
    };
  };
}

// ============================================================================
// INSIGHTS & REPORTING TYPES
// ============================================================================

export interface AdInsight {
  // IDs and Names
  account_id?: string;
  account_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;

  // Time
  date_start?: string;
  date_stop?: string;

  // Status and Budget
  status?: string;
  effective_status?: string;
  budget?: number;
  objective?: string;

  // Delivery & Cost
  spend?: number;
  impressions?: number;
  reach?: number;
  frequency?: number;
  cpc?: number;
  cpm?: number;
  cpp?: number;
  cost_per_unique_click?: number;

  // Performance & Engagement
  clicks?: number;
  ctr?: number;
  actions?: Array<{ action_type: string; value: string }>;
  results?: number;
  cost_per_result?: number;
  result_label?: string;
  action_type_used?: string;
  
  // Rankings
  quality_ranking?: string;
  engagement_rate_ranking?: string;
  conversion_rate_ranking?: string;

  // Conversions
  purchase_roas?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;

  // Video Metrics
  video_p25_watched_actions?: Array<{ action_type: string; value: string }>;
  video_p50_watched_actions?: Array<{ action_type: string; value: string }>;
  video_p75_watched_actions?: Array<{ action_type: string; value: string }>;
  video_p100_watched_actions?: Array<{ action_type: string; value: string }>;
  video_play_actions?: Array<{ action_type: string; value: string }>;
  cost_per_thruplay?: number;
}

export interface GetInsightsParams {
  accessToken: string;
  adAccountId: string;
  level: 'campaign' | 'adset' | 'ad';
  since: string;
  until: string;
  campaignId?: string;
  adsetId?: string;
}

// ============================================================================
// SCHEDULING & BUDGET TYPES
// ============================================================================

export interface ScheduleSlot {
  day: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
}

export interface BudgetConfig {
  type: 'DAILY' | 'LIFETIME';
  amount: number;
  currency: string;
}

export interface DateRange {
  start: Date;
  end?: Date;
}

// ============================================================================
// A/B TESTING TYPES
// ============================================================================

export interface ABVariation {
  name: 'A' | 'B';
  interests?: Interest[];
  message: string;
  creative?: CreativeUpload;
  creativeType?: 'image' | 'video';
}

// ============================================================================
// AI ANALYSIS TYPES
// ============================================================================

export interface AudienceAnalysis {
  analysis: string;
  suggestions: string[];
  score: number; // 0-100
}

export interface CreativeAnalysis {
  analysis: string;
  suggestions: string[];
  score: number; // 0-100
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface FacebookAPIError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export interface APILog {
  timestamp: Date;
  endpoint: string;
  method: string;
  status: number;
  request?: any;
  response?: any;
  error?: FacebookAPIError;
}

// ============================================================================
// APPLICATION STATE TYPES
// ============================================================================

export interface AppSettings {
  adsToken?: string;
  pageToken?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  selectedAdAccount?: AdAccount;
  selectedPage?: PageDetails;
}

export interface UIState {
  isLoading: boolean;
  error?: string;
  success?: string;
}
