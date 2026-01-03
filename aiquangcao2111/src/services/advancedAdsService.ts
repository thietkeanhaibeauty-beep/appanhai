import { fbProxy } from './facebookProxyService';

export interface CloneCampaignParams {
  campaignId: string;
  newName: string;
  deepCopy?: boolean;
  statusOption?: 'ACTIVE' | 'PAUSED' | 'INHERITED';
  renameStrategy?: 'DEEP_RENAME' | 'ONLY_TOP_LEVEL_RENAME' | 'NO_RENAME';
  startTime?: string;
  endTime?: string;
  accessToken: string;
  adAccountId: string;
}

export interface CloneAdSetParams {
  adsetId: string;
  newName: string;
  targetCampaignId?: string;
  deepCopy?: boolean;
  statusOption?: 'ACTIVE' | 'PAUSED' | 'INHERITED';
  accessToken: string;
  adAccountId: string;
}

export interface CloneAdParams {
  adId: string;
  newName: string;
  targetAdsetId?: string;
  statusOption?: 'ACTIVE' | 'PAUSED';
  accessToken: string;
  adAccountId: string;
}

export interface CloneResult {
  campaignId?: string;
  adsetIds?: string[];
  adIds?: string[];
  success: boolean;
  message?: string;
  details?: {
    campaigns: Array<{ id: string; source_id: string }>;
    adsets: Array<{ id: string; source_id: string }>;
    ads: Array<{ id: string; source_id: string }>;
  };
}

export interface AsyncJobStatus {
  id: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
  result?: any;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function pollAsyncStatus(
  asyncJobId: string,
  accessToken: string,
  maxRetries: number = 60 // Increased to 120 seconds for deep_copy
): Promise<CloneResult> {


  for (let i = 0; i < maxRetries; i++) {
    await sleep(2000); // Wait 2 seconds between polls


    const data = await fbProxy.request<AsyncJobStatus>({
      accessToken,
      endpoint: asyncJobId,
      params: { fields: 'status,result' }
    });

    // Check custom error from proxy or logic? Proxy throws if upstream error.
    // fbProxy returns parsed JSON.
    /*
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${asyncJobId}?fields=status,result&access_token=${accessToken}`
    );
    */

    /*
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[pollAsyncStatus] Failed to poll:`, errorText);
      throw new Error(`Failed to poll async job: ${response.statusText}`);
    }

    const data: AsyncJobStatus = await response.json();
    */


    if (data.status === 'COMPLETED') {


      let result;
      try {
        result = typeof data.result === 'string'
          ? JSON.parse(data.result)
          : data.result;

      } catch (error) {
        console.error(`[pollAsyncStatus] Failed to parse result:`, error);
        throw new Error(`Failed to parse clone result: ${error}`);
      }

      // Parse ad_object_ids for detailed breakdown
      const adObjectIds = result.ad_object_ids || [];
      const campaigns = adObjectIds
        .filter((o: any) => o.ad_object_type === 'CAMPAIGN')
        .map((o: any) => ({ id: o.copied_id, source_id: o.source_id }));
      const adsets = adObjectIds
        .filter((o: any) => o.ad_object_type === 'ADSET')
        .map((o: any) => ({ id: o.copied_id, source_id: o.source_id }));
      const ads = adObjectIds
        .filter((o: any) => o.ad_object_type === 'AD')
        .map((o: any) => ({ id: o.copied_id, source_id: o.source_id }));



      return {
        success: true,
        campaignId: result.copied_campaign_id || result.id,
        adsetIds: adsets.map((o) => o.id),
        adIds: ads.map((o) => o.id),
        details: { campaigns, adsets, ads }
      };
    }

    if (data.status === 'FAILED') {
      console.error(`[pollAsyncStatus] Job failed:`, data.result);
      throw new Error(`Clone failed: ${JSON.stringify(data.result)}`);
    }

    // Status is IN_PROGRESS, continue polling

  }

  console.error(`[pollAsyncStatus] Timeout after ${maxRetries * 2} seconds`);
  throw new Error(`Timeout: Clone operation took too long (${maxRetries * 2} seconds)`);
}

export async function cloneCampaign(params: CloneCampaignParams): Promise<CloneResult> {


  try {

    // Step 1: Check deep copy limits (warn if > 51 ads)
    if (params.deepCopy) {
      const adsets = await fetchAdSetsForCampaign(params.campaignId, params.accessToken);
      let totalAds = 0;
      for (const adset of adsets) {
        const ads = await fetchAdsForAdSet(adset.id, params.accessToken).catch(() => []);
        totalAds += ads.length;
      }

      if (totalAds > 51) {
        console.warn(`[cloneCampaign] Campaign has ${totalAds} ads (>51 limit). Clone may fail.`);
        return {
          success: false,
          message: `Campaign có ${totalAds} quảng cáo (vượt giới hạn 51). Có thể clone thất bại. Đề xuất: clone từng ad set riêng lẻ.`
        };
      }
    }

    // Step 2: Build form data with rename_strategy
    const formData = new URLSearchParams({
      name: params.newName,
      deep_copy: (params.deepCopy ?? false).toString(),
      status_option: params.statusOption || 'PAUSED',
      access_token: params.accessToken
    });

    // Add rename_strategy
    const renameStrategy = params.renameStrategy || (params.deepCopy ? 'DEEP_RENAME' : 'ONLY_TOP_LEVEL_RENAME');
    formData.append('rename_strategy', renameStrategy);

    // Add optional time range for deep copy
    if (params.startTime) {
      formData.append('start_time', params.startTime);
    }
    if (params.endTime) {
      formData.append('end_time', params.endTime);
    }



    // Build headers/body for Proxy
    const body: any = {
      name: params.newName,
      deep_copy: params.deepCopy ?? false,
      status_option: params.statusOption || 'PAUSED',
      rename_strategy: params.renameStrategy || (params.deepCopy ? 'DEEP_RENAME' : 'ONLY_TOP_LEVEL_RENAME')
    };

    if (params.startTime) body.start_time = params.startTime;
    if (params.endTime) body.end_time = params.endTime;

    const asyncJob = await fbProxy.request<any>({
      accessToken: params.accessToken,
      endpoint: `${params.campaignId}/copies`,
      method: 'POST',
      body
    });

    /*
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${params.campaignId}/copies`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      }
    );
    */



    /*
    if (!response.ok) {
      const error = await response.json();
      console.error(`[cloneCampaign] Facebook API Error:`, error);
      const errorMsg = error.error?.error_user_msg || error.error?.message || 'Failed to clone campaign';
      throw new Error(errorMsg);
    }

    const asyncJob = await response.json();
    */


    // Check if this is an async operation or immediate result
    if (asyncJob.id) {
      // Async operation - need to poll

      const result = await pollAsyncStatus(asyncJob.id, params.accessToken);


      // Step 3: Update campaign name to user's desired name
      if (result.campaignId) {

        try {
          await fbProxy.request({
            accessToken: params.accessToken,
            endpoint: result.campaignId,
            method: 'POST',
            body: { name: params.newName }
          });
        } catch (e) {
          console.warn(`[cloneCampaign] ⚠️ Failed to update campaign name:`, e);
        }

        /*
        const updateResponse = await fetch(
          `https://graph.facebook.com/v21.0/${result.campaignId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              name: params.newName,
              access_token: params.accessToken
            })
          }
        );
        */

        /*
        if (updateResponse.ok) {

        } else {
          console.warn(`[cloneCampaign] ⚠️ Failed to update campaign name, keeping default`);
        }
        */
      }

      return result;
    } else if (asyncJob.copied_campaign_id) {
      // Immediate result (deep_copy=false)


      // Parse the ad_object_ids to get details
      const details = {
        campaigns: [] as Array<{ id: string; source_id: string }>,
        adsets: [] as Array<{ id: string; source_id: string }>,
        ads: [] as Array<{ id: string; source_id: string }>
      };

      if (asyncJob.ad_object_ids && Array.isArray(asyncJob.ad_object_ids)) {
        asyncJob.ad_object_ids.forEach((obj: any) => {
          const item = { id: obj.copied_id, source_id: obj.source_id };

          if (obj.ad_object_type === 'campaign') {
            details.campaigns.push(item);
          } else if (obj.ad_object_type === 'adset') {
            details.adsets.push(item);
          } else if (obj.ad_object_type === 'ad') {
            details.ads.push(item);
          }
        });
      }

      // Step 3: Update campaign name to user's desired name (for immediate result)

      try {
        await fbProxy.request({
          accessToken: params.accessToken,
          endpoint: asyncJob.copied_campaign_id,
          method: 'POST',
          body: { name: params.newName }
        });
      } catch (e) {
        console.warn(`[cloneCampaign] ⚠️ Failed to update campaign name:`, e);
      }

      /*
      const updateResponse = await fetch(
        `https://graph.facebook.com/v21.0/${asyncJob.copied_campaign_id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            name: params.newName,
            access_token: params.accessToken
          })
        }
      );
      */

      /*
      if (updateResponse.ok) {

      } else {
        console.warn(`[cloneCampaign] ⚠️ Failed to update campaign name, keeping default`);
      }
      */

      return {
        success: true,
        campaignId: asyncJob.copied_campaign_id,
        details
      };
    } else {
      throw new Error('Unexpected response format from Facebook API');
    }
  } catch (error) {
    console.error('[cloneCampaign] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Clone campaign + specified number of ad sets + ads
 * Step 1: Clone campaign (without deep_copy)
 * Step 2: Clone specified number of ad sets from original campaign to new campaign
 * Step 3: Clone specified number of ads from each original ad set to new ad set
 */
export async function cloneCampaignWithAdSets(
  params: CloneCampaignParams & {
    adsetQuantity?: number;
    adQuantity?: number;
    onProgress?: (step: string, percent: number) => void;
  }
): Promise<CloneResult> {


  try {
    // Step 1: Clone campaign (shallow copy - no ad sets/ads)
    params.onProgress?.('Bước 1: Đang nhân bản chiến dịch...', 10);

    const campaignResult = await cloneCampaign({
      ...params,
      deepCopy: false // Force shallow copy
    });

    if (!campaignResult.success || !campaignResult.campaignId) {
      throw new Error(campaignResult.message || 'Failed to clone campaign');
    }

    const newCampaignId = campaignResult.campaignId;


    // Step 2: Fetch all ad sets from original campaign
    params.onProgress?.('Bước 2: Đang tải danh sách Nhóm QC gốc...', 20);

    const originalAdSets = await fetchAdSetsForCampaign(params.campaignId, params.accessToken);


    if (originalAdSets.length === 0) {
      console.warn(`[cloneCampaignWithAdSets] ⚠️ Campaign gốc không có ad sets. Chỉ tạo campaign rỗng.`);
      return {
        success: true,
        campaignId: newCampaignId,
        details: {
          campaigns: [{ id: newCampaignId, source_id: params.campaignId }],
          adsets: [],
          ads: []
        },
        message: 'Campaign cloned (original has no ad sets)'
      };
    }

    // Determine how many ad sets to clone
    const adsetsToClone = params.adsetQuantity
      ? originalAdSets.slice(0, params.adsetQuantity)
      : originalAdSets;



    // Step 3: Clone each ad set to new campaign
    const clonedAdSets: Array<{ id: string; source_id: string }> = [];
    const clonedAds: Array<{ id: string; source_id: string }> = [];
    const totalAdSets = adsetsToClone.length;

    for (let i = 0; i < totalAdSets; i++) {
      const originalAdSet = adsetsToClone[i];
      const baseProgress = 20 + ((i / totalAdSets) * 70);

      params.onProgress?.(
        `Bước 3.${i + 1}: Đang nhân bản Nhóm QC "${originalAdSet.name}"...`,
        Math.round(baseProgress)
      );



      // Clone ad set to new campaign
      const adsetResult = await cloneAdSet({
        adsetId: originalAdSet.id,
        newName: originalAdSet.name,
        targetCampaignId: newCampaignId, // 👈 Use new campaign ID
        deepCopy: false,
        statusOption: params.statusOption,
        accessToken: params.accessToken,
        adAccountId: params.adAccountId
      });

      if (!adsetResult.success || !adsetResult.adsetIds || adsetResult.adsetIds.length === 0) {
        console.error(`[cloneCampaignWithAdSets] ❌ Failed to clone ad set ${originalAdSet.id}:`, adsetResult.message);
        continue;
      }

      const newAdSetId = adsetResult.adsetIds[0];
      clonedAdSets.push({
        id: newAdSetId,
        source_id: originalAdSet.id
      });


      // Step 4: Clone ads if requested
      if (params.adQuantity && params.adQuantity > 0) {
        params.onProgress?.(
          `Bước 4.${i + 1}: Đang tải ads từ Nhóm QC gốc...`,
          Math.round(baseProgress + 2)
        );

        const originalAds = await fetchAdsForAdSet(originalAdSet.id, params.accessToken);


        const adsToClone = originalAds.slice(0, params.adQuantity);

        for (let j = 0; j < adsToClone.length; j++) {
          const originalAd = adsToClone[j];

          params.onProgress?.(
            `Bước 4.${i + 1}.${j + 1}: Đang nhân bản Ad "${originalAd.name}"...`,
            Math.round(baseProgress + 3 + (j / adsToClone.length) * 5)
          );



          const adResult = await cloneAd({
            adId: originalAd.id,
            newName: originalAd.name,
            targetAdsetId: newAdSetId, // ensure ad is created under the newly cloned ad set
            statusOption: params.statusOption === 'INHERITED' ? 'PAUSED' : params.statusOption,
            accessToken: params.accessToken,
            adAccountId: params.adAccountId
          });

          if (adResult.success && adResult.adIds && adResult.adIds.length > 0) {
            clonedAds.push({
              id: adResult.adIds[0],
              source_id: originalAd.id
            });

          } else {
            console.error(`[cloneCampaignWithAdSets] ❌ Failed to clone ad ${originalAd.id}:`, adResult.message);
          }

          // Delay to avoid rate limiting
          if (j < adsToClone.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }

      // Delay between ad sets
      if (i < totalAdSets - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    params.onProgress?.('Hoàn thành', 100);



    return {
      success: true,
      campaignId: newCampaignId,
      details: {
        campaigns: [{ id: newCampaignId, source_id: params.campaignId }],
        adsets: clonedAdSets,
        ads: clonedAds
      },
      message: `Successfully cloned campaign with ${clonedAdSets.length} ad sets and ${clonedAds.length} ads`
    };
  } catch (error) {
    console.error('[cloneCampaignWithAdSets] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function cloneAdSet(params: CloneAdSetParams): Promise<CloneResult> {

  try {
    // WORKAROUND: Facebook's /copies endpoint for ad sets is broken due to deprecated fields
    // Solution: Fetch original ad set data and create new one manually

    // Step 1: Fetch original ad set details
    const originalAdSet = await fbProxy.request<any>({
      accessToken: params.accessToken,
      endpoint: params.adsetId,
      params: {
        fields: 'name,campaign_id,billing_event,optimization_goal,bid_strategy,daily_budget,lifetime_budget,start_time,end_time,targeting,status,destination_type,promoted_object'
      }
    });

    // Step 2: Create new ad set with cleaned data
    const targetCampaign = params.targetCampaignId || originalAdSet.campaign_id;

    // Use URLSearchParams to ensure application/x-www-form-urlencoded
    const createParams = new URLSearchParams({
      name: params.newName,
      campaign_id: targetCampaign,
      billing_event: originalAdSet.billing_event || 'IMPRESSIONS',
      optimization_goal: originalAdSet.optimization_goal || 'REACH',
      bid_strategy: originalAdSet.bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
      status: params.statusOption || 'PAUSED', // Default to PAUSED
      access_token: params.accessToken
    });

    // ⭐ FIX: Smart budget + schedule handling to avoid error 1487202
    const now = new Date().getTime();
    let validEndTime = false;
    let validStartTime = false;

    // Check if end_time is valid (in future)
    if (originalAdSet.end_time) {
      const endTime = new Date(originalAdSet.end_time).getTime();
      validEndTime = endTime > now;
    }

    // Check if start_time is valid (in future)  
    if (originalAdSet.start_time) {
      const startTime = new Date(originalAdSet.start_time).getTime();
      validStartTime = startTime > now;
    }

    // Handle budget - prioritize daily_budget (like backup)
    // Facebook API might return both field keys but one with "0" or null

    if (originalAdSet.daily_budget && parseInt(originalAdSet.daily_budget) > 0) {
      createParams.append('daily_budget', originalAdSet.daily_budget);

      // For daily budget, schedule is optional
      if (validEndTime) {
        createParams.append('end_time', originalAdSet.end_time);
      }
      if (validStartTime) {
        createParams.append('start_time', originalAdSet.start_time);
      }

    } else if (originalAdSet.lifetime_budget && parseInt(originalAdSet.lifetime_budget) > 0) {
      // Only use lifetime if daily is not set/valid

      if (validEndTime) {
        createParams.append('lifetime_budget', originalAdSet.lifetime_budget);
        createParams.append('end_time', originalAdSet.end_time);
        if (validStartTime) {
          createParams.append('start_time', originalAdSet.start_time);
        }
      } else {
        // ⭐ Lifetime budget but end_time has passed → convert to daily_budget
        const lifetimeBudget = parseInt(originalAdSet.lifetime_budget);
        const dailyBudget = Math.max(25000, Math.round(lifetimeBudget / 7)); // Min 25k VND
        createParams.append('daily_budget', dailyBudget.toString());
        console.log(`[cloneAdSet] Converting lifetime_budget ${lifetimeBudget} → daily_budget ${dailyBudget} (end_time has passed)`);
      }
    }

    // Add targeting (stringify the object)
    if (originalAdSet.targeting) {
      createParams.append('targeting', JSON.stringify(originalAdSet.targeting));
    }

    // Add destination_type if exists
    if (originalAdSet.destination_type) {
      createParams.append('destination_type', originalAdSet.destination_type);
    }

    // Add promoted_object if exists
    if (originalAdSet.promoted_object) {
      createParams.append('promoted_object', JSON.stringify(originalAdSet.promoted_object));
    }

    const formattedAccountId = params.adAccountId.startsWith('act_')
      ? params.adAccountId
      : `act_${params.adAccountId}`;

    // Build create body
    const createBody: any = {
      name: params.newName,
      campaign_id: targetCampaign,
      billing_event: originalAdSet.billing_event || 'IMPRESSIONS',
      optimization_goal: originalAdSet.optimization_goal || 'REACH',
      bid_strategy: originalAdSet.bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
      status: 'PAUSED'
    };

    // Handle budget
    if (originalAdSet.daily_budget && parseInt(originalAdSet.daily_budget) > 0) {
      createBody.daily_budget = originalAdSet.daily_budget;
      if (validEndTime) createBody.end_time = originalAdSet.end_time;
      if (validStartTime) createBody.start_time = originalAdSet.start_time;
    } else if (originalAdSet.lifetime_budget && parseInt(originalAdSet.lifetime_budget) > 0) {
      if (validEndTime) {
        createBody.lifetime_budget = originalAdSet.lifetime_budget;
        createBody.end_time = originalAdSet.end_time;
        if (validStartTime) createBody.start_time = originalAdSet.start_time;
      } else {
        const lifetimeBudget = parseInt(originalAdSet.lifetime_budget);
        const dailyBudget = Math.max(25000, Math.round(lifetimeBudget / 7));
        createBody.daily_budget = dailyBudget.toString();
      }
    }

    if (originalAdSet.targeting) createBody.targeting = originalAdSet.targeting;
    if (originalAdSet.destination_type) createBody.destination_type = originalAdSet.destination_type;
    if (originalAdSet.promoted_object) createBody.promoted_object = originalAdSet.promoted_object;

    const newAdSet = await fbProxy.request<any>({
      accessToken: params.accessToken,
      endpoint: `${formattedAccountId}/adsets`,
      method: 'POST',
      body: createBody
    });

    // Step 2.5: If user requested ACTIVE, update status after creation
    if (params.statusOption === 'ACTIVE') {
      try {
        await fbProxy.request({
          accessToken: params.accessToken,
          endpoint: newAdSet.id,
          method: 'POST',
          body: { status: 'ACTIVE' }
        });
      } catch (e) {
        console.warn(`[cloneAdSet] ⚠️ Created ad set but failed to activate:`, e);
      }
    }

    // Step 3: Clone all ads if deepCopy is true
    const clonedAds: Array<{ id: string; source_id: string }> = [];

    if (params.deepCopy) {

      const originalAds = await fetchAdsForAdSet(params.adsetId, params.accessToken);

      if (originalAds.length > 0) {
        for (let i = 0; i < originalAds.length; i++) {
          const originalAd = originalAds[i];

          const adResult = await cloneAd({
            adId: originalAd.id,
            newName: originalAd.name,
            targetAdsetId: newAdSet.id,
            statusOption: params.statusOption === 'INHERITED' ? 'PAUSED' : params.statusOption,
            accessToken: params.accessToken,
            adAccountId: params.adAccountId
          });

          if (adResult.success && adResult.adIds && adResult.adIds.length > 0) {
            clonedAds.push({
              id: adResult.adIds[0],
              source_id: originalAd.id
            });

          } else {
            console.error(`[cloneAdSet] ❌ Failed to clone ad ${originalAd.id}:`, adResult.message);
          }

          // Delay to avoid rate limiting
          if (i < originalAds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      } else {
        console.warn(`[cloneAdSet] ⚠️ Ad Set gốc không có ads.`);
      }
    }

    return {
      success: true,
      adsetIds: [newAdSet.id],
      adIds: clonedAds.map(a => a.id),
      details: clonedAds.length > 0 ? {
        campaigns: [],
        adsets: [{ id: newAdSet.id, source_id: params.adsetId }],
        ads: clonedAds
      } : undefined,
      message: params.deepCopy
        ? `Ad set cloned with ${clonedAds.length} ads`
        : 'Ad set cloned successfully'
    };
  } catch (error) {
    console.error('[cloneAdSet] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Clone ad set + specified number of ads
 * Step 1: Clone ad set
 * Step 2: Clone specified number of ads from original ad set to new ad set
 */
export async function cloneAdSetWithAds(
  params: CloneAdSetParams & {
    adQuantity?: number;
    onProgress?: (step: string, percent: number) => void;
  }
): Promise<CloneResult> {


  try {
    // Step 1: Clone Ad Set
    params.onProgress?.('Bước 1: Đang nhân bản Nhóm QC...', 20);

    const adsetResult = await cloneAdSet(params);

    if (!adsetResult.success || !adsetResult.adsetIds || adsetResult.adsetIds.length === 0) {
      throw new Error(adsetResult.message || 'Failed to clone ad set');
    }

    const newAdSetId = adsetResult.adsetIds[0];


    // Step 2: Clone ads if requested
    const clonedAds: Array<{ id: string; source_id: string }> = [];

    if (params.adQuantity && params.adQuantity > 0) {
      params.onProgress?.('Bước 2: Đang tải danh sách Ads gốc...', 30);

      let originalAds: any[] = [];
      try {
        // Add delay before fetching ads to avoid rate limit
        await new Promise(resolve => setTimeout(resolve, 3000));
        originalAds = await fetchAdsForAdSet(params.adsetId, params.accessToken);
      } catch (fetchError: any) {
        // Handle rate limit or other errors gracefully - ad set was already created successfully
        console.warn(`[cloneAdSetWithAds] ⚠️ Failed to fetch original ads (rate limit?):`, fetchError.message);
        return {
          success: true,
          adsetIds: [newAdSetId],
          adIds: [],
          message: `✅ Ad Set nhân bản thành công! (Không thể clone ads do giới hạn API: ${fetchError.message})`
        };
      }


      if (originalAds.length === 0) {
        console.warn(`[cloneAdSetWithAds] ⚠️ Ad Set gốc không có ads. Chỉ tạo Ad Set rỗng.`);
        return {
          success: true,
          adsetIds: [newAdSetId],
          adIds: [],
          message: 'Ad Set cloned (original has no ads)'
        };
      }

      const adsToClone = originalAds.slice(0, params.adQuantity);
      const totalAds = adsToClone.length;

      for (let i = 0; i < totalAds; i++) {
        const originalAd = adsToClone[i];

        params.onProgress?.(
          `Bước 3.${i + 1}: Đang nhân bản Ad "${originalAd.name}"...`,
          Math.round(30 + ((i / totalAds) * 60))
        );



        const adResult = await cloneAd({
          adId: originalAd.id,
          newName: originalAd.name,
          targetAdsetId: newAdSetId,
          statusOption: params.statusOption === 'INHERITED' ? 'PAUSED' : params.statusOption,
          accessToken: params.accessToken,
          adAccountId: params.adAccountId
        });

        if (adResult.success && adResult.adIds && adResult.adIds.length > 0) {
          clonedAds.push({
            id: adResult.adIds[0],
            source_id: originalAd.id
          });

        } else {
          console.error(`[cloneAdSetWithAds] ❌ Failed to clone ad ${originalAd.id}:`, adResult.message);
        }

        // Delay to avoid rate limiting
        if (i < totalAds - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }

    params.onProgress?.('Hoàn thành', 100);



    return {
      success: true,
      adsetIds: [newAdSetId],
      adIds: clonedAds.map(a => a.id),
      details: {
        campaigns: [],
        adsets: [{ id: newAdSetId, source_id: params.adsetId }],
        ads: clonedAds
      },
      message: `Successfully cloned ad set with ${clonedAds.length} ads`
    };
  } catch (error) {
    console.error('[cloneAdSetWithAds] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function cloneAd(params: CloneAdParams): Promise<CloneResult> {


  try {

    // WORKAROUND: Facebook's /copies endpoint for ads is broken due to deprecated Advantage+ creative fields
    // Solution: Fetch original ad data and create new one manually

    // Step 1: Fetch original ad details
    // Step 1: Fetch original ad details
    const originalAd = await fbProxy.request<any>({
      accessToken: params.accessToken,
      endpoint: params.adId,
      params: { fields: 'name,adset_id,status,creative' }
    });

    /*
    const fetchResponse = await fetch(...)
    const originalAd = await fetchResponse.json();
    */


    // Step 2: Determine target ad set
    const targetAdsetId = params.targetAdsetId || originalAd.adset_id;

    // Step 3: Get ad account ID from ad set
    const adsetInfo = await fbProxy.request<any>({
      accessToken: params.accessToken,
      endpoint: targetAdsetId,
      params: { fields: 'account_id' }
    });
    const rawAccountId = adsetInfo.account_id as string;
    const accountId = rawAccountId.startsWith('act_') ? rawAccountId : `act_${rawAccountId}`;


    // Step 4: Create new ad - ALWAYS create as PAUSED first, then activate if needed
    // Facebook rejects creating ads with ACTIVE status directly due to creative review
    const result = await fbProxy.request<any>({
      accessToken: params.accessToken,
      endpoint: `${accountId}/ads`,
      method: 'POST',
      body: {
        name: params.newName,
        adset_id: targetAdsetId,
        status: 'PAUSED',
        creative: originalAd.creative?.id ? { creative_id: originalAd.creative.id } : undefined
      }
    });

    /*
    const createParams = new URLSearchParams({
      name: params.newName,
      adset_id: targetAdsetId,
      status: 'PAUSED', // Always create as PAUSED first
      access_token: params.accessToken
    });

    // Add creative if available
    if (originalAd.creative?.id) {
      createParams.append('creative', JSON.stringify({ creative_id: originalAd.creative.id }));
    }

    const createResponse = await fetch(...)
    */



    /*
    if (!createResponse.ok) {
      const error = await createResponse.json();
      console.error(`[cloneAd] Facebook API Error:`, error);
      const errorMsg = error.error?.error_user_msg || error.error?.message || 'Failed to create ad';
      throw new Error(errorMsg);
    }

    const result = await createResponse.json();
    */

    // Step 5: If user requested ACTIVE, update status after creation
    if (params.statusOption === 'ACTIVE') {
      try {
        await fbProxy.request({
          accessToken: params.accessToken,
          endpoint: result.id,
          method: 'POST',
          body: { status: 'ACTIVE' }
        });
      } catch (e) {
        console.warn(`[cloneAd] ⚠️ Created ad but failed to activate:`, e);
      }
    }

    // Log Ads Manager URL for verification
    const adsManagerUrl = `https://business.facebook.com/adsmanager/manage/ads?act=${accountId.replace('act_', '')}&selected_ad_ids=${result.id}`;

    return {
      success: true,
      adIds: [result.id],
      message: `Successfully cloned ad: ${result.id}`
    };
  } catch (error) {
    console.error('[cloneAd] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export function suggestCloneName(originalName: string): string {
  const timestamp = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit'
  });

  return `${originalName} - Copy ${timestamp}`;
}

export async function fetchCampaignStructure(
  adAccountId: string,
  accessToken: string
) {
  try {
    // Ensure account_id has act_ prefix
    const formattedAccountId = adAccountId.startsWith('act_')
      ? adAccountId
      : `act_${adAccountId}`;

    const data = await fbProxy.request<{ data: any[] }>({
      accessToken,
      endpoint: `${formattedAccountId}/campaigns`,
      params: {
        fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget'
      }
    });

    return data.data || [];
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }
}

export async function fetchAdSetsForCampaign(
  campaignId: string,
  accessToken: string
) {
  try {
    const data = await fbProxy.request<{ data: any[] }>({
      accessToken,
      endpoint: `${campaignId}/adsets`,
      params: {
        fields: 'id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget'
      }
    }).catch(async (error) => {
      console.warn('[fetchAdSetsForCampaign] Failed with full fields, trying fallback...', error);
      // Fallback
      return fbProxy.request<{ data: any[] }>({
        accessToken,
        endpoint: `${campaignId}/adsets`,
        params: { fields: 'id,name,status' }
      });
    });

    return data.data || [];
  } catch (error) {
    console.error('Error fetching ad sets:', error);
    throw error;
  }
}

export async function fetchAdsForAdSet(
  adsetId: string,
  accessToken: string
) {
  try {
    const data = await fbProxy.request<{ data: any[] }>({
      accessToken,
      endpoint: `${adsetId}/ads`,
      params: {
        fields: 'id,name,status,effective_status,adset_id'
      }
    }).catch(async (error) => {
      console.warn('[fetchAdsForAdSet] Failed with full fields, trying fallback...', error);
      // Fallback
      return fbProxy.request<{ data: any[] }>({
        accessToken,
        endpoint: `${adsetId}/ads`,
        params: { fields: 'id,name,status' }
      });
    });

    return data.data || [];
  } catch (error) {
    console.error('Error fetching ads:', error);
    throw error;
  }
}
