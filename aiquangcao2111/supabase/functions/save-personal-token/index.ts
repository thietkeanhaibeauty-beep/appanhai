import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { accessToken, tokenType, validationData } = await req.json();

    if (!accessToken || !tokenType || !validationData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('💾 Saving personal token for user:', user.id);

    // Check if token already exists
    const whereClause = encodeURIComponent(`(user_id,eq,${user.id})~and(facebook_user_id,eq,${validationData.facebookUserId})`);
    const checkUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PERSONAL_TOKENS}/records?where=${whereClause}`;

    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (!checkResponse.ok) {
      throw new Error(`Failed to check existing token: ${checkResponse.status}`);
    }

    const { list } = await checkResponse.json();
    const existingToken = list.length > 0 ? list[0] : null;

    let tokenId: number;
    let action: string;

    if (existingToken) {
      // Update existing token
      console.log('🔄 Updating existing token:', existingToken.Id);

      const updateUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PERSONAL_TOKENS}/records`;
      const updateData = {
        Id: existingToken.Id,
        access_token: accessToken,
        permissions: validationData.permissions.granted,
        validation_status: 'valid',
        last_validated_at: new Date().toISOString(),
        facebook_user_name: validationData.facebookUserName,
        facebook_email: validationData.email || null,
      };

      const updateResponse = await fetch(updateUrl, {
        method: 'PATCH',
        headers: getNocoDBHeaders(),
        body: JSON.stringify(updateData),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to update token: ${updateResponse.status} - ${errorText}`);
      }

      tokenId = existingToken.Id;
      action = 'updated';

    } else {
      // Create new token
      console.log('✨ Creating new token');

      const createUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PERSONAL_TOKENS}/records`;
      const createData = {
        user_id: user.id,
        facebook_user_id: validationData.facebookUserId,
        facebook_user_name: validationData.facebookUserName,
        facebook_email: validationData.email || null,
        access_token: accessToken,
        permissions: validationData.permissions.granted,
        validation_status: 'valid',
        last_validated_at: new Date().toISOString(),
        is_active: true,
        token_type: tokenType,
      };

      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: getNocoDBHeaders(),
        body: JSON.stringify(createData),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create token: ${createResponse.status} - ${errorText}`);
      }

      const result = await createResponse.json();
      tokenId = result.Id;
      action = 'created';
    }

    // If this is a primary token, deactivate all others
    if (tokenType === 'primary') {
      console.log('🔑 Setting as primary token, deactivating others...');

      // Get all user's tokens
      const userTokensWhere = encodeURIComponent(`(user_id,eq,${user.id})`);
      const tokensUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PERSONAL_TOKENS}/records?where=${userTokensWhere}`;

      const tokensResponse = await fetch(tokensUrl, {
        method: 'GET',
        headers: getNocoDBHeaders(),
      });

      if (tokensResponse.ok) {
        const { list: allTokens } = await tokensResponse.json();

        // Deactivate all tokens except the new one
        for (const token of allTokens) {
          if (token.Id !== tokenId) {
            const deactivateUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PERSONAL_TOKENS}/records`;
            await fetch(deactivateUrl, {
              method: 'PATCH',
              headers: getNocoDBHeaders(),
              body: JSON.stringify({
                Id: token.Id,
                is_active: false,
              }),
            });
          }
        }

        console.log('✅ All other tokens deactivated');
      }
    }

    console.log(`✅ Token ${action} successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        tokenId,
        action,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error saving token:', error);
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
