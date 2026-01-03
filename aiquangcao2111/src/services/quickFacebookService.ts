// Quick Facebook Service - Wrapper cho việc tạo campaign nhanh
import * as facebookService from './facebook';
import type { Interest } from '@/types';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Tìm kiếm interests từ keywords
export async function searchInterests(
  keyword: string,
  accessToken: string
): Promise<Interest[]> {
  return facebookService.searchTargetingInterests(keyword, accessToken);
}

// Tạo Campaign
export async function createCampaign(
  adAccountId: string,
  accessToken: string,
  params: {
    name: string;
    objective?: string;
    status?: 'PAUSED' | 'ACTIVE';
  }
): Promise<string> {
  const result = await facebookService.createCampaign(
    {
      name: params.name,
      objective: (params.objective || 'OUTCOME_ENGAGEMENT') as any,
      special_ad_categories: [],
      status: params.status || 'ACTIVE',
    },
    accessToken,
    adAccountId
  );
  
  return result.id;
}

// Tạo Ad Set
export async function createAdSet(
  adAccountId: string,
  accessToken: string,
  params: {
    campaignId: string;
    name: string;
    dailyBudget: number;
    targeting: {
      geoLocations: 
        | { countries: string[] }
        | { 
            custom_locations: Array<{
              latitude: number;
              longitude: number;
              radius: number;
              distance_unit: string;
            }>;
          };
      ageMin: number;
      ageMax: number;
      genders?: number[];
      interests?: Interest[];
    };
    pageId: string; // ✅ BẮT BUỘC cho CONVERSATIONS
    startTime?: string;
    status?: 'PAUSED' | 'ACTIVE';
  }
): Promise<string> {
  const targetingSpec: any = {
    geo_locations: params.targeting.geoLocations,
    age_min: params.targeting.ageMin,
    age_max: params.targeting.ageMax,
  };

  if (params.targeting.genders && params.targeting.genders.length > 0) {
    targetingSpec.genders = params.targeting.genders;
  }

  if (params.targeting.interests && params.targeting.interests.length > 0) {
    targetingSpec.flexible_spec = [
      {
        interests: params.targeting.interests.map(i => ({ id: i.id, name: i.name }))
      }
    ];
  }

  const result = await facebookService.createAdSet(
    {
      name: params.name,
      campaign_id: params.campaignId,
      daily_budget: params.dailyBudget, // VND không dùng cents, giữ nguyên giá trị
      start_time: params.startTime || new Date().toISOString(),
      targeting: targetingSpec,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'CONVERSATIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      destination_type: 'MESSENGER',
      promoted_object: {
        page_id: params.pageId, // ✅ BẮT BUỘC cho CONVERSATIONS
      },
      targeting_automation: {
        advantage_audience: 0, // ✅ TẮT Advantage Audience, dùng manual targeting
      },
      status: params.status || 'PAUSED', // ✅ ĐỔI PAUSED để giảm lỗi validation
    },
    accessToken,
    adAccountId
  );

  return result.id;
}

// Tạo Creative từ bài viết có sẵn
export async function createAdCreativeFromPost(
  adAccountId: string,
  objectStoryId: string,
  accessToken: string
): Promise<string> {
  const result = await facebookService.createAdCreative(
    {
      name: `Creative for ${objectStoryId}`,
      object_story_id: objectStoryId,
    },
    accessToken,
    adAccountId
  );

  return result.id;
}

// Tạo Ad
export async function createAd(
  adAccountId: string,
  accessToken: string,
  params: {
    adSetId: string;
    name: string;
    creativeId?: string;
    status?: 'PAUSED' | 'ACTIVE';
  }
): Promise<string> {
  const adParams: any = {
    name: params.name,
    adset_id: params.adSetId,
    status: params.status || 'ACTIVE',
  };
  
  // Chỉ thêm creative nếu có (cho campaigns khác)
  if (params.creativeId) {
    adParams.creative = { creative_id: params.creativeId };
  }
  
  const result = await facebookService.createAd(
    adParams,
    accessToken,
    adAccountId
  );

  return result.id;
}
