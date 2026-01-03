import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';
import { getUserFromRequest } from '../_shared/auth.ts';
import { checkSuperAdmin } from '../_shared/nocodb-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {


    // Authenticate user
    const user = await getUserFromRequest(req);


    // Parse request body
    const { userId, action, role } = await req.json();

    if (!userId || !action || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, action, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['assign', 'remove'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "assign" or "remove"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['user', 'admin', 'super_admin'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be "user", "admin", or "super_admin"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }



    // Check if user is super admin using NocoDB
    const isSuperAdmin = await checkSuperAdmin(user.id);

    if (!isSuperAdmin) {

      return new Response(
        JSON.stringify({ error: 'Unauthorized: Super Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }



    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);



    // Perform action
    if (action === 'assign') {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        // Check if it's a duplicate key error
        if (error.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'User already has this role' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.error('❌ Error assigning role:', error);
        throw error;
      }


      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Remove role
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) {
        console.error('❌ Error removing role:', error);
        throw error;
      }


      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('❌ Error in update-user-role:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
