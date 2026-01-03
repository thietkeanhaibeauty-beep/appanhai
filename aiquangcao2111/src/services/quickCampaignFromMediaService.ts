/**
 * Service để tạo Campaign Message mới từ Media upload
 * Dùng cho AI Chat flow
 */

import * as quickCreativeFacebookService from './quickCreativeFacebookService';
import type { Interest } from './quickCreativeFacebookService';

export interface CreativeMediaData {
  type: 'image' | 'video';
  hash?: string;      // imageHash cho image
  id?: string;        // videoId cho video
  thumbnailUrl?: string; // thumbnail cho video
}

export interface CreativeCampaignData {
  campaignName: string;
  budget: number;
  ageMin: number;
  ageMax: number;
  gender: 'all' | 'male' | 'female';
  locations: string[];
  locationRadius?: number | null;
  interests: Interest[];
  adContent: string;
  adHeadline: string;
  greetingText?: string;
  iceBreakerQuestions?: string[];
}

export interface CreativeCampaignTokens {
  adsToken: string;
  pageToken: string;
  adAccountId: string;
  pageId: string;
}

export interface CreatedIds {
  campaignId: string;
  adSetId: string;
  creativeId: string;
  adId: string;
  campaignName: string;
}

export interface CreativeCampaignCallbacks {
  onLog?: (message: string) => void;
  onProgress?: (step: number, total: number, message: string) => void;
  onError?: (error: string) => void;
  onSuccess?: (ids: CreatedIds) => void;
}

/**
 * Parse location string thành format Facebook
 * Hỗ trợ: tọa độ (lat, lng), tên thành phố, hoặc fallback VN
 */
async function parseLocationToGeoTarget(
  locations: string[],
  locationRadius: number | null | undefined,
  adsToken: string
): Promise<
  | { countries: string[] }
  | { custom_locations: Array<{
      latitude: number;
      longitude: number;
      radius: number;
      distance_unit: string;
    }> }
  | { cities: Array<{ key: string; radius: number; distance_unit: string }>; location_types: string[] }
> {
  // CASE 1: Không có location → Fallback toàn VN
  if (!locations || locations.length === 0) {
    return { countries: ['VN'] };
  }

  const firstLocation = locations[0].trim();

  // CASE 2: Quốc gia Việt Nam
  if (/^(việt nam|vietnam|vn)$/i.test(firstLocation)) {
    return { countries: ['VN'] };
  }

  // CASE 3: Phát hiện TỌA ĐỘ (lat, lng)
  const isCoordinate = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(firstLocation);
  if (isCoordinate) {
    const [lat, lng] = firstLocation.split(',').map((s) => parseFloat(s.trim()));

    // Normalize radius string → number
    const normalizedRadius =
      typeof locationRadius === 'string' ? parseFloat(locationRadius) : locationRadius;

    // DẠNG 3: Tọa độ CẦN radius >= 1km
    if (!normalizedRadius || normalizedRadius < 1) {
      throw new Error('Tọa độ yêu cầu bán kính tối thiểu 1km. Vui lòng nhập số km.');
    }

    return {
      custom_locations: [
        {
          latitude: lat,
          longitude: lng,
          radius: normalizedRadius,
          distance_unit: 'kilometer',
        },
      ],
    };
  }

  // CASE 4: Tên thành phố/địa điểm 
  // DẠNG 2: Thành phố CẦN radius >= 17km
  const normalizedRadius =
    typeof locationRadius === 'string' ? parseFloat(locationRadius) : locationRadius;
    
  if (!normalizedRadius || normalizedRadius < 17) {
    throw new Error('Thành phố yêu cầu bán kính tối thiểu 17km. Vui lòng nhập số km.');
  }
  
  // Search Facebook Location API để lấy city key
  try {
    const locationResults = await quickCreativeFacebookService.searchLocations(
      firstLocation,
      adsToken
    );

    if (locationResults.length > 0) {
      return {
        cities: [{
          key: locationResults[0].key,
          radius: normalizedRadius,
          distance_unit: 'kilometer'
        }],
        location_types: ['home']
      };
    }
  } catch (error) {
    console.error('Failed to search location:', error);
  }
  
  // Nếu không tìm thấy → fallback VN
  return { countries: ['VN'] };
}

/**
 * Tạo Campaign Message từ media đã upload
 */
export async function createCampaignFromMedia(
  campaignData: CreativeCampaignData,
  mediaData: CreativeMediaData,
  tokens: CreativeCampaignTokens,
  options: {
    autoActivate?: boolean;
    callbacks?: CreativeCampaignCallbacks;
  } = {}
): Promise<CreatedIds> {
  const { autoActivate = false, callbacks = {} } = options;
  const { onLog, onProgress, onError, onSuccess } = callbacks;

  try {
    onLog?.('🚀 Đang tạo Campaign Message...');

    // Convert gender
    const genders = 
      campaignData.gender === 'male' ? [1] : 
      campaignData.gender === 'female' ? [2] : 
      undefined;

    // Parse locations
    const geoLocations = await parseLocationToGeoTarget(
      campaignData.locations,
      campaignData.locationRadius,
      tokens.adsToken
    );
    
    onLog?.(`📍 Targeting: ${JSON.stringify(geoLocations)}`);

    // STEP 1: Create Campaign
    onProgress?.(1, 3, 'Đang tạo Campaign...');
    onLog?.('📝 Step 1/3: Tạo Campaign...');

    const campaignId = await quickCreativeFacebookService.createCampaign(
      tokens.adAccountId,
      tokens.adsToken,
      campaignData.campaignName,
      'OUTCOME_ENGAGEMENT'
    );

    onLog?.(`✅ Campaign tạo thành công! ID: ${campaignId}`);

    // STEP 2: Create Ad Set
    onProgress?.(2, 3, 'Đang tạo Ad Set...');
    onLog?.('📝 Step 2/3: Tạo Ad Set...');

    const adSetId = await quickCreativeFacebookService.createAdSet(
      tokens.adAccountId,
      tokens.adsToken,
      {
        campaignId: campaignId,
        name: `${campaignData.campaignName} - Ad Set`,
        dailyBudget: campaignData.budget,
        pageId: tokens.pageId, // ✅ THÊM pageId cho promoted_object
        targeting: {
          geoLocations,
          ageMin: campaignData.ageMin,
          ageMax: campaignData.ageMax,
          genders,
          interests: campaignData.interests,
        },
      }
    );

    onLog?.(`✅ Ad Set tạo thành công! ID: ${adSetId}`);

    // STEP 3: Create Creative + Ad
    onProgress?.(3, 3, 'Đang tạo Creative và Ad...');
    onLog?.('📝 Step 3/3: Tạo Creative và Ad...');

    // Build message template nếu có greeting hoặc ice breakers
    let messageTemplateData = undefined;
    if (campaignData.greetingText || campaignData.iceBreakerQuestions) {
      const iceBreakers = campaignData.iceBreakerQuestions
        ? campaignData.iceBreakerQuestions.slice(0, 4).map((q) => ({
            title: q,
            response: q,
          }))
        : [];

      messageTemplateData = {
        page_welcome_message: {
          type: 'VISUAL_EDITOR',
          version: 1,
          landing_screen_type: 'NATIVE',
          media_type: 'IMAGE',
          text_format: {
            customer_action_type: 'SEND_MESSAGE',
            message: {
              ice_breakers: iceBreakers.length > 0 ? iceBreakers : undefined,
              quick_replies: [],
              text: campaignData.greetingText || '',
            },
          },
          user_edit: false,
          surface: 'MESSENGER_ANDROID',
        },
      };
    }

    // Tạo Creative (image hoặc video)
    let creativeId: string;

    if (mediaData.type === 'image') {
      creativeId = await quickCreativeFacebookService.createAdCreativeForImage(
        tokens.adAccountId,
        tokens.adsToken,
        {
          pageId: tokens.pageId,
          name: campaignData.adHeadline,
          message: campaignData.adContent,
          imageHash: mediaData.hash!,
          messageTemplateData,
        }
      );
    } else {
      // Video
      creativeId = await quickCreativeFacebookService.createAdCreativeForVideo(
        tokens.adAccountId,
        tokens.adsToken,
        {
          pageId: tokens.pageId,
          title: campaignData.adHeadline,
          message: campaignData.adContent,
          videoId: mediaData.id!,
          thumbnailUrl: mediaData.thumbnailUrl || '',
          messageTemplateData,
        }
      );
    }

    onLog?.(`✅ Creative tạo thành công! ID: ${creativeId}`);

    // Tạo Ad
    const adId = await quickCreativeFacebookService.createAd(
      tokens.adAccountId,
      tokens.adsToken,
      {
        adSetId: adSetId,
        name: `${campaignData.campaignName} - Ad`,
        creativeId: creativeId,
      }
    );

    onLog?.(`✅ Ad tạo thành công! ID: ${adId}`);

    // Tạo object kết quả
    const result = {
      campaignId,
      adSetId,
      creativeId,
      adId,
      campaignName: campaignData.campaignName,
    };

    onLog?.('🎉 Tất cả các bước hoàn thành!');
    onLog?.(`• Campaign ID: ${campaignId}`);
    onLog?.(`• Ad Set ID: ${adSetId}`);
    onLog?.(`• Creative ID: ${creativeId}`);
    onLog?.(`• Ad ID: ${adId}`);

    // Auto-activate nếu cần (hiện tại không dùng cho AI Chat)
    if (autoActivate) {
      onLog?.('🚀 Đang kích hoạt Campaign...');
      // TODO: Implement activation logic
    }

    const ids: CreatedIds = {
      campaignId: result.campaignId,
      adSetId: result.adSetId,
      creativeId: result.creativeId,
      adId: result.adId,
      campaignName: result.campaignName,
    };

    onSuccess?.(ids);
    return ids;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Lỗi không xác định';
    onLog?.(`❌ Lỗi: ${errorMsg}`);
    onError?.(errorMsg);
    throw error;
  }
}
