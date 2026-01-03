/**
 * Facebook Catalog Snapshot Service
 * Persists campaign/adset/ad structure to NocoDB backend
 * Ensures DELETED and PAUSED entities remain visible in UI
 */

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

interface CatalogEntity {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  campaign_id?: string;
  adset_id?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  issues_info?: any[];
  user_id: string;
  account_id: string;
  last_seen_at: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

// ==================== UPSERT FUNCTIONS ====================

/**
 * Upsert campaigns to backend snapshot
 */
export async function upsertCampaigns(
  user_id: string,
  account_id: string,
  campaigns: Array<{
    id: string;
    name: string;
    status?: string;
    effective_status?: string;
    daily_budget?: string;
    lifetime_budget?: string;
    issues_info?: any[];
  }>
): Promise<void> {
  const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_CAMPAIGNS);
  const headers = await getNocoDBHeaders();

  for (const campaign of campaigns) {
    const payload = {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      effective_status: campaign.effective_status,
      daily_budget: campaign.daily_budget,
      lifetime_budget: campaign.lifetime_budget,
      issues_info: campaign.issues_info ? JSON.stringify(campaign.issues_info) : null,
      user_id,
      account_id,
      last_seen_at: new Date().toISOString(),
      is_deleted: false,
      deleted_at: null,
    };

    try {
      // Try POST (create)
      await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch (error: any) {
      // If conflict (409), try PATCH (update)
      if (error?.status === 409 || error?.response?.status === 409) {
        try {
          // Find existing record by id + user_id
          const searchUrl = `${url}?where=(id,eq,${campaign.id})~and(user_id,eq,${user_id})`;
          const searchRes = await fetch(searchUrl, { headers });
          const searchData = await searchRes.json();

          if (searchData.list && searchData.list.length > 0) {
            const recordId = searchData.list[0].Id;
            await fetch(`${url}/${recordId}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(payload),
            });
          }
        } catch (patchError) {

        }
      }
    }
  }
}

/**
 * Upsert ad sets to backend snapshot
 */
// export async function upsertAdsets(...) { ... } // Removed

/**
 * Upsert ads to backend snapshot
 */
// export async function upsertAds(...) { ... } // Removed

// ==================== MARK DELETED FUNCTIONS ====================

/**
 * Mark campaigns as deleted if not in live IDs
 */
export async function markDeletedCampaigns(
  user_id: string,
  account_id: string,
  liveIds: string[]
): Promise<void> {
  const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_CAMPAIGNS);
  const headers = await getNocoDBHeaders();

  // Fetch all existing campaigns for this user/account
  const searchUrl = `${url}?where=(user_id,eq,${user_id})~and(account_id,eq,${account_id})`;
  const searchRes = await fetch(searchUrl, { headers });
  const searchData = await searchRes.json();

  if (!searchData.list) return;

  for (const record of searchData.list) {
    if (!liveIds.includes(record.id) && !record.is_deleted) {
      // Mark as deleted
      await fetch(`${url}/${record.Id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          is_deleted: true,
          effective_status: 'DELETED',
          deleted_at: new Date().toISOString(),
        }),
      });
    }
  }
}

/**
 * Mark ad sets as deleted if not in live IDs
 */
// export async function markDeletedAdsets(...) { ... } // Removed

/**
 * Mark ads as deleted if not in live IDs
 */
// export async function markDeletedAds(...) { ... } // Removed

// ==================== GET CATALOG FUNCTIONS ====================

/**
 * Get campaign catalog from backend
 */
export async function getCampaignCatalog(
  user_id: string,
  account_id: string
): Promise<Array<{
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  issues_info?: any[];
  is_deleted?: boolean;
}>> {
  try {
    const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_CAMPAIGNS);
    const headers = await getNocoDBHeaders();

    const whereClause = encodeURIComponent(`(user_id,eq,${user_id})~and(account_id,eq,${account_id})`);
    const searchUrl = `${url}?where=${whereClause}&limit=1000`;
    const res = await fetch(searchUrl, { headers });

    if (!res.ok) {
      console.warn('getCampaignCatalog failed:', res.status);
      return [];
    }

    const data = await res.json();
    if (!data.list) return [];

    return data.list.map((record: any) => ({
      id: record.id,
      name: record.name,
      status: record.status,
      effective_status: record.effective_status,
      daily_budget: record.daily_budget,
      lifetime_budget: record.lifetime_budget,
      issues_info: record.issues_info ? JSON.parse(record.issues_info) : undefined,
      is_deleted: record.is_deleted || false,
    }));
  } catch (error) {
    console.error('getCampaignCatalog error:', error);
    return [];
  }
}

/**
 * Get ad set catalog from backend
 */
// export async function getAdsetCatalog(...) { ... } // Removed

/**
 * Get ad catalog from backend
 */
// export async function getAdCatalog(...) { ... } // Removed
