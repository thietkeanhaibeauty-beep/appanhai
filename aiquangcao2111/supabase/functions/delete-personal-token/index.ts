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

    console.log('🗑️ Deleting token:', tokenId);

    // Verify token belongs to user before deleting
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

    // Delete the token
    const deleteUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PERSONAL_TOKENS}/records`;

    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: getNocoDBHeaders(),
      body: JSON.stringify({ Id: tokenId }),
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(`Failed to delete token: ${deleteResponse.status} - ${errorText}`);
    }

    console.log('✅ Token deleted successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error deleting token:', error);
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
