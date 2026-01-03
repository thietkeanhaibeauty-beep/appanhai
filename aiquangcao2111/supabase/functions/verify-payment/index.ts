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

    const { transactionId, userId, adminId, notes } = await req.json();

    if (!transactionId || !adminId) {
      throw new Error('transactionId and adminId are required');
    }



    // Check if admin has super_admin role
    const { data: adminRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', adminId)
      .eq('role', 'super_admin')
      .single();

    if (roleError || !adminRoles) {
      throw new Error('Unauthorized: Only super admins can verify payments');
    }

    // Get transaction details
    const { data: transaction, error: txError } = await supabaseClient
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status === 'completed') {
      throw new Error('Transaction already verified');
    }

    // Get package details
    const { data: packageData, error: pkgError } = await supabaseClient
      .from('payment_packages')
      .select('*')
      .eq('id', transaction.package_id)
      .single();

    if (pkgError || !packageData) {
      throw new Error('Package not found');
    }

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();

    // ⚠️ CRITICAL FIX: Validate and sanitize duration_days
    let rawDurationDays = packageData.duration_days;
    let durationDays = Number(rawDurationDays) || 30;

    console.log(`📅 Raw duration_days value: "${rawDurationDays}" (type: ${typeof rawDurationDays}) -> Parsed: ${durationDays}`);

    // 🛡️ VALIDATION: Cap duration at reasonable maximum (365 days = 1 year)
    if (durationDays > 365) {
      console.warn(`⚠️ SUSPICIOUS duration_days: ${durationDays} - capping to 30 days`);
      durationDays = 30;
    }
    if (durationDays <= 0) {
      console.warn(`⚠️ INVALID duration_days: ${durationDays} - defaulting to 30 days`);
      durationDays = 30;
    }

    endDate.setDate(endDate.getDate() + durationDays);
    console.log(`📅 Calculated dates: start=${startDate.toISOString()}, end=${endDate.toISOString()}, duration=${durationDays} days`);

    // Update transaction status
    const { error: updateTxError } = await supabaseClient
      .from('payment_transactions')
      .update({
        status: 'completed',
        verified_at: new Date().toISOString(),
        verified_by: adminId,
        notes: notes || null,
      })
      .eq('id', transactionId);

    if (updateTxError) {
      throw updateTxError;
    }

    // Create or update subscription
    const { data: existingSub } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', transaction.user_id)
      .eq('package_id', transaction.package_id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingSub) {
      // Extend existing subscription
      const currentEndDate = new Date(existingSub.end_date);
      const newEndDate = new Date(currentEndDate);
      newEndDate.setDate(newEndDate.getDate() + durationDays);

      const { error: updateSubError } = await supabaseClient
        .from('user_subscriptions')
        .update({
          end_date: newEndDate.toISOString(),
          auto_renew: true,
        })
        .eq('id', existingSub.id);

      if (updateSubError) {
        throw updateSubError;
      }


    } else {
      // Create new subscription
      const { error: createSubError } = await supabaseClient
        .from('user_subscriptions')
        .insert({
          user_id: transaction.user_id,
          package_id: transaction.package_id,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: true,
        });

      if (createSubError) {
        throw createSubError;
      }


    }

    // Sync to NocoDB
    try {
      const nocodbResponse = await fetch(
        `${Deno.env.get('NOCODB_BASE_URL') || 'https://db.hpb.edu.vn'}/api/v2/tables/${Deno.env.get('NOCODB_PAYMENT_TRANSACTIONS_TABLE') || 'mlzf3x531jjw8eb'}/records/${transaction.Id}`,
        {
          method: 'PATCH',
          headers: {
            'xc-token': Deno.env.get('NOCODB_API_TOKEN') || '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'completed',
            verified_at: new Date().toISOString(),
          }),
        }
      );

      if (!nocodbResponse.ok) {
        console.warn('⚠️ Failed to sync to NocoDB:', await nocodbResponse.text());
      }
    } catch (nocodbError) {
      console.warn('⚠️ NocoDB sync error (non-critical):', nocodbError);
    }



    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified and subscription activated',
        transaction,
        subscriptionEndDate: endDate.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
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
