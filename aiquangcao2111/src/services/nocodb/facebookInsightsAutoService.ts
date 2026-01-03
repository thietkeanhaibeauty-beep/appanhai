import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export interface FacebookInsight {
  Id?: number;
  user_id?: string;
  account_id: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  objective?: string;
  date_start: string;
  date_stop: string;
  sync_date?: string;

  // Metrics
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  frequency?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  cpp?: number;

  results?: number;
  cost_per_result?: number;
  result_label?: string;
  action_type_used?: string;

  // Messaging-specific metrics
  results_messaging_replied_7d?: number;
  cost_per_messaging_replied_7d?: number;

  // 13 Action Fields (Vietnamese column names in NocoDB)
  started_7d?: number; // Trò chuyện 7d
  total_messaging_connection?: number; // Tổng kết nối tin nhắn
  link_click?: number; // Nhấp liên kết
  messaging_welcome_message_view?: number; // Xem tin nhắn chào mừng
  post_engagement_action?: number; // Tương tác bài viết
  post_interaction_gross?: number; // Tương tác tổng
  messaging_first_reply?: number; // Tin nhắn đầu tiên
  video_view?: number; // Xem video
  post_reaction?: number; // Phản ứng bài viết
  page_engagement_action?: number; // Tương tác trang
  replied_7d?: number; // Phản hồi 7d
  depth_2_message?: number; // Tin nhắn độ sâu 2
  depth_3_message?: number; // Tin nhắn độ sâu 3

  // 13 Cost Per Action Fields
  cost_per_started_7d?: number;
  cost_per_total_messaging_connection?: number;
  cost_per_link_click?: number;
  cost_per_messaging_welcome_message_view?: number;
  cost_per_post_engagement?: number;
  cost_per_post_interaction_gross?: number;
  cost_per_messaging_first_reply?: number;
  cost_per_video_view?: number;
  cost_per_post_reaction?: number;
  cost_per_page_engagement?: number;
  cost_per_replied_7d?: number;
  cost_per_depth_2_message?: number;
  cost_per_depth_3_message?: number;
  cost_per_messaging_user_depth_2?: number;

  // JSONB fields
  actions?: any;
  action_values?: any;
  cost_per_action_type?: any;
  video_p25_watched_actions?: any;
  video_p50_watched_actions?: any;
  video_p75_watched_actions?: any;
  video_p100_watched_actions?: any;

  // Status
  status?: string;
  configured_status?: string; // User-set status (ACTIVE/PAUSED)
  effective_status?: string; // Actual status from Facebook (can be DELETED, WITH_ISSUES, etc.)
  budget?: number;
  daily_budget?: number;
  lifetime_budget?: number;

  // Level indicator
  level?: 'campaign' | 'adset' | 'ad';

  // Unique insight key
  insight_key?: string;

  created_at?: string;
  updated_at?: string;
}

interface NocoDBListResponse {
  list: FacebookInsight[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

// Danh sách đầy đủ các cột metrics được phép update
const METRIC_COLUMNS = [
  'spend', 'clicks', 'impressions', 'reach', 'frequency',
  'ctr', 'cpm', 'cpc', 'cpp', 'results', 'cost_per_result',
  'results_messaging_replied_7d', 'cost_per_messaging_replied_7d',
  'started_7d', 'total_messaging_connection', 'link_click',
  'messaging_welcome_message_view', 'post_engagement_action',
  'post_interaction_gross', 'messaging_first_reply', 'video_view',
  'post_reaction', 'page_engagement_action', 'replied_7d',
  'depth_2_message', 'depth_3_message',
  'cost_per_started_7d', 'cost_per_total_messaging_connection',
  'cost_per_link_click', 'cost_per_messaging_welcome_message_view',
  'cost_per_post_engagement', 'cost_per_post_interaction_gross',
  'cost_per_messaging_first_reply', 'cost_per_video_view',
  'cost_per_post_reaction', 'cost_per_page_engagement',
  'cost_per_replied_7d', 'cost_per_depth_2_message',
  'cost_per_depth_3_message', 'cost_per_messaging_user_depth_2',
  'daily_budget', 'lifetime_budget',
  'synced_at'
] as const;

/**
 * Get insights by user ID, account ID, and date range
 * CRITICAL: Always filter by both user_id AND account_id to prevent cross-account data contamination
 */
export const getInsightsByUserAndDate = async (
  userId: string,
  startDate: string,
  endDate: string,
  accountId?: string, // Optional for backward compatibility, but should always be provided
  offset = 0,
  limit = 10000
): Promise<FacebookInsight[]> => {
  try {
    if (!userId || !accountId) {
      console.error('❌ getInsightsByUserAndDate: Missing userId or accountId', { userId, accountId });
      return [];
    }

    // ✅ FIX: Filter by user_id + account_id + date_start
    // This ensures we only fetch data for the current user and their active ad account
    const whereClause = encodeURIComponent(
      `(user_id,eq,${userId})~and(account_id,eq,${accountId})~and(date_start,gte,${startDate})~and(date_start,lte,${endDate})`
    );

    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO)}?where=${whereClause}&offset=${offset}&limit=${limit}&sort=-date_start`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ NocoDB error:', response.status, errorText);
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    const data: NocoDBListResponse = await response.json();

    // ✅ Date filtering is now done in API query, no need for client-side filter
    const filtered = data.list || [];

    // ✅ Auto-fix missing level field for backward compatibility
    const fixedInsights = filtered.map(insight => {
      // Map legacy field 'Trò chuyện 7d' -> started_7d for backward compatibility
      if ((insight.started_7d === undefined || insight.started_7d === 0) && insight['Trò chuyện 7d'] !== undefined) {
        const v = Number(insight['Trò chuyện 7d']);
        insight.started_7d = isNaN(v) ? 0 : Math.round(v);
      }

      if (!insight.level) {
        insight.level = insight.ad_id ? 'ad' : insight.adset_id ? 'adset' : 'campaign';
      }
      return insight;
    });

    return fixedInsights;
  } catch (error) {
    console.error('Error fetching insights from NocoDB:', error);
    throw error;
  }
};

/**
 * Get ALL insights by user ID, account ID, and date range (Handles pagination automatically)
 */
export const getAllInsightsByUserAndDate = async (
  userId: string,
  startDate: string,
  endDate: string,
  accountId: string
): Promise<FacebookInsight[]> => {
  try {
    let allData: FacebookInsight[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      if (!userId || !accountId) {
        console.error('❌ getAllInsightsByUserAndDate: Missing userId or accountId', { userId, accountId });
        return [];
      }

      // ✅ FIX: Filter by user_id + account_id + date_start in API query
      const whereClause = encodeURIComponent(
        `(user_id,eq,${userId})~and(account_id,eq,${accountId})~and(date_start,gte,${startDate})~and(date_start,lte,${endDate})`
      );
      const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO)}?where=${whereClause}&offset=${offset}&limit=${limit}&sort=-date_start`;

      const response = await fetch(url, {
        method: 'GET',
        headers: await getNocoDBHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ NocoDB error:', response.status, errorText);
        throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
      }

      const data: NocoDBListResponse = await response.json();
      const items = data.list || [];

      allData = allData.concat(items);

      // Check if there are more pages using NocoDB pageInfo
      if (data.pageInfo && !data.pageInfo.isLastPage) {
        offset += limit;
      } else {
        hasMore = false;
      }
    }

    // ✅ Date filtering is now done in API query, no need for client-side filter
    const filtered = allData;

    // ✅ Auto-fix missing level field for backward compatibility
    const fixedInsights = filtered.map(insight => {
      // Map legacy field 'Trò chuyện 7d' -> started_7d for backward compatibility
      if ((insight.started_7d === undefined || insight.started_7d === 0) && insight['Trò chuyện 7d'] !== undefined) {
        const v = Number(insight['Trò chuyện 7d']);
        insight.started_7d = isNaN(v) ? 0 : Math.round(v);
      }

      if (!insight.level) {
        insight.level = (insight.ad_id && insight.ad_id !== '0') ? 'ad' : (insight.adset_id && insight.adset_id !== '0') ? 'adset' : 'campaign';
      }
      return insight;
    });

    return fixedInsights;
  } catch (error) {
    console.error('Error fetching ALL insights from NocoDB:', error);
    throw error;
  }
};

/**
 * Build insight_key for uniqueness check
 * Format: user_id|account_id|campaign_id|adset_id|ad_id|YYYY-MM-DD
 */
const buildInsightKey = (insight: Partial<FacebookInsight>): string => {
  const normalizeId = (id: string | null | undefined): string => {
    if (!id || id === 'null' || id === 'undefined') return '';
    return String(id).toLowerCase().trim();
  };

  const normalizeDate = (date: string | undefined): string => {
    if (!date) return '';
    return date.split(/[T ]/)[0]; // YYYY-MM-DD (Handles both ISO 'T' and SQL space)
  };

  return [
    insight.user_id || '',
    insight.account_id || '',
    normalizeId(insight.campaign_id),
    normalizeId(insight.adset_id),
    normalizeId(insight.ad_id),
    normalizeDate(insight.date_start),
  ].join('|');
};

/**
 * Bulk UPSERT insights (for sync operation)
 * Checks if record exists first, then UPDATE or INSERT accordingly
 */
export const bulkInsertInsights = async (insights: Partial<FacebookInsight>[]): Promise<void> => {
  try {
    const BATCH_SIZE = 50;
    let upsertedCount = 0;
    let updatedCount = 0;
    let insertedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < insights.length; i += BATCH_SIZE) {
      const batch = insights.slice(i, i + BATCH_SIZE);

      // UPSERT each record in the batch
      await Promise.all(
        batch.map(async (insight) => {
          try {
            // ✅ BUILD insight_key for this record
            const insightKey = buildInsightKey(insight);


            // Inject insight_key into payload
            const insightWithKey = {
              ...insight,
              insight_key: insightKey
            };

            // 🔍 Step 1: Check if record exists by insight_key (UNIQUE constraint)
            const whereClause = encodeURIComponent(`(insight_key,eq,${insightKey})`);
            const checkUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO)}?where=${whereClause}&limit=1`;



            const checkResponse = await fetch(checkUrl, {
              method: 'GET',
              headers: await getNocoDBHeaders(),
            });

            if (!checkResponse.ok) {
              throw new Error(`Check failed: ${checkResponse.status}`);
            }

            const checkData: NocoDBListResponse = await checkResponse.json();
            const existingRecord = checkData.list?.[0]; // insight_key is UNIQUE, so max 1 result

            if (existingRecord) {

            } else {

            }

            // 🔄 Step 2: UPDATE if exists, INSERT if not
            if (existingRecord && existingRecord.Id) {
              // UPDATE existing record - ONLY update metrics that changed


              // Build metrics object from whitelist
              const metricsRaw: Record<string, any> = {};
              for (const col of METRIC_COLUMNS) {
                if (col === 'synced_at') {
                  metricsRaw[col] = new Date().toISOString();
                } else if (col in insight) {
                  metricsRaw[col] = (insight as any)[col];
                }
              }

              // Filter null/undefined
              const metricsFiltered = Object.fromEntries(
                Object.entries(metricsRaw).filter(([_, value]) => value !== null && value !== undefined)
              );

              // Compare with existing record - only keep changed values
              const changedOnly: Record<string, any> = {};
              for (const [key, newValue] of Object.entries(metricsFiltered)) {
                const oldValue = (existingRecord as any)[key];
                if (oldValue !== newValue) {
                  changedOnly[key] = newValue;
                }
              }



              // Skip update if no changes
              if (Object.keys(changedOnly).length === 0) {

                skippedCount++;
              } else {
                // PATCH to /records with Id in body (NOT in URL)
                const updateUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO);
                const payload = {
                  Id: existingRecord.Id,
                  ...changedOnly
                };



                let updateAttempt = 0;
                let updateSuccess = false;

                while (updateAttempt < 3 && !updateSuccess) {
                  updateAttempt++;

                  const updateResponse = await fetch(updateUrl, {
                    method: 'PATCH',
                    headers: await getNocoDBHeaders(),
                    body: JSON.stringify(payload),
                  });

                  if (updateResponse.ok && (updateResponse.status === 200 || updateResponse.status === 204)) {
                    const responseData = await updateResponse.json().catch(() => null);



                    updatedCount++;
                    updateSuccess = true;


                  } else if (updateResponse.status === 404) {
                    // Record might have been deleted
                    const errorText = await updateResponse.text();
                    console.warn(`⚠️ 404 on PATCH attempt ${updateAttempt}:`, {
                      Id: existingRecord.Id,
                      updateUrl,
                      error: errorText
                    });

                    if (updateAttempt < 3) {

                      await new Promise(resolve => setTimeout(resolve, 500));
                    } else {
                      console.error(`❌ PATCH failed after ${updateAttempt} attempts - Trying PUT fallback...`);

                      // Fallback to PUT
                      const putResponse = await fetch(updateUrl, {
                        method: 'PUT',
                        headers: await getNocoDBHeaders(),
                        body: JSON.stringify(payload)
                      });

                      if (putResponse.ok) {

                        updatedCount++;
                        updateSuccess = true;
                      } else {
                        throw new Error(`Update failed: Record not found after ${updateAttempt} attempts and PUT fallback failed`);
                      }
                    }
                  } else {
                    // Other errors
                    const errorText = await updateResponse.text();
                    const responseBody = await updateResponse.json().catch(() => null);

                    console.error(`❌ Failed to update insight ID ${existingRecord.Id} (attempt ${updateAttempt}):`, {
                      status: updateResponse.status,
                      error: errorText,
                      body: responseBody,
                      updateUrl,
                      payload_sample: Object.keys(changedOnly).slice(0, 3)
                    });

                    throw new Error(`Update failed: ${updateResponse.status} - ${errorText}`);
                  }
                }
              }
            } else {
              // INSERT new record
              const insertUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO);



              const insertResponse = await fetch(insertUrl, {
                method: 'POST',
                headers: await getNocoDBHeaders(),
                body: JSON.stringify(insightWithKey),
              });

              if (!insertResponse.ok) {
                const errorText = await insertResponse.text();
                console.error(`❌ Failed to insert insight:`, {
                  status: insertResponse.status,
                  error: errorText,
                  insight: {
                    level: insight.level,
                    campaign_id: insight.campaign_id,
                    adset_id: insight.adset_id,
                    ad_id: insight.ad_id,
                    date_start: insight.date_start,
                    results_messaging_replied_7d: insight.results_messaging_replied_7d
                  },
                  cost_per_fields: {
                    cost_per_started_7d: insight.cost_per_started_7d,
                    cost_per_total_messaging_connection: insight.cost_per_total_messaging_connection,
                    cost_per_link_click: insight.cost_per_link_click,
                    cost_per_messaging_welcome_message_view: insight.cost_per_messaging_welcome_message_view,
                    cost_per_post_engagement: insight.cost_per_post_engagement,
                    cost_per_post_interaction_gross: insight.cost_per_post_interaction_gross,
                    cost_per_messaging_first_reply: insight.cost_per_messaging_first_reply,
                    cost_per_video_view: insight.cost_per_video_view,
                    cost_per_post_reaction: insight.cost_per_post_reaction,
                    cost_per_page_engagement: insight.cost_per_page_engagement,
                    cost_per_messaging_user_depth_2: insight.cost_per_messaging_user_depth_2,
                  }
                });
                throw new Error(`Insert failed: ${insertResponse.status}`);
              }

              insertedCount++;

            }

            upsertedCount++;
          } catch (error) {
            console.error(`❌ Upsert failed for insight:`, {
              level: insight.level,
              campaign_name: insight.campaign_name,
              campaign_id: insight.campaign_id,
              date_start: insight.date_start,
              results_messaging_replied_7d: insight.results_messaging_replied_7d,
              error: error instanceof Error ? error.message : error
            });
            // Don't throw - continue with other records
          }
        })
      );


    }


  } catch (error) {
    console.error('❌ Error bulk upserting insights:', error);
    throw error;
  }
};

/**
 * DEPRECATED: This function violates SYNC_RULES_DOCUMENTATION.md
 * According to the rules:
 * - ✅ Only UPDATE metrics for existing records
 * - ✅ Only CREATE new records for new campaigns
 * - ❌ NEVER DELETE old data (this preserves historical tracking)
 * 
 * This function is kept for reference but should NOT be used.
 */
export const deleteInsightsByDate = async (userId: string, beforeDate: string): Promise<void> => {
  try {
    // NocoDB không hỗ trợ date comparison, load tất cả và xóa theo ID
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO)}?where=${whereClause}&limit=10000`;



    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status}`);
    }

    const data: NocoDBListResponse = await response.json();

    // Filter records that are before the date
    const toDelete = data.list.filter(record =>
      record.date_start && record.date_start < beforeDate
    );



    // Delete each record using NocoDB v2 format
    await Promise.all(
      toDelete.map(async (record) => {
        if (record.Id) {
          // ✅ NocoDB v2: DELETE using /records/{Id} endpoint
          const deleteUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO, String(record.Id))}`;
          await fetch(deleteUrl, {
            method: 'DELETE',
            headers: await getNocoDBHeaders(),
          });
        }
      })
    );


  } catch (error) {
    console.error('Error deleting old insights:', error);
    throw error;
  }
};

/**
 * Delete ALL insights for a user (when switching ad accounts)
 * This is useful when user switches to a different ad account to prevent data mixing
 */
export const deleteAllInsightsByUserId = async (userId: string): Promise<void> => {
  try {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO)}?where=${whereClause}&limit=10000`;



    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status}`);
    }

    const data: NocoDBListResponse = await response.json();
    const totalRecords = data.list?.length || 0;



    if (totalRecords === 0) {

      return;
    }

    // Delete each record in batches to avoid overwhelming the API
    const BATCH_SIZE = 50;
    for (let i = 0; i < data.list.length; i += BATCH_SIZE) {
      const batch = data.list.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (record) => {
          if (record.Id) {
            // ✅ NocoDB v2: DELETE using /records/{Id} endpoint
            const deleteUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO, String(record.Id))}`;
            await fetch(deleteUrl, {
              method: 'DELETE',
              headers: await getNocoDBHeaders(),
            });
          }
        })
      );


    }


  } catch (error) {
    console.error('Error deleting all insights:', error);
    throw error;
  }
};

/**
 * Delete today's insights for a specific user and account
 * Used by sync functions to implement DELETE-then-INSERT strategy
 */
export const deleteTodayInsights = async (userId: string, accountId: string, date: string): Promise<void> => {
  try {
    const whereClause = encodeURIComponent(
      `(user_id,eq,${userId})~and(account_id,eq,${accountId})~and(date_start,eq,${date})`
    );
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO)}?where=${whereClause}&limit=10000`;



    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status}`);
    }

    const data: NocoDBListResponse = await response.json();
    const recordsToDelete = data.list || [];



    if (recordsToDelete.length === 0) {

      return;
    }

    // Delete each record using /records/{Id}
    await Promise.all(
      recordsToDelete.map(async (record) => {
        if (record.Id) {
          const deleteUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO, String(record.Id))}`;
          await fetch(deleteUrl, {
            method: 'DELETE',
            headers: await getNocoDBHeaders(),
          });
        }
      })
    );


  } catch (error) {
    console.error('Error deleting today insights:', error);
    throw error;
  }
};
