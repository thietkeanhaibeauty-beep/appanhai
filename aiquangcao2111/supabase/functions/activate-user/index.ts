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
    const { email } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    // Create Supabase admin client
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

    console.log(`🔍 Looking for user with email: ${email}`);

    // Get user by email
    const { data: { users }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();

    if (getUserError) {
      throw new Error(`Failed to list users: ${getUserError.message}`);
    }

    const user = users?.find(u => u.email === email);

    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }

    console.log(`✅ Found user: ${user.id}`);

    // Confirm email if not confirmed
    if (!user.email_confirmed_at) {
      console.log('📧 Confirming user email...');
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      );

      if (confirmError) {
        throw new Error(`Failed to confirm email: ${confirmError.message}`);
      }
      console.log('✅ Email confirmed');
    } else {
      console.log('✅ Email already confirmed');
    }

    // Check if user already has a role in NocoDB
    const whereClause = encodeURIComponent(`(user_id,eq,${user.id})`);
    const checkUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.USER_ROLES}/records?where=${whereClause}`;

    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (!checkResponse.ok) {
      throw new Error(`NocoDB API error: ${checkResponse.status}`);
    }

    const { list } = await checkResponse.json();
    const hasRole = list.length > 0;

    if (!hasRole) {
      // Create default 'user' role
      console.log('👤 Creating default user role...');
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
        throw new Error(`Failed to create role: ${createRoleResponse.status} - ${errorText}`);
      }

      console.log('✅ Default role created');
    } else {
      console.log('✅ User already has a role');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User activated successfully',
        user_id: user.id,
        email: user.email,
        email_confirmed: true,
        role_assigned: !hasRole ? 'user' : 'existing'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
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
