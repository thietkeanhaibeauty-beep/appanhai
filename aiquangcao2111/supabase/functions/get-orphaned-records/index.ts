import { getUserFromRequest } from '../_shared/auth.ts';
import { checkSuperAdmin } from '../_shared/nocodb-auth.ts';
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getNocoDBUrl = (tableId: string) => {
  return `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${tableId}/records`;
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting get-orphaned-records function');

    // Authenticate user
    const user = await getUserFromRequest(req);
    console.log('✅ Authenticated user:', user.id);

    // Check if user is super admin using NocoDB
    const isSuperAdmin = await checkSuperAdmin(user.id);

    if (!isSuperAdmin) {
      console.log('❌ User is not super admin');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Super Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User is super admin, finding orphaned records from NocoDB');

    // Get all user_roles from NocoDB
    const rolesUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_ROLES)}`;
    const rolesResponse = await fetch(rolesUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (!rolesResponse.ok) {
      const errorText = await rolesResponse.text();
      throw new Error(`Failed to fetch roles: ${rolesResponse.status} - ${errorText}`);
    }

    const rolesData = await rolesResponse.json();
    const allRoles = rolesData.list || [];

    // Get all profiles from NocoDB
    const profilesUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.PROFILES)}`;
    const profilesResponse = await fetch(profilesUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (!profilesResponse.ok) {
      const errorText = await profilesResponse.text();
      throw new Error(`Failed to fetch profiles: ${profilesResponse.status} - ${errorText}`);
    }

    const profilesData = await profilesResponse.json();
    const allProfiles = profilesData.list || [];

    const profileIds = new Set(allProfiles.map((p: any) => p.user_id) || []);

    // Find roles with non-existent users
    const orphanedRoles = allRoles.filter(
      (role: any) => !profileIds.has(role.user_id)
    );

    console.log(`✅ Found ${orphanedRoles.length} orphaned role records`);

    return new Response(
      JSON.stringify({
        success: true,
        orphanedRoles: orphanedRoles.length,
        details: {
          user_roles: orphanedRoles.length,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in get-orphaned-records:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
