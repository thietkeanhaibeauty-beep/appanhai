import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting manual user activation...');

    const { email } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    console.log(`📧 Email to activate: ${email}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('🔍 Fetching all users...');
    const { data: { users }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();

    if (getUserError) {
      console.error('❌ Error fetching users:', getUserError);
      throw new Error(`Failed to list users: ${getUserError.message}`);
    }

    console.log(`📊 Total users found: ${users?.length || 0}`);

    const user = users?.find(u => u.email === email);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      throw new Error(`User with email ${email} not found`);
    }

    console.log(`✅ Found user:`, { id: user.id, email: user.email, confirmed: !!user.email_confirmed_at });

    // Confirm email
    if (!user.email_confirmed_at) {
      console.log('📧 Confirming email...');
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      );

      if (confirmError) {
        console.error('❌ Error confirming email:', confirmError);
        throw new Error(`Failed to confirm email: ${confirmError.message}`);
      }
      console.log('✅ Email confirmed');
    } else {
      console.log('ℹ️ Email already confirmed');
    }

    // Check NocoDB role
    console.log('🔍 Checking NocoDB role...');
    const whereClause = encodeURIComponent(`(user_id,eq,${user.id})`);
    const checkUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.USER_ROLES}/records?where=${whereClause}`;

    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (!checkResponse.ok) {
      console.error('❌ NocoDB check failed:', checkResponse.status);
      throw new Error(`NocoDB API error: ${checkResponse.status}`);
    }

    const { list } = await checkResponse.json();
    console.log(`📊 Existing roles: ${list.length}`);

    if (list.length === 0) {
      console.log('👤 Creating user role...');
      const roleData = {
        user_id: user.id,
        role: 'user',
      };

      const createRoleResponse = await fetch(`${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.USER_ROLES}/records`, {
        method: 'POST',
        headers: getNocoDBHeaders(),
        body: JSON.stringify(roleData),
      });

      if (!createRoleResponse.ok) {
        const errorText = await createRoleResponse.text();
        console.error('❌ Role creation failed:', errorText);
        throw new Error(`Failed to create role: ${createRoleResponse.status}`);
      }

      console.log('✅ User role created');
    } else {
      console.log('ℹ️ User role already exists');
    }

    console.log('🎉 User activation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User activated successfully',
        user_id: user.id,
        email: user.email,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
