// Facebook Service API
// This service handles all Facebook Graph API interactions
// Function signatures are locked - do not modify without team approval

import type {
  AdAccount,
  PageDetails,
  Conversation,
  Message,
  PostValidationResult,
  PostPreview,
  Interest,
  Campaign,
  CampaignObjective,
  AdSet,
  Ad,
  MessageTemplate,
  IceBreaker,
  Label,
  AudienceEstimate,
  TargetingSpec,
} from '@/types';

import { fbProxy } from '@/services/facebookProxyService';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ============================================================================
// AUTHENTICATION & ACCOUNT MANAGEMENT
// ============================================================================

export async function authenticateAds(
  accessToken: string
): Promise<{ accounts: AdAccount[] }> {
  try {
    const data = await fbProxy.request<{ data: AdAccount[] }>({
      accessToken,
      endpoint: 'me/adaccounts',
      params: { fields: 'id,name,currency,timezone_name,account_status' }
    });
    return { accounts: data.data };
  } catch (error) {
    throw new Error('Failed to authenticate with Facebook Ads API');
  }
}
/*
  const response = await fetch(
    `${GRAPH_API_BASE}/me/adaccounts?fields=id,name,currency,timezone_name,account_status&access_token=${accessToken}`
  );
  ...
*/

export async function authenticatePage(
  pageId: string,
  accessToken: string
): Promise<{ pageDetails: PageDetails; conversations: Conversation[] }> {
  try {
    const [pageDetails, conversationsData] = await Promise.all([
      fbProxy.request<PageDetails>({
        accessToken,
        endpoint: pageId,
        params: { fields: 'id,name,category,tasks' }
      }),
      fbProxy.request<{ data: Conversation[] }>({
        accessToken,
        endpoint: `${pageId}/conversations`,
        params: { fields: 'id,participants,updated_time,message_count' }
      }).catch(() => ({ data: [] }))
    ]);

    return {
      pageDetails,
      conversations: conversationsData.data
    };
  } catch (error) {
    throw new Error('Failed to authenticate with Facebook Page API');
  }
}

/*
  const [pageResponse, conversationsResponse] = await Promise.all([
    fetch(`${GRAPH_API_BASE}/${pageId}?fields=id,name,category,tasks&access_token=${accessToken}`),
    fetch(`${GRAPH_API_BASE}/${pageId}/conversations?fields=id,participants,updated_time,message_count&access_token=${accessToken}`)
  ]);
  ...
*/

// ============================================================================
// CONVERSATION MANAGEMENT
// ============================================================================

export async function getConversations(
  pageId: string,
  accessToken: string
): Promise<Conversation[]> {
  try {
    const data = await fbProxy.request<{ data: Conversation[] }>({
      accessToken,
      endpoint: `${pageId}/conversations`,
      params: { fields: 'id,participants,updated_time,message_count,unread_count,snippet,can_reply,is_subscribed' }
    });
    return data.data;
  } catch (error) {
    throw new Error('Failed to fetch conversations');
  }
}

/*
  const response = await fetch(...)
*/

export async function getConversationMessages(
  conversationId: string,
  accessToken: string
): Promise<Message[]> {
  try {
    const data = await fbProxy.request<{ data: Message[] }>({
      accessToken,
      endpoint: `${conversationId}/messages`,
      params: { fields: 'id,from,to,message,created_time,attachments' }
    });
    return data.data;
  } catch (error) {
    throw new Error('Failed to fetch messages');
  }
}

/*
  const response = await fetch(...)
*/

export async function sendMessage(
  conversationId: string,
  messageText: string,
  pageAccessToken: string
): Promise<void> {
  try {
    await fbProxy.request({
      accessToken: pageAccessToken,
      endpoint: `${conversationId}/messages`,
      method: 'POST',
      body: { message: messageText }
    });
  } catch (error) {
    throw new Error('Failed to send message');
  }
}

/*
  const response = await fetch(...)
*/

// ============================================================================
// POST VALIDATION & MANAGEMENT
// ============================================================================

export async function validatePostUrl(
  postUrl: string,
  accessToken: string
): Promise<PostValidationResult> {
  try {
    const postId = extractPostId(postUrl);
    if (!postId) {
      return { isValid: false, error: 'Invalid post URL format' };
    }

    const preview = await getPostDetails(postId, accessToken);
    return { isValid: true, postId, preview };
  } catch (error) {
    return { isValid: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getPostDetails(
  postId: string,
  accessToken: string
): Promise<PostPreview> {
  try {
    const data = await fbProxy.request<PostPreview>({
      accessToken,
      endpoint: postId,
      params: { fields: 'id,message,full_picture,permalink_url,created_time,type' }
    });
    return data;
  } catch (error) {
    throw new Error('Failed to fetch post details');
  }
}

/*
  const response = await fetch(...)
*/

// Helper function to extract post ID from URL
function extractPostId(url: string): string | null {
  const patterns = [
    /facebook\.com\/.*\/posts\/(\d+)/,
    /facebook\.com\/.*\/photos\/.*\/(\d+)/,
    /facebook\.com\/permalink\.php\?story_fbid=(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// ============================================================================
// TARGETING & INTERESTS
// ============================================================================

export async function searchTargetingInterests(
  query: string,
  accessToken: string
): Promise<Interest[]> {
  try {
    const data = await fbProxy.request<{ data: Interest[] }>({
      accessToken,
      endpoint: 'search',
      params: {
        type: 'adinterest',
        q: query,
        limit: '25'
      }
    });
    return data.data;
  } catch (error) {
    throw new Error('Failed to search interests');
  }
}

/*
  const response = await fetch(...)
*/

export async function browseTargetingInterests(
  parentId: string,
  accessToken: string
): Promise<Interest[]> {
  try {
    if (parentId) {
      const data = await fbProxy.request<Interest>({
        accessToken,
        endpoint: parentId,
        params: { fields: 'name,audience_size,path,topic' }
      });
      return [data];
    } else {
      const data = await fbProxy.request<{ data: Interest[] }>({
        accessToken,
        endpoint: 'search',
        params: {
          type: 'adinterestsuggestion',
          interest_list: '[]'
        }
      });
      return data.data;
    }
  } catch (error) {
    throw new Error('Failed to browse interests');
  }
}

/*
  const url = parentId ? ... : ...
  const response = await fetch(url);
*/

export async function estimateAudience(
  targeting: TargetingSpec,
  accessToken: string,
  adAccountId: string
): Promise<AudienceEstimate> {
  try {
    const data = await fbProxy.request<{ data: any[] }>({
      accessToken,
      endpoint: `${adAccountId}/delivery_estimate`,
      method: 'POST',
      body: {
        targeting_spec: targeting,
        optimization_goal: 'REACH'
      }
    });

    return {
      users: data.data?.[0]?.estimate_dau || 0,
      estimate_ready: data.data?.[0]?.estimate_ready || false,
    };
  } catch (error) {
    throw new Error('Failed to estimate audience');
  }
}
/*
  const response = await fetch(...)
*/

// ============================================================================
// CREATIVE UPLOAD
// ============================================================================

export async function uploadImage(
  file: File,
  accessToken: string,
  adAccountId: string
): Promise<{ hash: string; url: string }> {
  const MAX_SECURE_SIZE = 5 * 1024 * 1024; // 5MB

  // Use secure upload for small files (token not exposed)
  if (file.size <= MAX_SECURE_SIZE) {
    try {
      const { supabase } = await import('@/integrations/supabase/client');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('adAccountId', adAccountId);
      formData.append('mediaType', 'image');

      const { data, error } = await supabase.functions.invoke('upload-media-secure', {
        body: formData,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Upload failed');

      return { hash: data.hash, url: data.url };
    } catch (secureError) {
      console.warn('[uploadImage] Secure upload failed, falling back to direct:', secureError);
      // Fall through to direct upload
    }
  }

  // Direct upload for large files or if secure upload fails (token visible in DevTools)
  console.log('[uploadImage] Using direct upload (file > 5MB or secure failed)');
  const formData = new FormData();
  formData.append('access_token', accessToken);
  formData.append('filename', file);

  const response = await fetch(
    `${GRAPH_API_BASE}/${adAccountId}/adimages`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  const data = await response.json();
  const imageData = Object.values(data.images)[0] as any;
  return {
    hash: imageData.hash,
    url: imageData.url || imageData.permalink_url,
  };
}

export async function uploadVideo(
  file: File,
  accessToken: string,
  adAccountId: string,
  onProgress?: (progress: number) => void
): Promise<{ id: string }> {
  const MAX_SECURE_SIZE = 5 * 1024 * 1024; // 5MB

  // Use secure upload for small files (token not exposed)
  if (file.size <= MAX_SECURE_SIZE) {
    try {
      const { supabase } = await import('@/integrations/supabase/client');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('adAccountId', adAccountId);
      formData.append('mediaType', 'video');

      const { data, error } = await supabase.functions.invoke('upload-media-secure', {
        body: formData,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Upload failed');

      return { id: data.id };
    } catch (secureError) {
      console.warn('[uploadVideo] Secure upload failed, falling back to direct:', secureError);
      // Fall through to direct upload
    }
  }

  // Direct upload for large files or if secure upload fails (token visible in DevTools)
  console.log('[uploadVideo] Using direct upload (file > 5MB or secure failed)');
  const formData = new FormData();
  formData.append('access_token', accessToken);
  formData.append('source', file);

  // Use explicit API version v21.0
  const response = await fetch(
    `https://graph-video.facebook.com/v21.0/${adAccountId}/advideos`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('Facebook Video Upload Error:', {
      status: response.status,
      statusText: response.statusText,
      error: error,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
      }
    });

    // Extract detailed error messages from Facebook's error response
    const errorMessage =
      error.error_user_title ||
      error.error?.error_user_title ||
      error.error_user_msg ||
      error.error?.error_user_msg ||
      error.error?.message ||
      'Failed to upload video';

    throw new Error(errorMessage);
  }

  const data = await response.json();

  return {
    id: data.id,
  };
}

export async function getVideoThumbnail(
  videoId: string,
  accessToken: string,
  maxRetries: number = 5
): Promise<string> {
  // Retry với exponential backoff vì Facebook cần thời gian generate thumbnail
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      /*
      const response = await fetch(
        `${GRAPH_API_BASE}/${videoId}/thumbnails?access_token=${accessToken}`
      );
      */

      const data = await fbProxy.request<{ data: any[] }>({
        accessToken,
        endpoint: `${videoId}/thumbnails`
      });

      // const data = await response.json();
      const thumbnailUri = data.data?.[0]?.uri;

      if (thumbnailUri) {

        return thumbnailUri;
      }

      // Nếu chưa có thumbnail, đợi trước khi retry
      if (attempt < maxRetries - 1) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 8000); // 1s, 2s, 4s, 8s, 8s

        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`❌ Error fetching thumbnail (attempt ${attempt + 1}/${maxRetries}):`, error);
      if (attempt < maxRetries - 1) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // Nếu sau tất cả retry vẫn không có thumbnail, trả về empty
  console.warn('⚠️ Không lấy được thumbnail sau', maxRetries, 'lần thử. Sẽ dùng frame đầu tiên của video.');
  return '';
}

// ============================================================================
// CAMPAIGN CREATION
// ============================================================================

export async function createCampaign(
  params: {
    name: string;
    objective: CampaignObjective;
    special_ad_categories: string[];
    status: 'PAUSED' | 'ACTIVE';
  },
  accessToken: string,
  adAccountId: string
): Promise<{ id: string }> {
  try {
    const data = await fbProxy.request<{ id: string }>({
      accessToken,
      endpoint: `${adAccountId}/campaigns`,
      method: 'POST',
      body: params
    });
    return data;
  } catch (error) {
    throw new Error('Failed to create campaign');
  }
}
/*
  const response = await fetch(...)
*/

export async function createAdSet(
  params: {
    name: string;
    campaign_id: string;
    daily_budget?: number;
    lifetime_budget?: number;
    start_time: string;
    end_time?: string;
    targeting: TargetingSpec;
    billing_event: string;
    optimization_goal: string;
    bid_strategy: string;
    destination_type?: string;
    promoted_object?: {
      page_id?: string;
      object_story_id?: string;
    };
    targeting_automation?: {
      advantage_audience?: number;
    };
    status: 'PAUSED' | 'ACTIVE';
  },
  accessToken: string,
  adAccountId: string
): Promise<{ id: string }> {
  try {
    const data = await fbProxy.request<{ id: string }>({
      accessToken,
      endpoint: `${adAccountId}/adsets`,
      method: 'POST',
      body: params
    });
    return data;
  } catch (error) {
    throw new Error('Failed to create ad set');
  }
}

/*
  const response = await fetch(...)
*/

// ============================================================================
// AD CREATIVE (Bước A)
// ============================================================================

export async function createAdCreative(
  params: {
    name: string;
    object_story_id?: string;
    object_story_spec?: {
      page_id: string;
      link_data?: {
        message: string;
        link: string;
        image_hash?: string;
        video_id?: string;
      };
    };
  },
  accessToken: string,
  adAccountId: string
): Promise<{ id: string }> {
  try {
    const data = await fbProxy.request<{ id: string }>({
      accessToken,
      endpoint: `${adAccountId}/adcreatives`,
      method: 'POST',
      body: params
    });
    return data;
  } catch (error) {
    throw new Error('Failed to create ad creative');
  }
}
/*
  const response = await fetch(...)
*/

// Tạo Ad Creative cho ảnh (dùng object_story_spec) - Giống code cũ 100%
export async function createAdCreativeWithImageSpec(
  params: {
    name: string;
    pageId: string;
    message: string;
    headline?: string;
    imageHash: string;
    ctaType?: string;
    messageTemplateData?: any; // Raw payload từ getMessageTemplatePayload()
  },
  accessToken: string,
  adAccountId: string
): Promise<{ id: string }> {
  const linkData: any = {
    message: params.message,
    link: `https://m.me/${params.pageId}`,
    image_hash: params.imageHash,
  };

  if (params.headline) {
    linkData.name = params.headline;
  }

  if (params.ctaType === 'MESSAGE_PAGE') {
    linkData.call_to_action = {
      type: 'MESSAGE_PAGE',
      value: { app_destination: 'MESSENGER' },
    };

    // === ĐÂY LÀ PHẦN QUAN TRỌNG (giống code cũ 100%) ===
    // Kiểm tra xem có messageTemplateData và key page_welcome_message không
    if (params.messageTemplateData?.page_welcome_message) {
      // Chuyển đổi object JSON thành một chuỗi JSON và gán vào link_data
      linkData.page_welcome_message = JSON.stringify(params.messageTemplateData.page_welcome_message);

    }
    // =============================
  } else if (params.ctaType === 'LEARN_MORE') {
    linkData.call_to_action = {
      type: 'LEARN_MORE',
    };
  } else if (params.ctaType === 'SHOP_NOW') {
    linkData.call_to_action = {
      type: 'SHOP_NOW',
    };
  }

  /*
  const response = await fetch(
    `${GRAPH_API_BASE}/${adAccountId}/adcreatives`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: params.name,
        object_story_spec: {
          page_id: params.pageId,
          link_data: linkData,
        },
        access_token: accessToken,
      }),
    }
  );
  */

  try {
    const data = await fbProxy.request<{ id: string }>({
      accessToken,
      endpoint: `${adAccountId}/adcreatives`,
      method: 'POST',
      body: {
        name: params.name,
        object_story_spec: {
          page_id: params.pageId,
          link_data: linkData,
        }
      }
    });
    return data;
  } catch (error) {
    console.error('Facebook Ad Creative Error:', error);
    throw error;
  }
}

// Tạo Ad Creative cho video (dùng object_story_spec) - Giống code cũ 100%
export async function createAdCreativeWithVideoSpec(
  params: {
    name: string;
    pageId: string;
    message: string;
    videoTitle?: string;
    videoId: string;
    thumbnailUrl: string;
    ctaType?: string;
    messageTemplateData?: any; // Raw payload từ getMessageTemplatePayload()
  },
  accessToken: string,
  adAccountId: string
): Promise<{ id: string }> {
  const videoData: any = {
    message: params.message,
    video_id: params.videoId,
  };

  // ⚠️ CRITICAL: Facebook yêu cầu phải có thumbnail cho video ads
  // Nếu thumbnailUrl có giá trị, dùng nó. Nếu không, bỏ qua (Facebook sẽ tự động dùng frame đầu tiên)
  if (params.thumbnailUrl) {
    videoData.image_url = params.thumbnailUrl;
  }
  // Nếu không có thumbnailUrl, KHÔNG set image_url = "" vì sẽ bị lỗi
  // Facebook sẽ tự động dùng frame đầu tiên của video làm thumbnail

  if (params.videoTitle) {
    videoData.title = params.videoTitle;
  }

  if (params.ctaType === 'MESSAGE_PAGE') {
    videoData.call_to_action = {
      type: 'MESSAGE_PAGE',
      value: { app_destination: 'MESSENGER' },
    };

    // === ĐÂY LÀ PHẦN QUAN TRỌNG (giống code cũ 100%) ===
    // Kiểm tra xem có messageTemplateData và key page_welcome_message không
    if (params.messageTemplateData?.page_welcome_message) {
      // Chuyển đổi object JSON thành một chuỗi JSON và gán vào video_data
      videoData.page_welcome_message = JSON.stringify(params.messageTemplateData.page_welcome_message);

    }
    // =============================
  } else if (params.ctaType === 'LEARN_MORE') {
    videoData.call_to_action = {
      type: 'LEARN_MORE',
    };
  } else if (params.ctaType === 'SHOP_NOW') {
    videoData.call_to_action = {
      type: 'SHOP_NOW',
    };
  }

  try {
    const data = await fbProxy.request<{ id: string }>({
      accessToken,
      endpoint: `${adAccountId}/adcreatives`,
      method: 'POST',
      body: {
        name: params.name,
        object_story_spec: {
          page_id: params.pageId,
          video_data: videoData,
        }
      }
    });
    return data;
  } catch (error) {
    console.error('Facebook Ad Creative Error:', error);
    throw error;
  }
}
/*
  const response = await fetch(...)
*/

// ============================================================================
// AD (Bước B)
// ============================================================================

export async function createAd(
  params: {
    name: string;
    adset_id: string;
    creative: {
      creative_id: string;
    };
    status: 'PAUSED' | 'ACTIVE';
  },
  accessToken: string,
  adAccountId: string
): Promise<{ id: string }> {
  try {
    const data = await fbProxy.request<{ id: string }>({
      accessToken,
      endpoint: `${adAccountId}/ads`,
      method: 'POST',
      body: params
    });
    return data;
  } catch (error) {
    throw new Error('Failed to create ad');
  }
}
/*
  const response = await fetch(...)
*/

// ============================================================================
// MESSAGE TEMPLATES
// ============================================================================

export async function getMessageTemplates(
  pageId: string,
  accessToken: string
): Promise<MessageTemplate[]> {
  try {
    const data = await fbProxy.request<{ data: MessageTemplate[] }>({
      accessToken,
      endpoint: `${pageId}/message_templates`
    });
    return data.data || [];
  } catch (error) {
    throw new Error('Failed to fetch message templates');
  }
}
/*
  const response = await fetch(...)
*/

export async function updateGreeting(
  pageId: string,
  greeting: string,
  accessToken: string
): Promise<void> {
  try {
    await fbProxy.request({
      accessToken,
      endpoint: `${pageId}/messenger_profile`,
      method: 'POST',
      body: { greeting: [{ locale: 'default', text: greeting }] }
    });
  } catch (error) {
    throw new Error('Failed to update greeting');
  }
}

export async function updateIceBreakers(
  pageId: string,
  iceBreakers: IceBreaker[],
  accessToken: string
): Promise<void> {
  try {
    const ice_breakers = iceBreakers.map(ib => ({
      question: ib.question,
      payload: ib.payload || ib.question,
    }));

    await fbProxy.request({
      accessToken,
      endpoint: `${pageId}/messenger_profile`,
      method: 'POST',
      body: { ice_breakers }
    });
  } catch (error) {
    throw new Error('Failed to update ice breakers');
  }
}

/*
  const response = await fetch(...)
*/

// ============================================================================
// LABELS MANAGEMENT
// ============================================================================

export async function getLabels(
  pageId: string,
  accessToken: string
): Promise<Label[]> {
  try {
    const data = await fbProxy.request<{ data: Label[] }>({
      accessToken,
      endpoint: `${pageId}/custom_labels`
    });
    return data.data || [];
  } catch (error) {
    throw new Error('Failed to fetch labels');
  }
}
/*
  const response = await fetch(...)
*/

export async function createLabel(
  pageId: string,
  name: string,
  accessToken: string
): Promise<Label> {
  try {
    const data = await fbProxy.request<Label>({
      accessToken,
      endpoint: `${pageId}/custom_labels`,
      method: 'POST',
      body: { name }
    });
    return data;
  } catch (error) {
    throw new Error('Failed to create label');
  }
}
/*
  const response = await fetch(...)
*/

export async function deleteLabel(
  labelId: string,
  accessToken: string
): Promise<void> {
  try {
    await fbProxy.request({
      accessToken,
      endpoint: labelId,
      method: 'DELETE'
    });
  } catch (error) {
    throw new Error('Failed to delete label');
  }
}
/*
  const response = await fetch(...)
*/

export async function assignLabelToConversation(
  conversationId: string,
  labelId: string,
  accessToken: string
): Promise<void> {
  try {
    await fbProxy.request({
      accessToken,
      endpoint: `${conversationId}/custom_labels`,
      method: 'POST',
      body: { custom_label_id: labelId }
    });
  } catch (error) {
    throw new Error('Failed to assign label');
  }
}
/*
  const response = await fetch(...)
*/

export async function removeLabelFromConversation(
  conversationId: string,
  labelId: string,
  accessToken: string
): Promise<void> {
  try {
    await fbProxy.request({
      accessToken,
      endpoint: `${conversationId}/custom_labels/${labelId}`,
      method: 'DELETE'
    });
  } catch (error) {
    throw new Error('Failed to remove label');
  }
}
/*
  const response = await fetch(...)
*/

// ============================================================================
// CUSTOM AUDIENCE MANAGEMENT
// ============================================================================

/**
 * Chuẩn hóa SĐT Việt Nam về định dạng 84...
 * Ví dụ: 0901234567 -> 84901234567
 */
const normalizePhoneNumber = (phoneNumber: string): string => {
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  if (digitsOnly.startsWith('84')) {
    return digitsOnly;
  }

  if (digitsOnly.startsWith('0')) {
    return `84${digitsOnly.substring(1)}`;
  }

  return `84${digitsOnly}`;
};

/**
 * Mã hóa dữ liệu bằng SHA-256
 * Facebook yêu cầu tất cả dữ liệu cá nhân phải được hash trước khi gửi
 */
const hashDataSHA256 = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Check Custom Audience TOS acceptance status for an Ad Account
 * Returns the tos_accepted field from Facebook API
 */
export async function checkCustomAudienceTosStatus(
  adAccountId: string,
  accessToken: string
): Promise<{ customAudienceTos: number; rawResponse: any }> {
  try {
    const data = await fbProxy.request<any>({
      accessToken,
      endpoint: adAccountId,
      params: { fields: 'tos_accepted,name,account_status' }
    });
    return {
      customAudienceTos: data.tos_accepted?.custom_audience_tos ?? -1,
      rawResponse: data
    };
  } catch (error: any) {
    throw error;
  }
}

/**
 * Tạo Custom Audience container (bước 1 của luồng File Upload)
 */
export async function createCustomAudience(
  adAccountId: string,
  accessToken: string,
  name: string,
  description: string
): Promise<string> {
  try {
    const data = await fbProxy.request<{ id: string }>({
      accessToken,
      endpoint: `${adAccountId}/customaudiences`,
      method: 'POST',
      body: {
        name,
        description,
        subtype: 'CUSTOM',
        customer_file_source: 'USER_PROVIDED_ONLY'
      }
    });
    return data.id;
  } catch (error: any) {
    // Re-throw with original message for better debugging
    throw error;
  }
}
/*
  const formData = new FormData(); ...
  const response = await fetch(...)
*/

/**
 * Thêm người dùng vào Custom Audience (bước 2 của luồng File Upload)
 * Tự động chuẩn hóa, mã hóa SHA-256, và chia thành batch 10k
 */
export async function addUsersToCustomAudience(
  audienceId: string,
  accessToken: string,
  phoneNumbers: string[]
): Promise<any> {
  // 1. Chuẩn hóa SĐT
  const normalizedNumbers = phoneNumbers
    .map(normalizePhoneNumber)
    .filter(p => p.startsWith('84'));

  if (normalizedNumbers.length === 0) {
    throw new Error('Không tìm thấy SĐT hợp lệ sau khi chuẩn hóa.');
  }

  // 2. Mã hóa SHA-256
  const hashedNumbers = await Promise.all(
    normalizedNumbers.map(p => hashDataSHA256(p))
  );

  // 3. Chia thành các batch (Facebook giới hạn 10,000 users/request)
  const BATCH_SIZE = 10000;
  const batches: string[][] = [];

  for (let i = 0; i < hashedNumbers.length; i += BATCH_SIZE) {
    batches.push(hashedNumbers.slice(i, i + BATCH_SIZE));
  }

  // 4. Gửi từng batch
  let lastResponseData = null;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const payload = {
      payload: {
        schema: ['PHONE'],
        data: batch.map(hash => [hash]),
      }
    };

    try {
      const data = await fbProxy.request<any>({
        accessToken,
        endpoint: `${audienceId}/users`,
        method: 'POST',
        body: payload
      });
      lastResponseData = data;
    } catch (error) {
      throw new Error(`Không thể thêm người dùng vào đối tượng (batch ${i + 1}/${batches.length})`);
    }
  }

  return lastResponseData;
}
/*
    const response = await fetch(...)
*/

/**
 * Tạo Page Messengers Audience
 * Tự động bao gồm những người đã nhắn tin cho Page trong X ngày qua
 */
export async function createPageMessengersAudience(
  adAccountId: string,
  accessToken: string,
  name: string,
  description: string,
  pageId: string,
  retentionDays: number
): Promise<string> {
  const retentionSeconds = retentionDays * 24 * 60 * 60;

  // Xây dựng rule object
  const rule = {
    inclusions: {
      operator: "or",
      rules: [{
        event_sources: [{ id: pageId, type: "page" }],
        retention_seconds: retentionSeconds,
        filter: {
          operator: "and",
          filters: [{
            field: "event",
            operator: "eq",
            value: "page_messaged"
          }]
        }
      }]
    }
  };

  try {
    const data = await fbProxy.request<{ id: string }>({
      accessToken,
      endpoint: `${adAccountId}/customaudiences`,
      method: 'POST',
      body: {
        name,
        description,
        rule: JSON.stringify(rule),
        prefill: 'true'
      }
    });
    return data.id;
  } catch (error) {
    throw new Error('Không thể tạo đối tượng từ người nhắn tin Page');
  }
}
/*
  const formData = new FormData(); ...
  const response = await fetch(...)
*/

/**
 * Lấy danh sách Custom Audiences hiện có (dùng cho Lookalike source)
 */
export async function getCustomAudiences(
  adAccountId: string,
  accessToken: string
): Promise<Array<{ id: string; name: string }>> {
  try {
    const data = await fbProxy.request<{ data: any[] }>({
      accessToken,
      endpoint: `${adAccountId}/customaudiences`,
      params: { fields: 'id,name' }
    });
    return data.data || [];
  } catch (error) {
    throw new Error('Không thể tải danh sách đối tượng tùy chỉnh');
  }
}
/*
  const response = await fetch(...)
*/

/**
 * Tạo Lookalike Audience từ một Custom Audience nguồn
 */
export async function createLookalikeAudience(
  adAccountId: string,
  accessToken: string,
  name: string,
  description: string,
  originAudienceId: string,
  country: string,
  ratio: number
): Promise<string> {
  const lookalikeSpec = {
    country,
    ratio: ratio / 100, // Facebook API yêu cầu 0.01 - 0.1 (tương đương 1% - 10%)
  };

  try {
    const data = await fbProxy.request<{ id: string }>({
      accessToken,
      endpoint: `${adAccountId}/customaudiences`,
      method: 'POST',
      body: {
        name,
        description,
        subtype: 'LOOKALIKE',
        origin_audience_id: originAudienceId,
        lookalike_spec: JSON.stringify(lookalikeSpec)
      }
    });
    return data.id;
  } catch (error) {
    throw new Error('Không thể tạo tệp đối tượng tương tự');
  }
}
/*
  const formData = new FormData(); ...
  const response = await fetch(...)
*/

