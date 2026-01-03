import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserProfile {
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

/**
 * Check if profile exists in NocoDB
 */
async function checkProfileExists(userId: string): Promise<{ exists: boolean, profileId?: number }> {
  try {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.PROFILES}/records?where=${whereClause}&limit=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (!response.ok) {
      console.error('❌ Check profile failed:', response.status, await response.text());
      return { exists: false };
    }

    const data = await response.json();
    if (data.list && data.list.length > 0) {
      return { exists: true, profileId: data.list[0].Id };
    }
    return { exists: false };
  } catch (error) {
    console.error('❌ checkProfileExists error:', error);
    return { exists: false };
  }
}

/**
 * Create or update profile in NocoDB (upsert pattern)
 */
async function upsertProfile(profileData: UserProfile): Promise<{ success: boolean, isNew: boolean }> {
  try {
    // First check if profile already exists
    const { exists, profileId } = await checkProfileExists(profileData.user_id);

    if (exists) {
      console.log(`ℹ️ Profile already exists for user ${profileData.user_id}, skipping create`);
      return { success: true, isNew: false };
    }

    // Create new profile
    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.PROFILES}/records`;

    const response = await fetch(url, {
      method: 'POST',
      headers: getNocoDBHeaders(),
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Check if it's a duplicate error
      if (errorText.includes('duplicate') || errorText.includes('already exists')) {
        console.log(`ℹ️ Profile already exists (race condition), skipping`);
        return { success: true, isNew: false };
      }
      console.error('❌ Create profile failed:', response.status, errorText);
      return { success: false, isNew: false };
    }

    console.log(`✅ Profile created for user ${profileData.user_id}`);
    return { success: true, isNew: true };
  } catch (error) {
    console.error('❌ upsertProfile error:', error);
    return { success: false, isNew: false };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }



    // Add random delay (100-300ms) to reduce race condition risk
    const delay = Math.floor(Math.random() * 200) + 100;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Check if profile already exists
    const exists = await checkProfileExists(user.id);
    if (exists) {

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Profile already exists',
          userId: user.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract profile data from user metadata
    const profileData: UserProfile = {
      user_id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
      avatar_url: user.user_metadata?.avatar_url || undefined,
    };

    // Create or update profile in NocoDB (upsert)
    const { success, isNew } = await upsertProfile(profileData);

    if (!success) {
      throw new Error('Failed to create profile in NocoDB');
    }

    // Only assign trial if this is a NEW profile
    if (!isNew) {
      console.log('ℹ️ Profile already existed, skipping trial assignment');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Profile already exists',
          userId: user.id,
          profile: profileData,
          trialAssigned: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Profile created, now assigning trial subscription...');

    // Auto-assign trial subscription for new users
    let trialAssigned = false;
    try {
      // ✅ FIX: Check ALL subscriptions (including expired) to prevent duplicate trial tokens
      // Previously only checked for active/trial, causing new trial on every login after expiry
      const subWhereClause = encodeURIComponent(`(user_id,eq,${user.id})`);
      const checkSubUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.USER_SUBSCRIPTIONS}/records?where=${subWhereClause}&limit=10`;

      const checkSubResponse = await fetch(checkSubUrl, {
        method: 'GET',
        headers: getNocoDBHeaders(),
      });

      if (checkSubResponse.ok) {
        const { list } = await checkSubResponse.json();

        // Only create trial if user has NEVER had any subscription
        if (!list || list.length === 0) {
          // No subscription exists, create trial
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 3); // 3 days trial

          const subscriptionData = {
            user_id: user.id,
            package_id: 'Trial',
            status: 'trial',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            auto_renew: false,
          };

          const createSubUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.USER_SUBSCRIPTIONS}/records`;
          const createSubResponse = await fetch(createSubUrl, {
            method: 'POST',
            headers: getNocoDBHeaders(),
            body: JSON.stringify(subscriptionData),
          });

          if (createSubResponse.ok) {
            console.log('✅ Trial subscription assigned successfully');
            trialAssigned = true;

            // =====================================================
            // ✅ ADD TRIAL TOKENS TO USER BALANCE
            // =====================================================
            const USER_BALANCES_TABLE_ID = 'mbpatk8hctj9u1o';
            const COIN_TRANSACTIONS_TABLE_ID = 'mai6u2tkuy7pumx';
            const PACKAGE_TABLE_ID = NOCODB_CONFIG.TABLES.PAYMENT_PACKAGES;

            try {
              // Step 1: Get Trial package tokens from database
              console.log('💰 Fetching Trial package tokens...');
              const pkgWhereClause = encodeURIComponent(`(name,eq,Trial)`);
              const pkgUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${PACKAGE_TABLE_ID}/records?where=${pkgWhereClause}&limit=1`;
              const pkgResponse = await fetch(pkgUrl, { headers: getNocoDBHeaders() });
              const pkgResult = await pkgResponse.json();
              const trialPackage = pkgResult.list?.[0];

              const TRIAL_TOKENS = Number(trialPackage?.tokens) || 125000; // fallback 125k
              console.log(`💰 Trial package tokens: ${TRIAL_TOKENS}`);

              // Step 2: Get or create user balance
              const balanceWhereClause = encodeURIComponent(`(user_id,eq,${user.id})`);
              const balanceUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${USER_BALANCES_TABLE_ID}/records?where=${balanceWhereClause}&limit=1`;
              const balanceResponse = await fetch(balanceUrl, { headers: getNocoDBHeaders() });
              const balanceResult = await balanceResponse.json();
              const userBalance = balanceResult.list?.[0];

              if (!userBalance) {
                // Create new balance record
                console.log(`💰 Creating new balance for user ${user.id} with ${TRIAL_TOKENS} tokens`);
                const createBalanceResponse = await fetch(
                  `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${USER_BALANCES_TABLE_ID}/records`,
                  {
                    method: 'POST',
                    headers: getNocoDBHeaders(),
                    body: JSON.stringify({
                      user_id: user.id,
                      balance: TRIAL_TOKENS,
                      total_deposited: TRIAL_TOKENS,
                      total_spent: 0,
                    }),
                  }
                );
                if (createBalanceResponse.ok) {
                  console.log(`✅ Created balance with ${TRIAL_TOKENS} tokens for new trial user`);
                } else {
                  console.error('❌ Failed to create balance:', await createBalanceResponse.text());
                }
              } else {
                // Update existing balance
                const currentBalance = Number(userBalance.balance) || 0;
                const currentTotalDeposited = Number(userBalance.total_deposited) || 0;
                const newBalance = currentBalance + TRIAL_TOKENS;
                const newTotalDeposited = currentTotalDeposited + TRIAL_TOKENS;

                console.log(`💰 Updating balance: ${currentBalance} + ${TRIAL_TOKENS} = ${newBalance}`);
                await fetch(
                  `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${USER_BALANCES_TABLE_ID}/records`,
                  {
                    method: 'PATCH',
                    headers: getNocoDBHeaders(),
                    body: JSON.stringify([{
                      Id: userBalance.Id,
                      balance: newBalance,
                      total_deposited: newTotalDeposited,
                    }]),
                  }
                );
                console.log(`✅ Updated balance to ${newBalance} tokens`);
              }

              // Step 3: Record coin transaction
              await fetch(
                `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${COIN_TRANSACTIONS_TABLE_ID}/records`,
                {
                  method: 'POST',
                  headers: getNocoDBHeaders(),
                  body: JSON.stringify({
                    user_id: user.id,
                    type: 'deposit',
                    amount: TRIAL_TOKENS,
                    description: `Gói Trial: +${TRIAL_TOKENS.toLocaleString()} tokens`,
                    reference_id: 'trial_subscription',
                    created_at: new Date().toISOString(),
                  }),
                }
              );
              console.log(`✅ Recorded trial token deposit for user ${user.id}`);
            } catch (balanceError) {
              console.error('⚠️ Error adding trial tokens (non-critical):', balanceError);
            }
            // =====================================================
          } else {

            console.error('⚠️ Failed to assign trial subscription:', await createSubResponse.text());
          }
        } else {
          console.log('ℹ️ User already has subscription, skipping trial');
        }
      }
    } catch (subError) {
      console.error('⚠️ Error assigning trial (non-critical):', subError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profile synced successfully',
        userId: user.id,
        profile: profileData,
        trialAssigned
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Sync profile error:', error);
    const err = error as Error;
    return new Response(
      JSON.stringify({
        error: err.message || 'Internal server error',
        details: err.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
