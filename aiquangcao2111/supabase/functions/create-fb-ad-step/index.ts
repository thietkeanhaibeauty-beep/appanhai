import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromRequest(req);
    const {
      adSetId,
      adName,
      creativeType,
      imageHash,
      videoId,
      thumbnailUrl,
      headline,
      primaryText,
      resolvedPostId,
      postUrl,
      pageId,
      adsToken,
      adAccountId,
      greetingMessage,
      iceBreakers
    } = await req.json();

    console.log('[Create FB Ad] Creating ad:', { adName, adSetId, creativeType, adAccountId });
    console.log('[Create FB Ad] 📥 Input data:', {
      adSetId,
      adName,
      creativeType,
      resolvedPostId,
      postUrl,
      pageId,
      adAccountId,
      hasAdsToken: !!adsToken
    });

    if (!adSetId || !adName || !pageId || !adsToken || !adAccountId) {
      throw new Error('Missing required parameters');
    }

    // Normalize Ad Account ID: Remove "act_" prefix if present
    const normalizedAdAccountId = adAccountId.replace(/^act_/, '');

    // ===== HANDLE MEDIA CREATIVE vs POST CREATIVE =====
    let creativeId: string;

    // If we have media (image/video), create creative from media
    if (imageHash || videoId) {
      console.log('[Create FB Ad] 📸 Creating creative from media:', { creativeType, imageHash, videoId });

      const creativePayload: any = {
        name: `Creative - ${adName}`,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            link: `https://m.me/${pageId}`,
            message: primaryText || '',
            name: headline || '',
            call_to_action: {
              type: 'MESSAGE_PAGE'
            }
          }
        }
      };

      // Add media
      if (creativeType === 'image' && imageHash) {
        creativePayload.object_story_spec.link_data.image_hash = imageHash;
      } else if (creativeType === 'video' && videoId) {
        creativePayload.object_story_spec.video_data = {
          video_id: videoId,
          message: primaryText || '',
          title: headline || '',
          call_to_action: {
            type: 'MESSAGE_PAGE',
            value: { app_destination: 'MESSENGER' }
          }
        };

        // ✅ CRITICAL: image_url is REQUIRED for video_data by Facebook API
        let finalThumbnailUrl = thumbnailUrl;

        if (!finalThumbnailUrl || !finalThumbnailUrl.trim()) {
          console.log('[Create FB Ad] ⚠️ No thumbnail provided, fetching default from Facebook video object...');

          try {
            // Fetch video object to get default picture
            const videoResponse = await fetch(
              `${BASE_URL}/${videoId}?fields=picture&access_token=${adsToken}`
            );
            const videoData = await videoResponse.json();

            if (videoData.picture) {
              finalThumbnailUrl = videoData.picture;
              console.log('[Create FB Ad] ✅ Got default thumbnail from video object:', finalThumbnailUrl);
            }
          } catch (e) {
            console.error('[Create FB Ad] Failed to fetch video thumbnail:', e);
          }
        }

        if (!finalThumbnailUrl || !finalThumbnailUrl.trim()) {
          throw new Error('❌ Video thumbnail is required by Facebook. Please wait a few seconds for Facebook to process the video, then try again.');
        }

        creativePayload.object_story_spec.video_data.image_url = finalThumbnailUrl;
        console.log('[Create FB Ad] ✅ Using thumbnail:', finalThumbnailUrl);

        delete creativePayload.object_story_spec.link_data;
      }

      // Add page welcome message (greeting + ice breakers) for Messenger ads
      if (greetingMessage || (iceBreakers && iceBreakers.length > 0)) {
        // Normalize ice breakers to match quickCreativeFacebookService format
        const normalizedIceBreakers = (iceBreakers || [])
          .slice(0, 4) // Max 4 ice breakers according to Facebook limits
          .filter((ib: any) => {
            const text = typeof ib === 'string' ? ib : (ib.question || ib.title || '');
            return text.trim();
          })
          .map((ib: any) => {
            const questionText = typeof ib === 'string' ? ib : (ib.question || ib.title || '');
            return {
              title: questionText.trim(),      // ✅ Câu hỏi hiển thị
              response: "",                     // ✅ CRITICAL: Empty string - user tự trả lời
            };
          });

        console.log('[Create FB Ad] 💬 Normalized ice breakers:', normalizedIceBreakers);

        // Build page_welcome_message with VISUAL_EDITOR structure (matches quickCreativeFacebookService)
        const pageWelcomeMessage = {
          type: 'VISUAL_EDITOR',
          version: 2,  // NUMBER not string
          landing_screen_type: "welcome_message",
          media_type: 'text',
          text_format: {
            customer_action_type: "ice_breakers",
            message: {
              ice_breakers: normalizedIceBreakers,
              quick_replies: [],  // ⚠️ REQUIRED
              text: (greetingMessage || '').trim(),
            },
          },
          user_edit: false,
          surface: "visual_editor_new",
        };

        console.log('[Create FB Ad] 💬 Built page_welcome_message:', {
          greetingMessage,
          iceBreakersCount: normalizedIceBreakers.length,
          creativeType,
          structure: pageWelcomeMessage
        });

        // Assign stringified page_welcome_message to link_data (image) or video_data (video)
        if (creativeType === 'image' && creativePayload.object_story_spec.link_data) {
          creativePayload.object_story_spec.link_data.page_welcome_message =
            JSON.stringify(pageWelcomeMessage);  // ✅ STRINGIFY!
        } else if (creativeType === 'video' && creativePayload.object_story_spec.video_data) {
          creativePayload.object_story_spec.video_data.page_welcome_message =
            JSON.stringify(pageWelcomeMessage);  // ✅ STRINGIFY!
        }

        console.log('[Create FB Ad] ✅ Added stringified page_welcome_message to creative');
      }

      console.log('[Create FB Ad] 📦 Creative payload:', JSON.stringify(creativePayload, null, 2));

      // ✅ VERIFY page_welcome_message cho video ads
      if (creativeType === 'video') {
        if (creativePayload.object_story_spec.video_data?.page_welcome_message) {
          console.log('[Create FB Ad] ✅ VIDEO AD HAS page_welcome_message!');
          console.log('[Create FB Ad] 📋 page_welcome_message preview:',
            creativePayload.object_story_spec.video_data.page_welcome_message.substring(0, 300) + '...'
          );
        } else {
          console.warn('[Create FB Ad] ⚠️ VIDEO AD MISSING page_welcome_message!');
        }
      }

      const creativeUrl = `${BASE_URL}/act_${normalizedAdAccountId}/adcreatives`;
      const creativeResponse = await fetch(creativeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...creativePayload,
          access_token: adsToken
        })
      });

      const creativeData = await creativeResponse.json();
      console.log('[Create FB Ad] 📄 Creative Response:', JSON.stringify(creativeData, null, 2));

      if (!creativeResponse.ok) {
        console.error('[Create FB Ad] Creative Error:', creativeData);
        const errorMsg = creativeData.error?.error_user_msg || creativeData.error?.message || 'Failed to create ad creative';
        throw new Error(`(#${creativeData.error?.code}) ${errorMsg}`);
      }

      creativeId = creativeData.id;
      console.log('[Create FB Ad] ✅ Created creative ID from media:', creativeId);

    } else {
      // Fall back to post-based creative
      console.log('[Create FB Ad] 📝 Creating creative from post');

      // ===== DETERMINE POST ID =====
      let objectStoryId: string;

      if (resolvedPostId) {
        console.log('[Create FB Ad] 🔍 Processing resolvedPostId:', resolvedPostId);

        // ✅ Check if it's already in correct format (pageId_postId)
        const idPattern = /^\d+_\d+$/;
        if (idPattern.test(resolvedPostId)) {
          objectStoryId = resolvedPostId;
          console.log('[Create FB Ad] ✅ Already in pageId_postId format:', objectStoryId);
        }
        // ✅ Check if it's a URL → resolve it
        else if (resolvedPostId.startsWith('http://') || resolvedPostId.startsWith('https://')) {
          console.log('[Create FB Ad] 🌐 Resolving URL:', resolvedPostId);

          const resolveUrl = `${BASE_URL}/?id=${encodeURIComponent(resolvedPostId.trim())}&access_token=${adsToken}`;
          const resolveResponse = await fetch(resolveUrl);
          const resolveData = await resolveResponse.json();

          if (!resolveResponse.ok || !resolveData.id) {
            throw new Error(`Cannot resolve post URL: ${resolveData.error?.message || 'Invalid URL'}`);
          }

          objectStoryId = resolveData.id;
          console.log('[Create FB Ad] ✅ Resolved from URL:', objectStoryId);
        }
        // ✅ Only postId (digits) → construct pageId_postId
        else if (/^\d+$/.test(resolvedPostId) && pageId) {
          objectStoryId = `${pageId}_${resolvedPostId}`;
          console.log('[Create FB Ad] 🔧 Constructed from postId:', objectStoryId);
        }
        else {
          throw new Error(`Invalid resolvedPostId format: ${resolvedPostId}`);
        }
      } else if (postUrl) {
        console.log('[Create FB Ad] 🌐 Fallback: Resolving postUrl:', postUrl);

        const resolveUrl = `${BASE_URL}/?id=${encodeURIComponent(postUrl.trim())}&access_token=${adsToken}`;
        const resolveResponse = await fetch(resolveUrl);
        const resolveData = await resolveResponse.json();

        if (!resolveResponse.ok || !resolveData.id) {
          throw new Error(`Cannot resolve post URL: ${resolveData.error?.message || 'Invalid URL'}`);
        }

        objectStoryId = resolveData.id;
        console.log('[Create FB Ad] ✅ Resolved from fallback URL:', objectStoryId);
      } else {
        throw new Error('❌ Post ID or URL is required');
      }

      // ===== FINAL VALIDATION =====
      console.log('[Create FB Ad] 🎯 Pre-validation object_story_id:', objectStoryId);

      const validPattern = /^\d+_\d+$/;
      if (!validPattern.test(objectStoryId)) {
        console.error('[Create FB Ad] ❌ Invalid format. Expected: pageId_postId, Got:', objectStoryId);
        throw new Error(`Invalid object_story_id format: "${objectStoryId}". Expected format: "pageId_postId" (e.g., "159211580792822_1344718673888495")`);
      }

      console.log('[Create FB Ad] ✅ Validation passed:', objectStoryId);

      // ===== CREATE AD CREATIVE FROM POST =====
      console.log('[Create FB Ad] Using Ads Token for creative');
      const creativeParams = new URLSearchParams({
        name: `Creative - ${adName}`,
        object_story_id: objectStoryId,
        access_token: adsToken,
      });

      const creativeUrl = `${BASE_URL}/act_${normalizedAdAccountId}/adcreatives`;
      console.log('🌐 Calling Facebook API:', creativeUrl);
      console.log('📦 Creative params:', {
        name: `Creative - ${adName}`,
        object_story_id: objectStoryId,
      });

      const creativeResponse = await fetch(creativeUrl, {
        method: 'POST',
        body: creativeParams,
      });

      const creativeData = await creativeResponse.json();
      console.log('📄 Creative Response:', JSON.stringify(creativeData, null, 2));

      if (!creativeResponse.ok) {
        console.error('[Create FB Ad] Creative Error:', creativeData);
        const errorMsg = creativeData.error?.error_user_msg || creativeData.error?.message || 'Failed to create ad creative';
        throw new Error(`(#${creativeData.error?.code}) ${errorMsg}`);
      }

      creativeId = creativeData.id;
      console.log('✅ Created creative ID from post:', creativeId);
    }

    // ===== CREATE AD (LINK CREATIVE TO AD SET) =====
    console.log('');
    console.log('=== CREATE AD ===');

    const adParams = new URLSearchParams({
      name: adName,
      adset_id: adSetId,
      creative: JSON.stringify({ creative_id: creativeId }),
      status: 'ACTIVE',
      access_token: adsToken,
    });

    const adUrl = `${BASE_URL}/act_${normalizedAdAccountId}/ads`;
    console.log('🌐 Calling Facebook API:', adUrl);
    console.log('📦 Ad params:', {
      name: adName,
      adset_id: adSetId,
      creative: { creative_id: creativeId },
      status: 'ACTIVE',
    });

    const adResponse = await fetch(adUrl, {
      method: 'POST',
      body: adParams,
    });

    const adData = await adResponse.json();
    console.log('📄 Ad Response:', JSON.stringify(adData, null, 2));

    if (!adResponse.ok) {
      console.error('[Create FB Ad] Ad Error:', adData);

      // ✅ Detect missing CTA button error
      if (adData.error?.code === 100 && adData.error?.error_subcode === 1487891) {
        return new Response(JSON.stringify({
          success: false,
          error: 'MISSING_CTA_BUTTON',
          message: 'Bạn cần bổ sung thêm nút gửi tin nhắn vào bài viết mới tạo được',
          details: 'Quảng cáo tin nhắn yêu cầu bài viết phải có nút "Send Message". Vui lòng thêm CTA button vào bài viết Facebook rồi thử lại.',
          originalError: adData.error
        }), {
          status: 200, // ✅ Return 200 so supabase-js parses the body
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ✅ Other errors
      const errorMsg = adData.error?.error_user_msg || adData.error?.message || 'Failed to create ad';
      throw new Error(`(#${adData.error?.code}) ${errorMsg}`);
    }

    console.log('✅ Created ad ID:', adData.id);
    console.log('[Create FB Ad] Success! Creative:', creativeId, 'Ad:', adData.id);

    return new Response(JSON.stringify({
      success: true,
      adId: adData.id,
      creativeId: creativeId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Create FB Ad] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      message: errorMessage
    }), {
      status: 200, // ✅ Return 200 so frontend can read the error message
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
