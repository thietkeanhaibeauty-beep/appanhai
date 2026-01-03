// Quick Creative Facebook Service - Xử lý upload media và tạo campaign creative
import * as facebookService from './facebook';
import { fbProxy } from './facebookProxyService';

export interface Interest {
  id: string;
  name: string;
}

// ===== UPLOAD MEDIA =====

export const uploadAdImage = async (
  adAccountId: string,
  adsToken: string,
  file: File
): Promise<{ imageHash: string; imageUrl?: string }> => {
  const formData = new FormData();
  formData.append('source', file);

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${adAccountId}/adimages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adsToken}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Upload ảnh thất bại');
  }

  const data = await response.json();
  const imageData = data.images?.[file.name];
  const imageHash = imageData?.hash;
  const imageUrl = imageData?.url || imageData?.permalink_url;

  if (!imageHash) {
    throw new Error('Không nhận được image hash từ Facebook');
  }

  return { imageHash, imageUrl };
};

export const uploadAdVideo = async (
  adAccountId: string,
  adsToken: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ videoId: string }> => {
  const formData = new FormData();
  formData.append('source', file);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    let uploadCompleted = false;

    // Timeout after 3 minutes
    const timeout = setTimeout(() => {
      if (!uploadCompleted) {
        xhr.abort();
        reject(new Error('Upload video timeout sau 3 phút. Vui lòng thử lại với video nhỏ hơn.'));
      }
    }, 3 * 60 * 1000);
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(Math.round(progress));
      }
    });

    xhr.addEventListener('load', () => {
      uploadCompleted = true;
      clearTimeout(timeout);




      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const videoId = data.id;

          if (!videoId) {
            console.error('[uploadAdVideo] No video ID in response:', data);
            reject(new Error('Không nhận được video ID từ Facebook'));
            return;
          }


          resolve({ videoId });
        } catch (e) {
          console.error('[uploadAdVideo] Parse error:', e);
          reject(new Error('Lỗi parse response từ Facebook'));
        }
      } else {
        // ❌ LOG CHI TIẾT ERROR TỪ FACEBOOK
        console.error('[uploadAdVideo] ❌ Upload failed with status:', xhr.status);
        console.error('[uploadAdVideo] ❌ Error response:', xhr.responseText);

        try {
          const error = JSON.parse(xhr.responseText);
          const errorMsg = error.error?.message || error.message || 'Upload video thất bại';
          const errorCode = error.error?.code || error.code;
          const fullError = `(${errorCode}) ${errorMsg}`;

          console.error('[uploadAdVideo] ❌ Parsed error:', fullError);
          reject(new Error(fullError));
        } catch {
          reject(new Error(`Upload video thất bại (Status: ${xhr.status})`));
        }
      }
    });

    xhr.addEventListener('error', (e) => {
      uploadCompleted = true;
      clearTimeout(timeout);
      console.error('[uploadAdVideo] ❌ Network error:', e);
      console.error('[uploadAdVideo] ❌ XHR status:', xhr.status, 'readyState:', xhr.readyState);
      reject(new Error('Lỗi kết nối khi upload video. Kiểm tra kết nối mạng.'));
    });

    xhr.addEventListener('abort', () => {
      uploadCompleted = true;
      clearTimeout(timeout);
      reject(new Error('Upload video đã bị hủy'));
    });

    const uploadUrl = `https://graph-video.facebook.com/v21.0/${adAccountId}/advideos`;



    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${adsToken}`);
    xhr.send(formData);
  });
};

export const getVideoThumbnails = async (
  videoId: string,
  pageToken: string,
  maxRetries = 5
): Promise<string> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // SECURE REFACTOR: Use Proxy to hide token in URL
      // Now using fbProxy helper
      const uri = await fbProxy.request<string>({
        accessToken: pageToken,
        endpoint: `${videoId}/thumbnails`,
        params: {}
      }).then(data => {
        // The proxy returns the raw FB response. We need to parse inside here? 
        // Wait, fbProxy returns `data` from FB. FB returns { data: [...] } for thumbnails.
        return (data as any).data?.[0]?.uri;
      });

      if (uri) return uri;

      // Chưa có thumbnail, đợi 2 giây rồi thử lại
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  throw new Error('Không thể lấy thumbnail sau nhiều lần thử');
};

// ===== SEARCH INTERESTS =====

export const searchInterests = async (
  keyword: string,
  accessToken: string
): Promise<Interest[]> => {
  return facebookService.searchTargetingInterests(keyword, accessToken);
};

// ===== SEARCH LOCATIONS =====

export interface Location {
  key: string;
  name: string;
  type: string;
  country_code?: string;
  country_name?: string;
  region?: string;
}

export const searchLocations = async (
  query: string,
  accessToken: string
): Promise<Location[]> => {
  // SECURE REFACTOR: Use Proxy to hide token in URL
  const responseData = await fbProxy.request<{ data: Location[] }>({
    accessToken,
    endpoint: 'search',
    params: {
      type: 'adgeolocation',
      location_types: '["city"]',
      q: query
    }
  });

  return responseData.data || [];
};

// ===== CREATE CAMPAIGN =====

export const createCampaign = async (
  adAccountId: string,
  adsToken: string,
  name: string,
  objective: 'OUTCOME_ENGAGEMENT' = 'OUTCOME_ENGAGEMENT'
): Promise<string> => {
  const data = await fbProxy.request<{ id: string }>({
    accessToken: adsToken,
    endpoint: `${adAccountId}/campaigns`,
    method: 'POST',
    body: {
      name,
      objective,
      status: 'ACTIVE',
      special_ad_categories: [],
    }
  });

  return data.id;


};

// ===== CREATE AD SET =====

export const createAdSet = async (
  adAccountId: string,
  adsToken: string,
  params: {
    campaignId: string;
    name: string;
    dailyBudget: number;
    currency?: string;
    pageId: string; // ✅ BẮT BUỘC cho CONVERSATIONS
    targeting: {
      geoLocations:
      | { countries: string[] }
      | {
        custom_locations: Array<{
          latitude: number;
          longitude: number;
          radius: number;
          distance_unit: string;
        }>
      }
      | { cities: Array<{ key: string; radius: number; distance_unit: string }>; location_types: string[] };
      ageMin: number;
      ageMax: number;
      genders?: number[];
      interests?: Interest[];
    };
  }
): Promise<string> => {
  const targetingSpec: any = {
    geo_locations: params.targeting.geoLocations,
    age_min: params.targeting.ageMin,
    age_max: params.targeting.ageMax,
  };

  // ✅ Log targeting để debug


  if (params.targeting.genders) {
    targetingSpec.genders = params.targeting.genders;
  }

  if (params.targeting.interests && params.targeting.interests.length > 0) {
    targetingSpec.flexible_spec = [
      {
        interests: params.targeting.interests.map(i => ({ id: i.id, name: i.name })),
      },
    ];
  }

  const data = await fbProxy.request<{ id: string }>({
    accessToken: adsToken,
    endpoint: `${adAccountId}/adsets`,
    method: 'POST',
    body: {
      campaign_id: params.campaignId,
      name: params.name,
      daily_budget: params.dailyBudget,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'CONVERSATIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      destination_type: 'MESSENGER',
      start_time: new Date().toISOString(),
      targeting: targetingSpec,
      promoted_object: {
        page_id: params.pageId,
      },
      targeting_automation: {
        advantage_audience: 0,
      },
      status: 'PAUSED',
    }
  });

  return data.id;
};

// ===== CREATE AD CREATIVE =====

interface MessageTemplateData {
  page_welcome_message: {
    type: 'VISUAL_EDITOR';
    version: number;
    landing_screen_type: string;
    media_type: string;
    text_format: {
      customer_action_type: string;
      message: {
        ice_breakers?: Array<{ title: string; response: string }>;
        quick_replies: any[];
        text: string;
      };
    };
    user_edit: boolean;
    surface: string;
  };
}

export const createAdCreativeForImage = async (
  adAccountId: string,
  adsToken: string,
  params: {
    pageId: string;
    name: string;
    message: string;
    imageHash: string;
    messageTemplateData?: MessageTemplateData;
  }
): Promise<string> => {
  const creativeData: any = {
    name: params.name,
    object_story_spec: {
      page_id: params.pageId,
      link_data: {
        message: params.message,
        name: params.name,
        link: `https://m.me/${params.pageId}`,
        image_hash: params.imageHash,
        call_to_action: {
          type: 'MESSAGE_PAGE',
          value: { app_destination: 'MESSENGER' }
        },
      },
    },
  };

  // Add message template if provided
  if (params.messageTemplateData) {
    creativeData.object_story_spec.link_data.page_welcome_message =
      JSON.stringify(params.messageTemplateData.page_welcome_message);
  }

  const data = await fbProxy.request<{ id: string }>({
    accessToken: adsToken,
    endpoint: `${adAccountId}/adcreatives`,
    method: 'POST',
    body: creativeData
  });

  return data.id;
};

export const createAdCreativeForVideo = async (
  adAccountId: string,
  adsToken: string,
  params: {
    pageId: string;
    title: string;
    message: string;
    videoId: string;
    thumbnailUrl: string;
    messageTemplateData?: MessageTemplateData;
  }
): Promise<string> => {
  // Determine if thumbnailUrl is a hash (no http) or URL
  const isHash = params.thumbnailUrl && !params.thumbnailUrl.startsWith('http');

  const creativeData: any = {
    name: params.title,
    object_story_spec: {
      page_id: params.pageId,
      video_data: {
        title: params.title,
        message: params.message,
        video_id: params.videoId,
        // Use image_hash for uploaded images, image_url for default thumbnails
        ...(isHash
          ? { image_hash: params.thumbnailUrl }
          : { image_url: params.thumbnailUrl }
        ),
        call_to_action: {
          type: 'MESSAGE_PAGE',
          value: { app_destination: 'MESSENGER' }
        },
      },
    },
  };

  // Add message template if provided
  if (params.messageTemplateData) {
    creativeData.object_story_spec.video_data.page_welcome_message =
      JSON.stringify(params.messageTemplateData.page_welcome_message);
  }

  const data = await fbProxy.request<{ id: string }>({
    accessToken: adsToken,
    endpoint: `${adAccountId}/adcreatives`,
    method: 'POST',
    body: creativeData
  });

  return data.id;
};

// ===== CREATE AD =====

export const createAd = async (
  adAccountId: string,
  adsToken: string,
  params: {
    adSetId: string;
    name: string;
    creativeId: string;
  }
): Promise<string> => {
  const data = await fbProxy.request<{ id: string }>({
    accessToken: adsToken,
    endpoint: `${adAccountId}/ads`,
    method: 'POST',
    body: {
      adset_id: params.adSetId,
      name: params.name,
      creative: { creative_id: params.creativeId },
      status: 'ACTIVE',
    }
  });

  return data.id;
};

// ===== ORCHESTRATOR =====

export const createFullCampaignFromMedia = async (config: {
  adAccountId: string;
  adsToken: string;
  pageToken: string;
  pageId: string;
  campaignName: string;
  dailyBudget: number;
  currency?: string;
  targeting: {
    geoLocations:
    | { countries: string[] }
    | {
      custom_locations: Array<{
        latitude: number;
        longitude: number;
        radius: number;
        distance_unit: string;
      }>
    }
    | { cities: Array<{ key: string; radius: number; distance_unit: string }>; location_types: string[] };
    ageMin: number;
    ageMax: number;
    genders?: number[];
    interests?: Interest[];
  };
  message: string;
  headline: string;
  mediaType: 'image' | 'video';
  imageHash?: string;
  videoId?: string;
  thumbnailUrl?: string; // Custom thumbnail URL nếu user upload
  greetingText?: string;
  iceBreakerQuestions?: string[];
}): Promise<{
  campaignId: string;
  adSetId: string;
  creativeId: string;
  adId: string;
  campaignName: string;
}> => {
  // Step 1: Create Campaign
  const campaignId = await createCampaign(
    config.adAccountId,
    config.adsToken,
    config.campaignName,
    'OUTCOME_ENGAGEMENT'
  );

  // Step 2: Create Ad Set
  const adSetId = await createAdSet(config.adAccountId, config.adsToken, {
    campaignId,
    name: `${config.campaignName} Ad Set`,
    dailyBudget: config.dailyBudget,
    currency: config.currency,
    pageId: config.pageId, // ✅ THÊM pageId cho promoted_object
    targeting: config.targeting,
  });

  // Step 3: Build Message Template Data
  let messageTemplateData: MessageTemplateData | undefined;
  if (config.greetingText || (config.iceBreakerQuestions && config.iceBreakerQuestions.length > 0)) {
    messageTemplateData = {
      page_welcome_message: {
        type: 'VISUAL_EDITOR',
        version: 2,
        landing_screen_type: "welcome_message",
        media_type: 'text',
        text_format: {
          customer_action_type: "ice_breakers",
          message: {
            ice_breakers: (config.iceBreakerQuestions || [])
              .slice(0, 4) // Max 4 ice breakers
              .filter(q => q.trim())
              .map(q => ({
                title: q.trim(),        // Câu hỏi hiển thị
                response: "",           // ✅ CRITICAL: Empty string - user tự trả lời
              })),
            quick_replies: [],
            text: (config.greetingText || '').trim(),
          },
        },
        user_edit: false,
        surface: "visual_editor_new",
      },
    };
  }

  // Step 4: Create Ad Creative
  let creativeId: string;
  if (config.mediaType === 'image') {
    if (!config.imageHash) throw new Error('imageHash is required for image creative');
    creativeId = await createAdCreativeForImage(config.adAccountId, config.adsToken, {
      pageId: config.pageId,
      name: config.headline,
      message: config.message,
      imageHash: config.imageHash,
      messageTemplateData,
    });
  } else {
    if (!config.videoId) throw new Error('videoId is required for video creative');
    // Dùng thumbnail đã upload nếu có, không thì lấy mặc định
    const thumbnailUrl = config.thumbnailUrl || await getVideoThumbnails(config.videoId, config.pageToken);
    creativeId = await createAdCreativeForVideo(config.adAccountId, config.adsToken, {
      pageId: config.pageId,
      title: config.headline,
      message: config.message,
      videoId: config.videoId,
      thumbnailUrl,
      messageTemplateData,
    });
  }

  // Step 5: Create Ad
  const adId = await createAd(config.adAccountId, config.adsToken, {
    adSetId,
    name: `${config.campaignName} Ad`,
    creativeId,
  });

  return {
    campaignId,
    adSetId,
    creativeId,
    adId,
    campaignName: config.campaignName,
  };
};
