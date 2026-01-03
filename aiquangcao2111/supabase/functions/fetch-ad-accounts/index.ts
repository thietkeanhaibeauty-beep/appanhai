import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ Authenticate user first
    const user = await getUserFromRequest(req);
    console.log('🔐 Authenticated user:', user.id);

    const { accessToken } = await req.json();

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Access token is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Fetching ad accounts from Facebook API...');

    // Fetch ad accounts from Facebook Graph API with 30s timeout
    const fbResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,currency,timezone_name&access_token=${accessToken}`,
      { signal: AbortSignal.timeout(30000) }
    );

    console.log('Facebook API response status:', fbResponse.status);

    if (!fbResponse.ok) {
      const errorData = await fbResponse.json();
      console.error('Facebook API error:', errorData);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch ad accounts from Facebook',
          details: errorData
        }),
        {
          status: fbResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const fbData = await fbResponse.json();
    console.log(`Found ${fbData.data?.length || 0} ad accounts`);

    const accounts = (fbData.data || []).map((account: any) => ({
      id: account.id,
      name: account.name,
      account_id: account.account_id,
      currency: account.currency,
      timezone_name: account.timezone_name,
    }));

    // ✅ Save accounts to NocoDB
    console.log(`💾 Saving ${accounts.length} ad accounts to NocoDB for user: ${user.id}`);
    let savedCount = 0;

    for (const account of accounts) {
      try {
        // Check if account already exists for this user
        const checkUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS}/records?where=(user_id,eq,${user.id})~and(account_id,eq,${account.account_id})&limit=1`;
        const checkResponse = await fetch(checkUrl, {
          method: 'GET',
          headers: getNocoDBHeaders(),
        });

        const existingData = await checkResponse.json();

        if (existingData.list && existingData.list.length > 0) {
          // Update existing account
          const existingRecord = existingData.list[0];
          const updateUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS}/records`;
          const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: getNocoDBHeaders(),
            body: JSON.stringify([{
              Id: existingRecord.Id,
              account_name: account.name,
              access_token: accessToken,
              currency: account.currency,
              timezone_name: account.timezone_name,
              is_active: 1,
            }]),
          });

          if (updateResponse.ok) {
            savedCount++;
            console.log(`✅ Updated account: ${account.account_id}`);
          }
        } else {
          // Create new account
          const accountData = {
            user_id: user.id,
            account_id: account.account_id,
            account_name: account.name,
            access_token: accessToken,
            currency: account.currency,
            timezone_name: account.timezone_name,
            is_active: 1,
          };

          const createUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS}/records`;
          const saveResponse = await fetch(createUrl, {
            method: 'POST',
            headers: getNocoDBHeaders(),
            body: JSON.stringify(accountData),
          });

          if (saveResponse.ok) {
            savedCount++;
            console.log(`✅ Saved account: ${account.account_id}`);
          } else {
            const errorText = await saveResponse.text();
            console.error(`❌ Failed to save account ${account.account_id}:`, errorText);
          }
        }
      } catch (saveError) {
        console.error(`❌ Error saving account ${account.account_id}:`, saveError);
      }
    }

    console.log(`✅ Complete: Saved/Updated ${savedCount}/${accounts.length} accounts`);

    // Return response with accounts data
    return new Response(
      JSON.stringify({ accounts }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in fetch-ad-accounts function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
