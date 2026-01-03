import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default trial package configuration
const TRIAL_CONFIG = {
  package_id: 'trial',
  duration_days: 3, // 3 ngày dùng thử
  status: 'trial' as const,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    console.log('🎁 Assigning trial subscription for user:', userId);

    // Check if user already has a subscription in NocoDB
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const checkUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.USER_SUBSCRIPTIONS}/records?where=${whereClause}&limit=1`;

    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (!checkResponse.ok) {
      throw new Error(`NocoDB API error: ${checkResponse.status} ${checkResponse.statusText}`);
    }

    const { list } = await checkResponse.json();

    if (list && list.length > 0) {
      console.log('⚠️ User already has a subscription, skipping trial');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'User already has a subscription'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate trial period
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 3); // 3 days trial

    // Create trial subscription in NocoDB
    const subscriptionData = {
      user_id: userId,
      package_id: TRIAL_CONFIG.package_id,
      status: TRIAL_CONFIG.status,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      auto_renew: false,
    };

    const createUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.USER_SUBSCRIPTIONS}/records`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: getNocoDBHeaders(),
      body: JSON.stringify(subscriptionData),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create subscription: ${createResponse.status} - ${errorText}`);
    }

    const subscription = await createResponse.json();
    console.log('✅ Trial subscription created in NocoDB:', subscription);

    return new Response(
      JSON.stringify({
        success: true,
        subscription,
        message: `Trial subscription created (3 days)`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error assigning trial:', error);
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
