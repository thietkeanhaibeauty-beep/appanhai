import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ===== AI POST VALIDATOR SERVICE =====
const aiPostValidatorService = {
  async validatePostId(postInput: string, accessToken: string): Promise<{
    success: boolean;
    pageId?: string;
    postId?: string;
    fullPostId?: string;
    error?: string;
  }> {
    try {
      // Format 1: Full URL
      if (postInput.includes('facebook.com')) {
        const urlMatch = postInput.match(/posts\/(\d+)/);
        const permalinkMatch = postInput.match(/story_fbid=(\d+).*id=(\d+)/);

        if (urlMatch) {
          const postId = urlMatch[1];
          const pageId = await this.fetchPageIdFromPostId(postId, accessToken);
          return {
            success: true,
            pageId,
            postId,
            fullPostId: `${pageId}_${postId}`
          };
        } else if (permalinkMatch) {
          const postId = permalinkMatch[1];
          const pageId = permalinkMatch[2];
          return {
            success: true,
            pageId,
            postId,
            fullPostId: `${pageId}_${postId}`
          };
        }

        return { success: false, error: 'Invalid post URL format' };
      }

      // Format 2: pageId_postId
      if (postInput.includes('_')) {
        const [pageId, postId] = postInput.split('_');
        return {
          success: true,
          pageId,
          postId,
          fullPostId: postInput
        };
      }

      // Format 3: Numeric post ID only
      const postId = postInput;
      const pageId = await this.fetchPageIdFromPostId(postId, accessToken);
      return {
        success: true,
        pageId,
        postId,
        fullPostId: `${pageId}_${postId}`
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async fetchPageIdFromPostId(postId: string, accessToken: string): Promise<string> {
    const url = `https://graph.facebook.com/v21.0/${postId}?fields=from&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.from?.id || '';
  }
};

// ===== FACEBOOK SERVICE =====
const facebookService = {
  async createCampaign(
    adAccountId: string,
    name: string,
    objective: string,
    accessToken: string
  ): Promise<{ id: string }> {
    const payload = {
      name,
      objective,
      status: 'ACTIVE',
      special_ad_categories: [],
      access_token: accessToken,
    };

    const response = await fetch(
      `https://graph.facebook.com/v20.0/act_${adAccountId}/campaigns`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'Failed to create campaign');
    }

    return { id: data.id };
  },

  async createAdSet(
    adAccountId: string,
    campaignId: string,
    name: string,
    dailyBudget: number,
    targeting: any,
    pageId: string,
    accessToken: string
  ): Promise<{ id: string }> {
    const dailyBudgetCents = Math.round(dailyBudget * 100);

    const payload = {
      name,
      campaign_id: campaignId,
      daily_budget: dailyBudgetCents,
      targeting,
      optimization_goal: 'LINK_CLICKS',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      destination_type: 'WEBSITE',
      promoted_object: { page_id: pageId },
      status: 'ACTIVE',
      access_token: accessToken,
    };

    const response = await fetch(
      `https://graph.facebook.com/v20.0/act_${adAccountId}/adsets`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'Failed to create adset');
    }

    return { id: data.id };
  },

  async createAdCreativeFromPost(
    adAccountId: string,
    objectStoryId: string,
    accessToken: string
  ): Promise<{ id: string }> {
    const payload = {
      name: `Creative for ${objectStoryId}`,
      object_story_id: objectStoryId,
      access_token: accessToken,
    };

    const response = await fetch(
      `https://graph.facebook.com/v20.0/act_${adAccountId}/adcreatives`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'Failed to create creative');
    }

    return { id: data.id };
  },

  async createAd(
    adAccountId: string,
    accessToken: string,
    params: { name: string; adSetId: string; creativeId: string }
  ): Promise<{ id: string }> {
    const payload = {
      name: params.name,
      adset_id: params.adSetId,
      creative: { creative_id: params.creativeId },
      status: 'ACTIVE',
      access_token: accessToken,
    };

    const response = await fetch(
      `https://graph.facebook.com/v20.0/act_${adAccountId}/ads`,
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
  }
};

// ===== NOCODB HELPER =====
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

async function loadUserSettings(userId: string) {
  // Load Facebook Ad Accounts
  const adAccountsUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS}/records?where=(user_id,eq,${userId})~and(is_active,eq,1)&limit=1`;
  const adAccountsResponse = await fetch(adAccountsUrl, {
    headers: getNocoDBHeaders()
  });
  const adAccountsData = await adAccountsResponse.json();
  const adAccount = adAccountsData.list?.[0];

  // Load Facebook Pages
  const pagesUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PAGES}/records?where=(user_id,eq,${userId})&limit=1`;
  const pagesResponse = await fetch(pagesUrl, {
    headers: getNocoDBHeaders()
  });
  const pagesData = await pagesResponse.json();
  const page = pagesData.list?.[0];

  if (!adAccount || !page) {
    throw new Error('Missing Facebook configuration. Please configure in Settings.');
  }

  return {
    adAccountId: adAccount.account_id?.replace('act_', ''),
    adsToken: adAccount.access_token,
    pageId: page.page_id,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { parsedData } = await req.json();

    console.log('🚀 Orchestrate Quick Ad - User:', user.id);
    console.log('📋 Campaign Type:', parsedData.campaignType);
    console.log('📝 Campaign Name:', parsedData.campaignName);

    // ⭐ Load settings server-side (không lộ token ra client)
    const settings = await loadUserSettings(user.id);
    console.log('✅ Loaded settings for user:', user.id);

    // Step 1: Validate POST (nếu là POST campaign)
    let validatedPost = null;
    if (parsedData.campaignType === 'post' && parsedData.postUrl) {
      console.log('🔍 Validating POST:', parsedData.postUrl);

      const validation = await aiPostValidatorService.validatePostId(
        parsedData.postUrl,
        settings.adsToken
      );

      if (!validation.success) {
        throw new Error(validation.error || 'Invalid post URL');
      }

      validatedPost = validation;
      console.log('✅ POST validated:', validatedPost.fullPostId);
    }

    // Step 2: Create Campaign
    console.log('📢 Creating Campaign...');
    const campaign = await facebookService.createCampaign(
      settings.adAccountId,
      parsedData.campaignName,
      'OUTCOME_TRAFFIC',
      settings.adsToken
    );
    console.log('✅ Campaign created:', campaign.id);

    // Step 3: Create AdSet
    console.log('🎯 Creating AdSet...');
    const targeting: any = {
      age_min: parsedData.ageMin || 18,
      age_max: parsedData.ageMax || 65,
    };

    if (parsedData.gender && parsedData.gender !== 'all') {
      targeting.genders = [parsedData.gender === 'male' ? 1 : 2];
    }

    // Add location
    if (parsedData.locationType === 'coordinate' && parsedData.latitude && parsedData.longitude) {
      targeting.geo_locations = {
        custom_locations: [{
          latitude: parsedData.latitude,
          longitude: parsedData.longitude,
          radius: parsedData.radiusKm || 5,
          distance_unit: 'kilometer'
        }]
      };
    } else if (parsedData.resolvedLocation) {
      if (parsedData.locationType === 'country') {
        targeting.geo_locations = {
          countries: [parsedData.resolvedLocation.country_code]
        };
      } else if (parsedData.locationType === 'city') {
        targeting.geo_locations = {
          cities: [{ key: parsedData.resolvedLocation.key }]
        };
      }
    }

    // Add interests
    if (parsedData.resolvedInterests && parsedData.resolvedInterests.length > 0) {
      targeting.flexible_spec = [{
        interests: parsedData.resolvedInterests.map((i: any) => ({ id: i.id, name: i.name }))
      }];
    }

    const adset = await facebookService.createAdSet(
      settings.adAccountId,
      campaign.id,
      `AdSet - ${parsedData.campaignName}`,
      parsedData.budget || 50000,
      targeting,
      settings.pageId,
      settings.adsToken
    );
    console.log('✅ AdSet created:', adset.id);

    // Step 4: Create Creative
    console.log('🎨 Creating Creative...');
    const creative = await facebookService.createAdCreativeFromPost(
      settings.adAccountId,
      validatedPost!.fullPostId!,
      settings.adsToken
    );
    console.log('✅ Creative created:', creative.id);

    // Step 5: Create Ad
    console.log('📣 Creating Ad...');
    const ad = await facebookService.createAd(
      settings.adAccountId,
      settings.adsToken,
      {
        name: `Ad - ${parsedData.campaignName}`,
        adSetId: adset.id,
        creativeId: creative.id
      }
    );
    console.log('✅ Ad created:', ad.id);

    console.log('🎉 Campaign creation completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        campaignId: campaign.id,
        adSetId: adset.id,
        creativeId: creative.id,
        adId: ad.id,
        message: 'Campaign created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Orchestrate Quick Ad Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
