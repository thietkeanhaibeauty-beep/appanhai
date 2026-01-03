import { supabase } from '@/integrations/supabase/client';
import type { ParsedCampaignData, QuickPostTokens, QuickPostResult } from '../types';

/**
 * Parse quick post input using AI
 */
export async function parseQuickPost(
  input: string,
  tokens: QuickPostTokens,
  userId: string
): Promise<ParsedCampaignData> {

  // ✅ Timeout protection (30s)
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('⏱️ Edge function timeout sau 30 giây. Vui lòng thử lại.')), 30000)
  );

  const apiPromise = supabase.functions.invoke('parse-campaign-with-template', {
    body: {
      text: input,
      userId: userId,
    },
  });

  const { data, error } = await Promise.race([apiPromise, timeoutPromise]) as any;

  if (error) throw new Error(error.message || 'Failed to parse campaign');

  // ✅ Check for INSUFFICIENT_BALANCE error
  if (data?.error === 'INSUFFICIENT_BALANCE') {
    throw new Error(data.message || '❌ Số dư coin không đủ! Vui lòng nạp thêm coin để sử dụng AI.');
  }

  // ✅ Check data.success like old code
  if (!data?.success) {
    throw new Error(data?.message || data?.error || 'Edge function không trả về dữ liệu hợp lệ');
  }

  const rawData = data.data;
  if (!rawData) throw new Error('No parsed data returned');


  // ✅ Transform from edge function format → ParsedCampaignData format
  const result: ParsedCampaignData = {
    campaignType: rawData.campaignType || 'post',
    name: rawData.campaignName,
    objective: rawData.campaignType === 'message' ? 'CONVERSATIONS' : 'POST_ENGAGEMENT',
    age: rawData.ageMin && rawData.ageMax ? { min: rawData.ageMin, max: rawData.ageMax } : undefined,
    gender: rawData.gender,
    location: rawData.resolvedLocation ? [rawData.resolvedLocation] : undefined,
    locationType: rawData.locationType,
    latitude: rawData.latitude,
    longitude: rawData.longitude,
    radiusKm: rawData.radiusKm,
    // ✅ FIX: Handle interests safely - only accept arrays
    interests: Array.isArray(rawData.resolvedInterests) && rawData.resolvedInterests.length > 0
      ? rawData.resolvedInterests
      : undefined,
    budget: rawData.budget,
    postUrl: rawData.postUrl,
    resolvedPostId: rawData.resolvedPost?.fullPostId,
    pageId: rawData.resolvedPost?.pageId,
    // NEW: Lifetime budget fields (lowercase to match UI)
    budgetType: rawData.budgetType === 'lifetime' ? 'lifetime' : 'daily',
    lifetimeBudget: rawData.lifetimeBudget || (rawData.budgetType === 'lifetime' ? rawData.budget : undefined),
    startTime: rawData.startTime,
    endTime: rawData.endTime,
    enableSchedule: rawData.enableSchedule || false,
    scheduleSlots: Array.isArray(rawData.scheduleSlots) ? rawData.scheduleSlots : undefined,
    // ⭐ Message Ads fields (from template)
    headline: rawData.headline,
    greetingTemplate: rawData.greetingTemplate,
    frequentQuestions: Array.isArray(rawData.frequentQuestions) ? rawData.frequentQuestions : undefined,
    // Content for message ads (can be string or object)
    content: rawData.content ? (typeof rawData.content === 'string' ? { message: rawData.content, title: '', greeting: '' } : rawData.content) : undefined,
  };

  // ✅ Dispatch event to refresh balance in sidebar
  window.dispatchEvent(new Event('balance-updated'));

  return result;
}

/**
 * Validate Facebook post URL and extract post ID
 * @param postUrl - Facebook post URL to validate
 * @param pageId - Page ID from frontend (SettingsModal)
 */
export async function validatePost(
  postUrl: string,
  pageId: string,
  adsToken?: string // ✅ ADDED: Accept adsToken
): Promise<{ pageId: string; postId: string; resolvedPostId: string }> {

  const { data, error } = await supabase.functions.invoke('validate-facebook-post', {
    body: { postUrl, adsToken }, // ✅ Pass to Edge Function
  });

  if (error) throw new Error(error.message || 'Failed to validate post');
  if (!data?.success) throw new Error(data?.error || 'Post validation failed');

  return {
    pageId: pageId,
    postId: data.postId,
    resolvedPostId: `${pageId}_${data.postId}`,
  };
}

/**
 * Build targeting object from parsed data
 * ✅ Validates min radius for cities (≥ 17km)
 * ✅ Supports custom_audiences injection
 */
export function buildTargetingObject(
  parsed: ParsedCampaignData,
  customAudienceIds?: string[]
): any {

  const targeting: any = {
    age_min: parsed.age?.min || 18,
    age_max: parsed.age?.max || 65,
    genders: parsed.gender === 'all' ? undefined : [parsed.gender === 'male' ? 1 : 2],
  };

  // ✅ Priority 1: Coordinate-based targeting (only need lat/lng, radius has default)
  if (parsed.latitude && parsed.longitude) {
    targeting.geo_locations = {
      custom_locations: [{
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        radius: parsed.radiusKm ?? 10, // Default 10km if not provided
        distance_unit: 'kilometer'
      }]
    };
  }
  // ✅ Priority 2: City/Country targeting
  else if (parsed.location && parsed.location.length > 0) {
    const loc: any = parsed.location[0];

    // 📍 Heuristic: treat coordinate-like locations as custom_locations
    const coordFromKey = typeof loc.key === 'string' && loc.key.includes(',') ? loc.key : undefined;
    const coordFromName = typeof loc.name === 'string' && /-?\d+\.\d+\s*,\s*-?\d+\.\d+/.test(loc.name) ? loc.name : undefined;
    const coordStr = coordFromKey || coordFromName;

    if (loc.type === 'coordinates' || coordStr) {
      const [latStr, lngStr] = (coordStr || '').replace(/\s+/g, '').split(',');
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        targeting.geo_locations = {
          custom_locations: [{
            latitude: lat,
            longitude: lng,
            radius: parsed.radiusKm ?? loc.radius ?? 10,
            distance_unit: 'kilometer'
          }]
        };
      }
    } else {
      targeting.geo_locations = {};
      if (loc.type === 'city') {
        targeting.geo_locations.cities = [{
          key: loc.key,
          name: loc.name,
          radius: loc.radius ?? 17,
          distance_unit: loc.distance_unit || 'kilometer'
        }];
      } else if (loc.type === 'country') {
        targeting.geo_locations.countries = [loc.key];
      }
    }
  }

  // ✅ Fix interests - must be in flexible_spec, not direct targeting
  // ✅ Add validation: must be array with length > 0
  if (parsed.interests && Array.isArray(parsed.interests) && parsed.interests.length > 0) {

    targeting.flexible_spec = [{
      interests: parsed.interests.map(interest => ({
        id: interest.id,
        name: interest.name
      }))
    }];
  } else {
    // Note: No valid interests array found
  }

  // ✅ NEW: Inject custom_audiences if provided
  if (customAudienceIds && customAudienceIds.length > 0) {
    targeting.custom_audiences = customAudienceIds.map(id => ({ id }));
  }

  return targeting;
}

/**
 * Validate campaign data before creation
 */
function validateCampaignData(data: ParsedCampaignData, tokens: QuickPostTokens): void {
  if (!data.name) throw new Error('Campaign name is required');
  if (!data.budget || data.budget < 1000) throw new Error('Budget must be at least 1,000 VND/day');
  if (!data.age || data.age.min < 13 || data.age.max > 65) throw new Error('Age range must be 13-65');

  // ✅ Validate location - either city/country OR coordinates (sync with builder)
  const hasCoordinateLocation = Boolean(data.latitude && data.longitude);
  const hasCityCountryLocation = data.location && data.location.length > 0;

  if (!hasCoordinateLocation && !hasCityCountryLocation) {
    throw new Error('Location is required (either city/country or coordinates)');
  }

  // Validate city radius (min 17km for cities) - only if provided
  if (hasCityCountryLocation) {
    const loc = data.location![0];
    if (loc.type === 'city' && loc.radius !== undefined && loc.radius < 17) {
      throw new Error('City targeting requires minimum 17km radius');
    }
  }

  // Validate coordinate radius (1-80km) - only if provided
  if (hasCoordinateLocation && data.radiusKm !== undefined) {
    if (data.radiusKm < 1 || data.radiusKm > 80) {
      throw new Error('Coordinate radius must be between 1-80km');
    }
  }

  if (!tokens.adsToken || !tokens.pageToken || !tokens.adAccountId || !tokens.pageId) {
    throw new Error('Missing required tokens');
  }
}

/**
 * Create Facebook campaign
 */
export async function createCampaignStep(
  name: string,
  adsToken: string,
  adAccountId: string,
  objective: string = 'OUTCOME_ENGAGEMENT'
): Promise<{ campaignId: string }> {

  const { data, error } = await supabase.functions.invoke('create-fb-campaign-step', {
    body: {
      campaignName: name,
      objective,
      adsToken,
      adAccountId,
    },
  });

  if (error) throw new Error(error.message || 'Failed to create campaign');
  if (!data?.campaignId) throw new Error('No campaign ID returned');

  return { campaignId: data.campaignId };
}

/**
 * Create Facebook ad set
 * @param lifetimeOptions - Optional lifetime budget configuration
 * @param customAudienceIds - Optional custom audience IDs for targeting
 */
export async function createAdSetStep(
  campaignId: string,
  campaignName: string,
  dailyBudget: number,
  targeting: any,
  tokens: QuickPostTokens,
  optimizationGoal: string = 'POST_ENGAGEMENT',
  lifetimeOptions?: {
    budgetType?: 'daily' | 'lifetime';
    lifetimeBudget?: number;
    startTime?: string;
    endTime?: string;
    adsetSchedule?: any[];
  },
  customAudienceIds?: string[]  // ✅ NEW: Custom audience IDs
): Promise<{ adSetId: string }> {

  const promotedObject: any = { page_id: tokens.pageId };

  // Build request body
  const requestBody: any = {
    campaignId,
    adSetName: campaignName,
    targeting: JSON.stringify(targeting),
    optimizationGoal,
    billingEvent: 'IMPRESSIONS',
    bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
    promotedObject,
    adsToken: tokens.adsToken,
    adAccountId: tokens.adAccountId,
    currency: 'VND',
  };

  // ✅ NEW: Pass customAudienceIds to Edge Function
  if (customAudienceIds && customAudienceIds.length > 0) {
    requestBody.customAudienceIds = customAudienceIds;
  }

  // Conditionally add budget based on type
  if (lifetimeOptions?.budgetType === 'lifetime' && lifetimeOptions.lifetimeBudget) {
    requestBody.budgetType = 'LIFETIME';
    requestBody.lifetimeBudget = lifetimeOptions.lifetimeBudget;
    requestBody.startTime = lifetimeOptions.startTime;
    requestBody.endTime = lifetimeOptions.endTime;
    requestBody.adsetSchedule = lifetimeOptions.adsetSchedule;
  } else {
    requestBody.budgetType = 'DAILY';
    requestBody.dailyBudget = dailyBudget;
  }

  const { data, error } = await supabase.functions.invoke('create-fb-adset-step', {
    body: requestBody,
  });

  if (error) throw new Error(error.message || 'Failed to create ad set');
  if (!data?.adSetId) throw new Error('No ad set ID returned');

  return { adSetId: data.adSetId };
}

/**
 * Create Facebook ad
 */
export async function createAdStep(
  adSetId: string,
  campaignName: string,
  resolvedPostId: string,
  tokens: QuickPostTokens
): Promise<{ adId: string; creativeId: string }> {

  const body = {
    adSetId,
    adName: campaignName,
    resolvedPostId,
    pageId: tokens.pageId,
    adsToken: tokens.adsToken,
    pageToken: tokens.pageToken,
    adAccountId: tokens.adAccountId,
  };

  const { data, error } = await supabase.functions.invoke('create-fb-ad-step', {
    body: body
  });

  // ✅ Handle specific error: Missing CTA button (Now returns 200 OK with success: false)
  if (error || data?.error || data?.success === false) {
    // Correctly extract error message from various formats
    const backendError = data?.error;
    const errorMessage = typeof backendError === 'string'
      ? backendError
      : backendError?.message || data?.message || error?.message || 'Failed to create ad';

    // Check for specific CTA error
    if (errorMessage === 'MISSING_CTA_BUTTON' || errorMessage.includes('nút gửi tin nhắn')) {
      throw new Error('Bạn cần bổ sung thêm nút gửi tin nhắn vào bài viết mới tạo được');
    }

    throw new Error(errorMessage);
  }

  if (!data?.adId) throw new Error('No ad ID returned');

  return { adId: data.adId, creativeId: data.creativeId };
}

/**
 * Complete Quick Post flow: Campaign → AdSet → Ad
 */
export async function createQuickPost(
  parsed: ParsedCampaignData,
  tokens: QuickPostTokens
): Promise<QuickPostResult> {
  // Validate first
  validateCampaignData(parsed, tokens);

  // Build targeting
  const targeting = buildTargetingObject(parsed);

  // Step 1: Create Campaign
  const campaign = await createCampaignStep(
    parsed.name,
    tokens.adsToken,
    tokens.adAccountId,
    'OUTCOME_ENGAGEMENT'
  );

  // Step 2: Create AdSet
  const adset = await createAdSetStep(
    campaign.campaignId,
    parsed.name,
    parsed.budget!,
    targeting,
    tokens,
    parsed.objective === 'CONVERSATIONS' ? 'CONVERSATIONS' : 'POST_ENGAGEMENT'
  );

  // Step 3: Create Ad
  const ad = await createAdStep(
    adset.adSetId,
    parsed.name,
    parsed.resolvedPostId!,
    tokens
  );

  return {
    campaignId: campaign.campaignId,
    adSetId: adset.adSetId,
    adId: ad.adId
  };
}
