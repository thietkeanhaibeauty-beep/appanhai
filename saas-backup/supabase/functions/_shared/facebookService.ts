// Edge function compatible Facebook service (no client imports)

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

export interface CreateAdCreativePayload {
  pageId: string;
  message: string;
  name: string;
  ctaType?: 'MESSAGE_PAGE' | 'LEARN_MORE' | 'SHOP_NOW';
  ctaLink?: string;
  messageTemplateData?: any;
}

export const facebookService = {
  /**
   * Get managed pages for the user
   */
  async getManagedPages(adsToken: string): Promise<FacebookPage[]> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v20.0/me/accounts?access_token=${adsToken}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Failed to fetch pages');
      }

      return data.data || [];
    } catch (error: any) {
      console.error('Get managed pages error:', error);
      throw error;
    }
  },

  /**
   * Get video thumbnails
   */
  async getVideoThumbnails(videoId: string, accessToken: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v20.0/${videoId}/thumbnails?access_token=${accessToken}`
      );
      const data = await response.json();

      if (data.error) {
        console.error('Get thumbnails error:', data.error);
        return null;
      }

      // Return first thumbnail URL
      return data.data?.[0]?.uri || null;
    } catch (error: any) {
      console.error('Get video thumbnails error:', error);
      return null;
    }
  },

  /**
   * Create ad creative from existing post
   */
  async createAdCreativeFromPost(
    adAccountId: string,
    objectStoryId: string,
    accessToken: string
  ): Promise<{ id: string }> {
    try {
      const payload = {
        object_story_id: objectStoryId,
      };

      const response = await fetch(
        `https://graph.facebook.com/v20.0/act_${adAccountId}/adcreatives?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Failed to create creative from post');
      }

      return { id: data.id };
    } catch (error: any) {
      console.error('Create creative from post error:', error);
      throw error;
    }
  },

  /**
   * Create ad creative for image
   */
  async createAdCreativeForImage(
    adAccountId: string,
    imageHash: string,
    payload: CreateAdCreativePayload,
    accessToken: string
  ): Promise<{ id: string }> {
    try {
      const objectStorySpec: any = {
        page_id: payload.pageId,
        link_data: {
          image_hash: imageHash,
          message: payload.message,
          name: payload.name,
          ...(payload.ctaType !== 'MESSAGE_PAGE' && {
            link: payload.ctaLink || `https://m.me/${payload.pageId}`,
            caption: payload.ctaLink || `https://m.me/${payload.pageId}`,
          }),
        },
      };

      // Add CTA if specified
      if (payload.ctaType) {
        if (payload.ctaType === 'MESSAGE_PAGE') {
          objectStorySpec.link_data.call_to_action = {
            type: 'MESSAGE_PAGE',
            value: {
              app_destination: 'MESSENGER',
            },
          };

          // Add page_welcome_message inside link_data for MESSAGE_PAGE
          if (payload.messageTemplateData) {
            objectStorySpec.link_data.page_welcome_message = payload.messageTemplateData;
          }
        } else if (payload.ctaLink) {
          objectStorySpec.link_data.call_to_action = {
            type: payload.ctaType,
            value: { link: payload.ctaLink },
          };
        }
      }

      const creativePayload: any = {
        name: payload.name,
        object_story_spec: objectStorySpec,
      };



      const response = await fetch(
        `https://graph.facebook.com/v20.0/act_${adAccountId}/adcreatives?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creativePayload),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Failed to create creative for image');
      }

      return { id: data.id };
    } catch (error: any) {
      console.error('Create creative for image error:', error);
      throw error;
    }
  },

  /**
   * Create ad creative for video
   */
  async createAdCreativeForVideo(
    adAccountId: string,
    videoId: string,
    thumbnail: string,
    payload: CreateAdCreativePayload,
    accessToken: string
  ): Promise<{ id: string }> {
    try {
      const objectStorySpec: any = {
        page_id: payload.pageId,
        video_data: {
          video_id: videoId,
          image_url: thumbnail,
          title: payload.name, // This is the headline
          message: payload.message,
        },
      };

      // Add CTA if specified
      if (payload.ctaType) {
        if (payload.ctaType === 'MESSAGE_PAGE') {
          // For MESSAGE_PAGE, set explicit app_destination for Messenger
          objectStorySpec.video_data.call_to_action = {
            type: 'MESSAGE_PAGE',
            value: {
              app_destination: 'MESSENGER',
            },
          };

          // Attach page_welcome_message for Messenger landing
          if (payload.messageTemplateData) {
            objectStorySpec.video_data.page_welcome_message = payload.messageTemplateData;
          }
        } else if (payload.ctaLink) {
          // For other CTAs, allow link in value
          objectStorySpec.video_data.call_to_action = {
            type: payload.ctaType,
            value: { link: payload.ctaLink },
          };
        }
      }

      const creativePayload: any = {
        name: payload.name,
        object_story_spec: objectStorySpec,
      };



      const response = await fetch(
        `https://graph.facebook.com/v20.0/act_${adAccountId}/adcreatives?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creativePayload),
        }
      );

      const data = await response.json();

      if (data.error) {
        // Enhanced error logging
        console.error('Facebook API Error:', {
          message: data.error.message,
          type: data.error.type,
          code: data.error.code,
          error_subcode: data.error.error_subcode,
          error_user_title: data.error.error_user_title,
          error_user_msg: data.error.error_user_msg,
          error_data: data.error.error_data,
        });

        const errorMsg = data.error.error_user_msg || data.error.message || 'Failed to create creative for video';
        throw new Error(errorMsg);
      }

      return { id: data.id };
    } catch (error: any) {
      console.error('Create creative for video error:', error);
      throw error;
    }
  },

  /**
   * Create ad (publish)
   */
  async createAd(
    adAccountId: string,
    accessToken: string,
    params: {
      name: string;
      adSetId: string;
      creativeId: string;
    }
  ): Promise<{ id: string }> {
    try {
      const payload = {
        name: params.name,
        adset_id: params.adSetId,
        creative: { creative_id: params.creativeId },
        status: 'ACTIVE',
      };

      const response = await fetch(
        `https://graph.facebook.com/v20.0/act_${adAccountId}/ads?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Failed to create ad');
      }

      return { id: data.id };
    } catch (error: any) {
      console.error('Create ad error:', error);
      throw error;
    }
  },
};
