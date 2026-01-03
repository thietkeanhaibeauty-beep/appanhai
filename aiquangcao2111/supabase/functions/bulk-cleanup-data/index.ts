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
    console.log('🔍 Starting bulk-cleanup-data function');

    // Authenticate user
    const user = await getUserFromRequest(req);
    console.log('✅ Authenticated user:', user.id);

    // Parse request body
    const { daysOld, tableName } = await req.json();

    if (!daysOld || !tableName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: daysOld, tableName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🗑️ Cleaning up data older than ${daysOld} days from ${tableName}`);

    // Check if user is super admin using NocoDB
    const isSuperAdmin = await checkSuperAdmin(user.id);

    if (!isSuperAdmin) {
      console.log('❌ User is not super admin');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Super Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User is super admin, proceeding with cleanup');

    // Initialize Supabase client for data cleanup
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Define allowed tables for cleanup (whitelist for security)
    const allowedTables = [
      'user_roles',
      'profiles',
    ];

    if (!allowedTables.includes(tableName)) {
      return new Response(
        JSON.stringify({ error: 'Table not allowed for cleanup' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete old records
    const { data, error, count } = await supabase
      .from(tableName)
      .delete({ count: 'exact' })
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      console.error('❌ Error deleting records:', error);
      throw error;
    }

    console.log(`✅ Deleted ${count} records from ${tableName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount: count || 0,
        message: `Successfully deleted ${count || 0} records older than ${daysOld} days` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in bulk-cleanup-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
