/**
 * Upsert insight to NocoDB
 * - Try POST first (for new campaigns)
 * - If conflict (409/422), GET id by insight_key + user_id then PATCH metrics only
 */

import { normalizeId, toYMD, buildInsightKey, toStr } from './insightHelpers.ts';

export interface InsightMetrics {
  spend?: number;
  clicks?: number;
  impressions?: number;
  reach?: number;
  frequency?: number;
  results?: number;
  cost_per_result?: number;
  ctr?: number;
  cpm?: number;
  cpc?: number;
  conversions?: number;
  roas?: number;
  [key: string]: any; // Allow additional metrics
}

export interface UpsertInsightInput {
  user_id: string | number;
  account_id: string | number;
  account_name?: string;
  campaign_id?: string | number;
  campaign_name?: string;
  adset_id?: string | number;
  adset_name?: string;
  ad_id?: string | number;
  ad_name?: string;
  level: 'campaign' | 'adset' | 'ad';
  date_start: string | Date;
  date_stop?: string;
  effective_status?: string;
  configured_status?: string;
  status?: string;
  objective?: string;
  metrics: InsightMetrics;
}

export interface UpsertResult {
  action: 'created' | 'updated';
  insight_key: string;
  id?: string;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function upsertInsight(
  input: UpsertInsightInput,
  nocodbConfig: {
    url: string;
    token: string;
    projectId: string;
    tableId: string;
  }
): Promise<UpsertResult> {
  const { url, token, projectId, tableId } = nocodbConfig;
  
  const headers = {
    'xc-token': token,
    'Content-Type': 'application/json',
  };

  // 1) Normalize and build insight_key
  const normalized = {
    user_id: input.user_id,
    account_id: input.account_id,
    account_name: input.account_name,
    campaign_id: normalizeId(input.campaign_id),
    campaign_name: input.campaign_name,
    adset_id: normalizeId(input.adset_id),
    adset_name: input.adset_name,
    ad_id: normalizeId(input.ad_id),
    ad_name: input.ad_name,
    level: input.level,
    date_start: toYMD(input.date_start),
    date_stop: input.date_stop,
    effective_status: input.effective_status,
    configured_status: input.configured_status,
    status: input.status,
    objective: input.objective,
  };

  const insight_key = buildInsightKey({
    user_id: normalized.user_id,
    account_id: normalized.account_id,
    campaign_id: normalized.campaign_id,
    adset_id: normalized.adset_id,
    ad_id: normalized.ad_id,
    date_start: normalized.date_start,
  });

  // 2) Prepare payload for POST
  const payload = {
    ...normalized,
    insight_key,
    ...input.metrics,
    synced_at: new Date().toISOString(),
  };

  // 3) Try POST (for new campaigns/records)
  const postUrl = `${url}/api/v2/tables/${projectId}/${tableId}/records`;
  const postRes = await fetch(postUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  // Success - new record created
  if (postRes.status === 200 || postRes.status === 201) {
    return { action: 'created', insight_key };
  }

  // 4) If conflict (duplicate insight_key), GET id then PATCH
  if (postRes.status === 409 || postRes.status === 422) {
    // 4.1) Find existing record by insight_key + user_id (double-lock security)
    const whereClause = encodeURIComponent(
      `(insight_key,eq,${insight_key})~and(user_id,eq,${toStr(normalized.user_id)})`
    );
    const getUrl = `${url}/api/v2/tables/${projectId}/${tableId}/records?where=${whereClause}&limit=1`;
    
    const getRes = await fetch(getUrl, {
      headers: { 'xc-token': token },
    });

    if (!getRes.ok) {
      throw new Error(`GET by insight_key failed: ${getRes.status}`);
    }

    const data = await getRes.json();
    const record = data?.list?.[0];
    const recordId = record?.Id || record?.id;

    if (!recordId) {
      throw new Error(`Record not found by insight_key: ${insight_key}`);
    }

    // 4.2) PATCH only metrics (not insight_key or IDs)
    const patchBody = {
      ...input.metrics,
      synced_at: new Date().toISOString(),
    };

    // Retry mechanism for temporary conflicts
    for (let attempt = 0; attempt < 3; attempt++) {
      const patchUrl = `${url}/api/v2/tables/${projectId}/${tableId}/records/${recordId}`;
      const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patchBody),
      });

      if (patchRes.ok) {
        return { action: 'updated', insight_key, id: recordId };
      }

      // Wait before retry
      await sleep(200 * (attempt + 1));
    }

    throw new Error(`PATCH failed after 3 retries for ${insight_key}`);
  }

  // 5) Other errors
  const errorText = await postRes.text().catch(() => `${postRes.status}`);
  throw new Error(`POST failed: ${postRes.status} - ${errorText}`);
}

/**
 * Batch upsert insights
 */
export async function batchUpsertInsights(
  insights: UpsertInsightInput[],
  nocodbConfig: {
    url: string;
    token: string;
    projectId: string;
    tableId: string;
  }
): Promise<{
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ insight_key: string; error: string }>;
}> {
  const results = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: [] as Array<{ insight_key: string; error: string }>,
  };

  for (const insight of insights) {
    try {
      const result = await upsertInsight(insight, nocodbConfig);
      if (result.action === 'created') {
        results.created++;
      } else {
        results.updated++;
      }
    } catch (error) {
      results.failed++;
      const insight_key = buildInsightKey({
        user_id: insight.user_id,
        account_id: insight.account_id,
        campaign_id: insight.campaign_id,
        adset_id: insight.adset_id,
        ad_id: insight.ad_id,
        date_start: insight.date_start,
      });
      results.errors.push({
        insight_key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
