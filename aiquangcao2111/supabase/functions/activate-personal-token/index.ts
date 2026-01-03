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

    const { tokenId } = await req.json();

    if (!tokenId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing tokenId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Activating token:', tokenId);

    // Verify token belongs to user
    const whereClause = encodeURIComponent(`(Id,eq,${tokenId})~and(user_id,eq,${user.id})`);
    const checkUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PERSONAL_TOKENS}/records?where=${whereClause}`;

    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (!checkResponse.ok) {
      throw new Error('Failed to verify token ownership');
    }

    const { list } = await checkResponse.json();
    if (list.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all user's tokens
    const userTokensWhere = encodeURIComponent(`(user_id,eq,${user.id})`);
    const tokensUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PERSONAL_TOKENS}/records?where=${userTokensWhere}`;

    const tokensResponse = await fetch(tokensUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (!tokensResponse.ok) {
      throw new Error('Failed to fetch user tokens');
    }

    const { list: allTokens } = await tokensResponse.json();

    // Deactivate all tokens, then activate the selected one
    const updateUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PERSONAL_TOKENS}/records`;

    for (const token of allTokens) {
      await fetch(updateUrl, {
        method: 'PATCH',
        headers: getNocoDBHeaders(),
        body: JSON.stringify({
          Id: token.Id,
          is_active: token.Id === tokenId,
        }),
      });
    }

    console.log('✅ Token activated successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error activating token:', error);
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
