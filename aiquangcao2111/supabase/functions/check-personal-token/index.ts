import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FacebookUserInfo {
  id: string;
  name: string;
  email?: string;
}

interface FacebookPermission {
  permission: string;
  status: string;
}

interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
  currency: string;
}

interface Page {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('❌ Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { accessToken, tokenId } = await req.json();

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing accessToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Validating Facebook token for user:', user.id);

    // Step 1: Get user info from Facebook Graph API
    const userInfoUrl = `https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=${accessToken}`;
    const userInfoResponse = await fetch(userInfoUrl);

    if (!userInfoResponse.ok) {
      const errorData = await userInfoResponse.json();
      console.error('❌ Facebook API error:', errorData);
      return new Response(
        JSON.stringify({
          success: false,
          error: errorData.error?.message || 'Invalid token'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userInfo: FacebookUserInfo = await userInfoResponse.json();

    // Step 2: Get permissions
    const permissionsUrl = `https://graph.facebook.com/v21.0/me/permissions?access_token=${accessToken}`;
    const permissionsResponse = await fetch(permissionsUrl);

    if (!permissionsResponse.ok) {
      console.error('❌ Failed to fetch permissions');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch permissions' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const permissionsData = await permissionsResponse.json();
    const permissions: FacebookPermission[] = permissionsData.data || [];

    const grantedPermissions = permissions
      .filter((p: FacebookPermission) => p.status === 'granted')
      .map((p: FacebookPermission) => p.permission);

    const declinedPermissions = permissions
      .filter((p: FacebookPermission) => p.status === 'declined')
      .map((p: FacebookPermission) => p.permission);

    // Step 3: Fetch Ad Accounts
    console.log('📊 Fetching ad accounts...');
    const adAccountsUrl = `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,account_status,currency&access_token=${accessToken}`;
    let adAccounts: AdAccount[] = [];

    try {
      const adAccountsResponse = await fetch(adAccountsUrl);
      if (adAccountsResponse.ok) {
        const adAccountsData = await adAccountsResponse.json();
        adAccounts = adAccountsData.data || [];
        console.log(`✅ Found ${adAccounts.length} ad accounts`, adAccounts);
      } else {
        const errorData = await adAccountsResponse.json();
        console.warn('⚠️ Failed to fetch ad accounts:', errorData);
      }
    } catch (error) {
      console.warn('⚠️ Error fetching ad accounts:', error);
    }

    // Step 4: Fetch Pages
    console.log('📄 Fetching pages...');
    const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category&access_token=${accessToken}`;
    let pages: Page[] = [];

    try {
      const pagesResponse = await fetch(pagesUrl);
      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        pages = pagesData.data || [];
        console.log(`✅ Found ${pages.length} pages`);
      } else {
        console.warn('⚠️ Failed to fetch pages');
      }
    } catch (error) {
      console.warn('⚠️ Error fetching pages:', error);
    }

    // Step 5: Update validation status in NocoDB if tokenId provided
    if (tokenId) {
      const updateUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PERSONAL_TOKENS}/records`;

      const updateData = {
        Id: tokenId,
        validation_status: 'valid',
        last_validated_at: new Date().toISOString(),
        permissions: grantedPermissions,
      };

      const updateResponse = await fetch(updateUrl, {
        method: 'PATCH',
        headers: getNocoDBHeaders(),
        body: JSON.stringify(updateData),
      });

      if (!updateResponse.ok) {
        console.error('❌ Failed to update token in NocoDB:', await updateResponse.text());
      } else {
        console.log('✅ Token validation status updated in NocoDB');
      }
    }

    console.log('✅ Token validated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          facebookUserId: userInfo.id,
          facebookUserName: userInfo.name,
          email: userInfo.email || null,
          permissions: {
            granted: grantedPermissions,
            declined: declinedPermissions,
          },
          tokenInfo: {
            isValid: true,
            type: 'USER',
          },
          adAccounts: adAccounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            account_id: acc.account_id,
            account_status: acc.account_status,
            currency: acc.currency,
          })),
          pages: pages.map(page => ({
            id: page.id,
            name: page.name,
            category: page.category || 'N/A',
          })),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error validating token:', error);
    const err = error as Error;
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
