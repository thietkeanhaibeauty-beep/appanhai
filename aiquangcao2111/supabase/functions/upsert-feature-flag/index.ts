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


    const user = await getUserFromRequest(req);


    // Check if user is super admin using NocoDB
    const isSuperAdmin = await checkSuperAdmin(user.id);

    if (!isSuperAdmin) {

      return new Response(
        JSON.stringify({ error: 'Unauthorized: Super Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { key, name, description, enabled, roleAssignments } = await req.json();

    if (!key || !name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: key, name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }



    // Upsert feature flag
    const { data: flag, error: flagError } = await supabase
      .from('feature_flags')
      .upsert({
        key,
        name,
        description,
        enabled: enabled ?? false,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (flagError) {
      console.error('❌ Error upserting feature flag:', flagError);
      throw flagError;
    }

    // Update role assignments if provided
    if (roleAssignments && Array.isArray(roleAssignments)) {


      // Delete existing role assignments for this feature
      await supabase
        .from('role_feature_flags')
        .delete()
        .eq('feature_key', key);

      // Insert new role assignments
      if (roleAssignments.length > 0) {
        const { error: roleError } = await supabase
          .from('role_feature_flags')
          .insert(
            roleAssignments.map((role: string) => ({
              role,
              feature_key: key,
              enabled: true,
            }))
          );

        if (roleError) {
          console.error('❌ Error updating role assignments:', roleError);
          throw roleError;
        }
      }
    }



    return new Response(
      JSON.stringify({ success: true, flag }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in upsert-feature-flag:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
