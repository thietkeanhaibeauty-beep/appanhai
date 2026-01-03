import { supabase } from '@/integrations/supabase/client';

// NocoDB Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jtaekxrkubhwtqgodvtx.supabase.co';

export const NOCODB_CONFIG = {
  // Point to the Supabase Edge Function Proxy
  BASE_URL: `${SUPABASE_URL}/functions/v1/nocodb-proxy`,
  // API_TOKEN is removed for security

  // Table IDs from NocoDB Dashboard URLs
  TABLES: {
    // Phase 1: Foundation (User & Roles)
    USER_ROLES: 'm7fkz8rlwuizquy',
    PROFILES: 'mlcrus3sfhchdhw',
    FEATURE_FLAGS: 'm4vhdk99vpso26v',
    ROLE_FEATURE_FLAGS: 'm8zi9ymtb23dsih',
    USER_FEATURE_OVERRIDES: 'mgcc9nlutfcyz2h',

    // Phase 2: Assets (Facebook & Settings)
    FACEBOOK_AD_ACCOUNTS: 'ms3iubpejoynr9a',
    FACEBOOK_PAGES: 'mae9h6b25kenk7j',
    FACEBOOK_PERSONAL_TOKENS: 'm0aafpikurhj6qs',
    OPENAI_SETTINGS: 'me8nzzace4omg8i',
    CONFIG: 'm43ss8tbgfew7l6',

    // Phase 3: Core Business (Campaigns & Automation)
    FACEBOOK_CAMPAIGNS: 'm3nfpbas7lky3gk',
    CAMPAIGN_LABELS: 'm37ye177g4m98st',
    CAMPAIGN_LABEL_ASSIGNMENTS: 'myjgw4ial5s6zrw',
    AUTOMATED_RULES: 'mlsshti794grsvf',
    AUTOMATION_RULE_EXECUTION_LOGS: 'masstbinn3h8hkr',
    PENDING_REVERTS: 'mlh0pm0padym9i1',

    // Phase 4: SaaS & Payment
    PAYMENT_PACKAGES: 'm7oivsc6c73wc3i',
    USER_SUBSCRIPTIONS: 'mhanefxi3xtc4b3',
    PAYMENT_TRANSACTIONS: 'mjlq3evtb8n7g08',
    PAYMENT_SETTINGS: 'mkj2c8zur7e77zm',
    USAGE_LOGS: 'm0a5zb8c660vd03',
    FACEBOOK_INSIGHTS: 'm2uao1is9j02wfn',
    SALES_REPORTS: 'me14lqzoxj5xwar',
    TOKEN_PACKAGES: 'mtalzi3mr80u6xu',
    TOKEN_PURCHASES: 'mw3ccm06iewigqj',

    // Phase 5: Missing Tables & Drafts (To be created/verified)
    DRAFT_CAMPAIGNS: 'mr1mlo87lpmsr77',
    DRAFT_CATEGORIES: 'mb8ntkrydd5nfra',
    DRAFT_ADSETS: 'mvxvx0fpori2ei8', // Placeholder/Draft ID

    // Sync & Notifications
    USER_SYNC_SETTINGS: 'mcgp6vh9lh19zhc',
    SYNC_LOGS: 'mtrjomtzrv1wwix',
    NOTIFICATION_CONFIGS: 'm4kdxt87npriw50',
    NOTIFICATIONS: 'm860ubmg3mb0uqv',
    ZALO_ACCOUNTS: 'm7nreyi217w6tyx',
    ZALO_GROUPS: 'm1phabv72htychf',
    MESSAGE_LOGS: 'm64cr7hzo7f2mfn',
    ZALO_MESSAGES: 'mqcs04obopbvetb',
    ZALO_RECEIVERS: 'mdpxvhr2qy1gp5y',

    // Archives/Others
    FACEBOOK_INSIGHTS_AUTO: 'm17gyigy8jqlaoz',
    FACEBOOK_INSIGHTS_ARCHIVE: 'mso84k5fpiwtph1',

    // Missing/To Be Created
    // FACEBOOK_ADSETS: 'PLACEHOLDER_CREATE_ME', // Removed as per user request
    // FACEBOOK_ADS: 'PLACEHOLDER_CREATE_ME', // Removed as per user request
    // DRAFT_ADS: 'PLACEHOLDER_CREATE_ME', // Removed as per user request
    FACEBOOK_INSIGHTS_HISTORY: 'm76cnwfplbzwr1s',

    // Phase 6: Service & API Management
    USER_API_TOKENS: 'mnmk38fbm12kqd7',
    SERVICE_TEMPLATES: 'mojkp7krw9jjdjc',
    GOLDEN_RULE_SETS: 'mw5q8k3h7g2l1p9',

    // Phase 7: AI Keywords Management
    AI_KEYWORDS_CONFIG: 'mwqjgho2g4j631t',

    // Phase 8: Workspace & Team Management
    WORKSPACES: 'mjph6kd951jm4l5',
    WORKSPACE_MEMBERS: 'mnlhwgzuus5c75y',

    // Phase 9: Token/Coin System
    USER_BALANCES: 'mbpatk8hctj9u1o',
    COIN_TRANSACTIONS: 'mai6u2tkuy7pumx',
    OPENAI_USAGE_LOGS: 'magb5ls8j82lp27',

    // Phase 10: System Settings (Global API Keys)
    SYSTEM_SETTINGS: 'mq6r65gh3vp5av8',

    // Phase 11: Admin Zalo (for sending notifications via admin account)
    ZALO_ACCOUNTS_ADMIN: 'mf3urf8zirrc8gu',
    // User Zalo connections (store each user's Zalo userId for personal notifications)
    ZALO_USER_CONNECTIONS: 'mgrp6jdie2x2238',
  }
} as const;

// Common headers for NocoDB API calls
// Now async to retrieve the current user's session token
export const getNocoDBHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token || ''}`,
    'Content-Type': 'application/json',
  };
};

// Build NocoDB API URL
export const getNocoDBUrl = (tableId: string, recordId?: string) => {
  const baseUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${tableId}/records`;
  return recordId ? `${baseUrl}/${recordId}` : baseUrl;
};
