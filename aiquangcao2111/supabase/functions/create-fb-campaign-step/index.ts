import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignName, adsToken, adAccountId } = await req.json();

    console.log('=== Create Campaign Step 1 ===');
    console.log('Campaign Name:', campaignName);
    console.log('Ad Account ID:', adAccountId);

    if (!campaignName || !adsToken || !adAccountId) {
      throw new Error('Missing required parameters');
    }

    // Call Facebook Graph API to create campaign
    const fbApiUrl = `https://graph.facebook.com/v24.0/${adAccountId}/campaigns`;

    const params = new URLSearchParams({
      name: campaignName,
      objective: 'OUTCOME_ENGAGEMENT', // Mục tiêu lượt tương tác
      status: 'ACTIVE', // Campaign sẽ chạy ngay lập tức
      special_ad_categories: '[]', // Not a special ad category
      is_adset_budget_sharing_enabled: 'false', // Disable ad set budget sharing (required field)
      access_token: adsToken
    });

    console.log('Calling Facebook API:', fbApiUrl);

    const response = await fetch(fbApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const responseData = await response.json();
    console.log('Facebook API Response:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error('Facebook API Error:', response.status, responseData);
      throw new Error(responseData.error?.message || 'Failed to create campaign');
    }

    // Extract campaign ID from response
    const campaignId = responseData.id;

    if (!campaignId) {
      throw new Error('No campaign ID returned from Facebook');
    }

    console.log('✓ Campaign created successfully:', campaignId);
    console.log('✅ Campaign Budget Configuration:');
    console.log('  - Budget Level: AD_SET (NON-CBO)');
    console.log('  - Campaign-level budget: NONE (allows ad set scheduling)');
    console.log('  - Ad Set scheduling: ALLOWED ✓');

    return new Response(
      JSON.stringify({
        success: true,
        campaignId,
        campaignName,
        status: 'ACTIVE'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-fb-campaign-step:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
