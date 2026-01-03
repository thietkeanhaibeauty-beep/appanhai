import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    }

    // Check if user already has super_admin role
    const { data: existingRoles, error: checkError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (checkError) {
      throw new Error(`Failed to check existing roles: ${checkError.message}`);
    }

    const hasSuperAdmin = existingRoles?.some(r => r.role === 'super_admin');

    if (hasSuperAdmin) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User already has super_admin role',
          user_id: user.id,
          email: user.email
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Assign super_admin role
    console.log('👑 Assigning super_admin role...');
    const { error: insertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'super_admin'
      });

    if (insertError) {
      throw new Error(`Failed to assign super_admin role: ${insertError.message}`);
    }

    console.log('✅ Super admin role assigned successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Super admin role assigned successfully',
        user_id: user.id,
        email: user.email
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
