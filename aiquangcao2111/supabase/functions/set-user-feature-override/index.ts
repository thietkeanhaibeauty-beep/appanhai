import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';
import { getUserFromRequest } from '../_shared/auth.ts';
import { checkSuperAdmin } from '../_shared/nocodb-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Setting user feature override');

    const user = await getUserFromRequest(req);
    console.log('✅ Authenticated user:', user.id);

    // Check if user is super admin using NocoDB
    const isSuperAdmin = await checkSuperAdmin(user.id);

    if (!isSuperAdmin) {
      console.log('❌ User is not super admin');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Super Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { targetUserId, featureKey, enabled, action } = await req.json();

    if (!targetUserId || !featureKey || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: targetUserId, featureKey, action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['set', 'remove'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "set" or "remove"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📝 Action:', action, 'for user:', targetUserId, 'feature:', featureKey);

    if (action === 'set') {
      const { data, error } = await supabase
        .from('user_feature_overrides')
        .upsert({
          user_id: targetUserId,
          feature_key: featureKey,
          enabled: enabled ?? true,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error setting user override:', error);
        throw error;
      }

      console.log('✅ User override set successfully');
      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Remove override
      const { error } = await supabase
        .from('user_feature_overrides')
        .delete()
        .eq('user_id', targetUserId)
        .eq('feature_key', featureKey);

      if (error) {
        console.error('❌ Error removing user override:', error);
        throw error;
      }

      console.log('✅ User override removed successfully');
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('❌ Error in set-user-feature-override:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
