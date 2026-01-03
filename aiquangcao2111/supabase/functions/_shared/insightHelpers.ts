/**
 * Helper functions for insight key management and normalization
 */

/**
 * Convert any value to trimmed string (NO lowercase - for user_id, account_id)
 */
export const toStr = (v?: any): string => {
  if (v === null || v === undefined) return '';
  return v.toString().trim();
};

/**
 * Normalize Facebook ID to lowercase string (for campaign_id, adset_id, ad_id)
 */
export const normalizeId = (v?: string | number): string => {
  if (v === null || v === undefined) return '';
  return v.toString().trim().toLowerCase();
};

/**
 * Convert date to YYYY-MM-DD format (UTC)
 */
export const toYMD = (date?: string | Date): string => {
  if (!date) return '';
  const d = date instanceof Date ? date.toISOString() : date;
  return d.split('T')[0]; // YYYY-MM-DD
};

/**
 * Build unique insight key
 * Format: user_id|account_id|campaign_id|adset_id|ad_id|YYYY-MM-DD
 */
export const buildInsightKey = (params: {
  user_id: string | number;
  account_id: string | number;
  campaign_id?: string | number;
  adset_id?: string | number;
  ad_id?: string | number;
  date_start: string | Date;
}): string => {
  return [
    toStr(params.user_id),           // UUID/string - NO lowercase
    toStr(params.account_id),        // Account ID - NO lowercase
    normalizeId(params.campaign_id), // Facebook ID - lowercase
    normalizeId(params.adset_id),    // Facebook ID - lowercase
    normalizeId(params.ad_id),       // Facebook ID - lowercase
    toYMD(params.date_start),
  ].join('|');
};
