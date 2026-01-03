import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOCODB_API_URL = Deno.env.get('NOCODB_API_URL');
const NOCODB_API_TOKEN = Deno.env.get('NOCODB_API_TOKEN');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromRequest(req);
    const { operation } = await req.json();

    console.log(`[NocoDB Sync] Operation: ${operation} for user: ${user.id}`);

    if (operation === 'load') {
      // Load user settings from NocoDB
      const settings: any = {};

      // Fetch Facebook Ad Accounts
      try {
        const adAccountsUrl = `${NOCODB_API_URL}/api/v2/tables/m6aejkpgvqz7gzq/records?where=(user_id,eq,${user.id})&limit=1`;
        const adAccountsResponse = await fetch(adAccountsUrl, {
          headers: {
            'xc-token': NOCODB_API_TOKEN || '',
          },
        });

        if (adAccountsResponse.ok) {
          const adAccountsData = await adAccountsResponse.json();
          if (adAccountsData.list && adAccountsData.list.length > 0) {
            settings.selected_ad_account_id = adAccountsData.list[0].ad_account_id;
            settings.facebook_ads_token = adAccountsData.list[0].access_token;
          }
        }
      } catch (e) {
        console.error('[NocoDB Sync] Error fetching ad accounts:', e);
      }

      // Fetch Facebook Pages
      try {
        const pagesUrl = `${NOCODB_API_URL}/api/v2/tables/m7b0rz3xd66rcm1/records?where=(user_id,eq,${user.id})&limit=1`;
        const pagesResponse = await fetch(pagesUrl, {
          headers: {
            'xc-token': NOCODB_API_TOKEN || '',
          },
        });

        if (pagesResponse.ok) {
          const pagesData = await pagesResponse.json();
          if (pagesData.list && pagesData.list.length > 0) {
            settings.selected_page_id = pagesData.list[0].page_id;
            settings.facebook_page_token = pagesData.list[0].access_token;
          }
        }
      } catch (e) {
        console.error('[NocoDB Sync] Error fetching pages:', e);
      }

      // Fetch OpenAI Settings
      try {
        const openaiUrl = `${NOCODB_API_URL}/api/v2/tables/mdemuc9wbwdkq1j/records?where=(user_id,eq,${user.id})&limit=1`;
        const openaiResponse = await fetch(openaiUrl, {
          headers: {
            'xc-token': NOCODB_API_TOKEN || '',
          },
        });

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          if (openaiData.list && openaiData.list.length > 0) {
            settings.openai_api_key = openaiData.list[0].openai_api_key;
            settings.openai_model = openaiData.list[0].openai_model;
          }
        }
      } catch (e) {
        console.error('[NocoDB Sync] Error fetching OpenAI settings:', e);
      }

      console.log('[NocoDB Sync] Settings loaded:', {
        hasAdsToken: !!settings.facebook_ads_token,
        hasPageToken: !!settings.facebook_page_token,
        hasAdAccountId: !!settings.selected_ad_account_id,
        hasPageId: !!settings.selected_page_id,
      });

      return new Response(JSON.stringify({ success: true, settings }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid operation' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[NocoDB Sync] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
