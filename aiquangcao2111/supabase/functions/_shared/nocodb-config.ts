/**
 * Shared NocoDB Configuration for ALL Edge Functions
 * 
 * IMPORTANT: This is the single source of truth for NocoDB config
 * All Edge Functions MUST import from this file
 * 
 * Last Updated: 2025-11-27
 * Instance: https://db.hpb.edu.vn
 * Project ID: p0lvt22fuj3opkl
 */

export const NOCODB_CONFIG = {
    BASE_URL: 'https://db.hpb.edu.vn',
    API_TOKEN: '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',

    // Table IDs - Synced with src/services/nocodb/config.ts
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
        SYSTEM_SETTINGS: 'mq6r65gh3vp5av8',

        // Phase 5: Missing Tables & Drafts (To be created/verified)
        DRAFT_CAMPAIGNS: 'mr1mlo87lpmsr77',
        DRAFT_CATEGORIES: 'mb8ntkrydd5nfra',
        DRAFT_ADSETS: 'mvxvx0fpori2ei8', // Placeholder/Draft ID
        // DRAFT_ADS: 'PLACEHOLDER_CREATE_ME', // Removed

        // Sync & Notifications
        USER_SYNC_SETTINGS: 'mcgp6vh9lh19zhc',
        SYNC_LOGS: 'mtrjomtzrv1wwix',
        NOTIFICATION_CONFIGS: 'm4kdxt87npriw50',
        NOTIFICATIONS: 'm860ubmg3mb0uqv',

        // Archives/Others
        FACEBOOK_INSIGHTS_AUTO: 'm17gyigy8jqlaoz',
        FACEBOOK_INSIGHTS_ARCHIVE: 'mso84k5fpiwtph1',
        FACEBOOK_INSIGHTS_HISTORY: 'm76cnwfplbzwr1s',

        // Missing/To Be Created
        // FACEBOOK_ADSETS: 'PLACEHOLDER_CREATE_ME', // Removed
        // FACEBOOK_ADS: 'PLACEHOLDER_CREATE_ME', // Removed

        // Aggregated Insights (NocoDB-based)
        TODAY_INSIGHTS: 'PLACEHOLDER',
        WEEKLY_INSIGHTS: 'PLACEHOLDER',
        MONTHLY_INSIGHTS: 'PLACEHOLDER',

        // Workspace & Team Management
        WORKSPACE_MEMBERS: 'mnlhwgzuus5c75y',

        // Token/Coin System
        USER_BALANCES: 'mbpatk8hctj9u1o',
        COIN_TRANSACTIONS: 'mai6u2tkuy7pumx',
        OPENAI_USAGE_LOGS: 'magb5ls8j82lp27',

        // Admin Zalo (for sending notifications via admin account)
        ZALO_ACCOUNTS_ADMIN: 'mf3urf8zirrc8gu',
        // User Zalo connections (store each user's Zalo userId for personal notifications)
        ZALO_USER_CONNECTIONS: 'mgrp6jdie2x2238',
    },

} as const;

/**
 * Get NocoDB API headers with auth token
 */
export const getNocoDBHeaders = () => ({
    'xc-token': NOCODB_CONFIG.API_TOKEN,
    'Content-Type': 'application/json',
});

/**
 * Build NocoDB API URL for a table
 */
export const getNocoDBUrl = (tableId: string) => {
    return `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${tableId}/records`;
};
