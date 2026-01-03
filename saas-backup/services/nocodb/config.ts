import { supabase } from '@/integrations/supabase/client';

// NocoDB Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ljpownumtmclnrtnqldt.supabase.co';

export const NOCODB_CONFIG = {
  BASE_URL: `${SUPABASE_URL}/functions/v1/nocodb-proxy`,

  TABLES: {
    // App Chi Nhánh Core
    CATEGORIES: 'mrwh1xdsj9q4ic0',
    TEMPLATES: 'mx3evjczav5a7e8',
    DESIGNS: 'mec9fzzjp2f3a3a',
    API_KEYS: 'mfvv86dr3uihs53',

    // User & Roles
    USER_ROLES: 'm0bix8eqprite24',
    PROFILES: 'mhegyo7nyk6wiaj',
    FEATURE_FLAGS: 'm9z38pmbxcjkolc',
    ROLE_FEATURE_FLAGS: 'm3jsykmhcf9egid',

    // Payment & Subscription
    PAYMENT_PACKAGES: 'm9fazh5nc6dt1a3',
    USER_SUBSCRIPTIONS: 'myjov622ntt3j73',
    PAYMENT_TRANSACTIONS: 'mxpd4ws5c03004u',
    PAYMENT_SETTINGS: 'm5n0h7fp95yyukz',
    USAGE_LOGS: 'ma252507vqsjzyb',
    USER_PAYMENTS: 'mz2tkzjmjlfsmvv',

    // Token/Coin System
    TOKEN_PACKAGES: 'mnakh7lk3x62ldh',
    TOKEN_PURCHASES: 'm96b2hx8eaqk6wx',
    USER_BALANCES: 'm16m58ti6kjlax0',
    COIN_TRANSACTIONS: 'm6ocdliorby6g9p',

    // Notifications
    NOTIFICATION_CONFIGS: 'm4sj7ykznw4nq3p',
    NOTIFICATIONS: 'mx6wnkun4ay6r1t',

    // Zalo
    ZALO_ACCOUNTS: 'm66vj4ze42hbp4c',
    ZALO_GROUPS: 'mdj8sbknpkoi682',
    ZALO_ACCOUNTS_ADMIN: 'm7dn8sz2y90e5vf',
    ZALO_USER_CONNECTIONS: 'mne2394ak6648ht',

    // Workspace
    WORKSPACES: 'mttfpjb5mzdepqc',
    WORKSPACE_MEMBERS: 'mm58i2zkndmzerd',

    // OpenAI
    OPENAI_USAGE_LOGS: 'mu4o68r0cv7fr83',

    // System
    SYSTEM_SETTINGS: 'mpgzi1koacsrwv0',
    CONFIGS: 'm8tb2v2k3m5lwlk',
    LANDING_PAGE_SETTINGS: 'm1p72tkzjfdmlso',

    // Sync
    USER_SYNC_SETTINGS: 'mntb4ziz8zfd0sc',

    // Zalo Messages
    MESSAGE_LOGS: 'mhtfov10uka6h2q',
    ZALO_MESSAGES: 'm9cppwhs9cp42hd',
    ZALO_RECEIVERS: 'mwkewgjcln5b5lg',
  }
} as const;

// Common headers for NocoDB API calls
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
