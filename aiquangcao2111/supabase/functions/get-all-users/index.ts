import { getUserFromRequest } from '../_shared/auth.ts';
import { checkSuperAdmin } from '../_shared/nocodb-auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// NocoDB Configuration
const NOCODB_CONFIG = {
  BASE_URL: 'https://db.hpb.edu.vn',
  API_TOKEN: '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
  TABLES: {
    USER_ROLES: 'm7fkz8rlwuizquy',
    PROFILES: 'mlcrus3sfhchdhw',
  }
};

const getNocoDBHeaders = () => ({
  'xc-token': NOCODB_CONFIG.API_TOKEN,
  'Content-Type': 'application/json',
});

const getNocoDBUrl = (tableId: string) => {
  return `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${tableId}/records`;
};

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting get-all-users function');

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

    console.log('✅ User is super admin, fetching all users');

    // Initialize Supabase Admin Client to fetch users from auth.users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get all users from Supabase Auth
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Failed to fetch auth users:', authError);
      throw new Error(`Failed to fetch auth users: ${authError.message}`);
    }

    // Get all profiles from NocoDB
    const profilesUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.PROFILES)}`;
    const profilesResponse = await fetch(profilesUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    const profilesData = profilesResponse.ok ? await profilesResponse.json() : { list: [] };
    const profiles = profilesData.list || [];

    // Get all user roles from NocoDB
    const rolesUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_ROLES)}`;
    const rolesResponse = await fetch(rolesUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    const rolesData = rolesResponse.ok ? await rolesResponse.json() : { list: [] };
    const roles = rolesData.list || [];

    // Combine auth users with their profiles and roles
    const usersWithRoles: UserWithRoles[] = authUsers.users.map((authUser: any) => {
      const profile = profiles.find((p: any) => p.user_id === authUser.id);
      const userRoles = roles
        .filter((role: any) => role.user_id === authUser.id)
        .map((role: any) => role.role);

      return {
        id: authUser.id,
        email: authUser.email || '',
        full_name: profile?.full_name || authUser.user_metadata?.full_name || '',
        created_at: profile?.CreatedAt1 || profile?.CreatedAt || authUser.created_at, // Use NocoDB date first
        roles: userRoles,
      };
    });

    console.log(`✅ Successfully fetched ${usersWithRoles.length} users`);

    return new Response(
      JSON.stringify({ users: usersWithRoles }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in get-all-users:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
