import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { userId, packageId, durationDays, adminId } = await req.json();

    if (!userId || !packageId) {
      throw new Error('userId and packageId are required');
    }

    // Check if admin has super_admin role
    if (adminId) {
      const { data: adminRoles, error: roleError } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', adminId)
        .eq('role', 'super_admin')
        .single();

      if (roleError || !adminRoles) {
        throw new Error('Unauthorized: Only super admins can activate subscriptions');
      }
    }

    console.log('🎁 Activating subscription:', { userId, packageId, durationDays });

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    const duration = durationDays || 30;
    endDate.setDate(endDate.getDate() + duration);

    // Check for existing active subscription
    const { data: existingSub } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingSub) {
      // Expire old subscription first
      await supabaseClient
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', existingSub.id);
    }

    // Create new subscription
    const { data: subscription, error: createError } = await supabaseClient
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        package_id: packageId,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        auto_renew: true,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Sync to NocoDB
    try {
      const nocodbResponse = await fetch(
        `${Deno.env.get('NOCODB_BASE_URL') || 'https://db.hpb.edu.vn'}/api/v2/tables/${Deno.env.get('NOCODB_USER_SUBSCRIPTIONS_TABLE') || 'm7gsmtpmfuhgagl'}/records`,
        {
          method: 'POST',
          headers: {
            'xc-token': Deno.env.get('NOCODB_API_TOKEN') || 'u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            package_id: packageId,
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            auto_renew: true,
          }),
        }
      );

      if (!nocodbResponse.ok) {
        console.warn('⚠️ Failed to sync to NocoDB:', await nocodbResponse.text());
      }
    } catch (nocodbError) {
      console.warn('⚠️ NocoDB sync error (non-critical):', nocodbError);
    }

    console.log('✅ Subscription activated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        subscription,
        message: `Subscription activated for ${duration} days`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error activating subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
