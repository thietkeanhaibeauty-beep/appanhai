import { getUserFromRequest } from '../_shared/auth.ts';
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getNocoDBUrl = (tableId: string) => {
  return `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${tableId}/records`;
};

interface SystemStats {
  users: {
    total: number;
    growth: { date: string; count: number }[];
  };
  roles: {
    total: number;
    byType: { role: string; count: number }[];
  };
  tables: {
    profiles: number;
    user_roles: number;
  };
}

/**
 * Check if user has super_admin role from NocoDB
 */
async function checkSuperAdmin(userId: string): Promise<boolean> {
  try {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_ROLES)}?where=${whereClause}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch user roles:', response.status);
      return false;
    }

    const data = await response.json();
    const roles = data.list || [];

    return roles.some((r: any) => r.role === 'super_admin');
  } catch (error) {
    console.error('❌ Error checking super admin:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting get-system-stats function');

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

    console.log('✅ User is super admin, fetching system stats from NocoDB');

    // Get total users from profiles (just get pageInfo for total count)
    const profilesUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.PROFILES)}?limit=1`;
    console.log('📊 Fetching profiles from:', profilesUrl);

    const profilesResponse = await fetch(profilesUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    console.log('📊 Profiles response status:', profilesResponse.status);

    if (!profilesResponse.ok) {
      const errorText = await profilesResponse.text();
      console.error('❌ Failed to fetch profiles:', profilesResponse.status, errorText);
      throw new Error(`Failed to fetch profiles: ${profilesResponse.status} - ${errorText}`);
    }

    const profilesData = await profilesResponse.json();
    console.log('📊 Profiles data:', JSON.stringify(profilesData, null, 2));
    const totalUsers = profilesData.pageInfo?.totalRows || 0;

    // Get user growth (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const growthUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.PROFILES)}?sort=-CreatedAt`;
    const growthResponse = await fetch(growthUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    const growthData = await growthResponse.json();
    const profiles = growthData.list || [];

    // Group by date
    const growthByDate: { [key: string]: number } = {};
    profiles.forEach((profile: any) => {
      if (profile.CreatedAt) {
        const profileDate = new Date(profile.CreatedAt);
        if (profileDate >= thirtyDaysAgo) {
          const date = profileDate.toISOString().split('T')[0];
          growthByDate[date] = (growthByDate[date] || 0) + 1;
        }
      }
    });

    const userGrowth = Object.entries(growthByDate).map(([date, count]) => ({
      date,
      count,
    }));

    // Get total roles
    const rolesUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_ROLES)}?limit=1`;
    const rolesResponse = await fetch(rolesUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (!rolesResponse.ok) {
      throw new Error('Failed to fetch roles');
    }

    const rolesData = await rolesResponse.json();
    const totalRoles = rolesData.pageInfo?.totalRows || 0;

    // Get roles by type
    const rolesByTypeUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_ROLES)}`;
    const rolesByTypeResponse = await fetch(rolesByTypeUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    const rolesByTypeData = await rolesByTypeResponse.json();
    const rolesList = rolesByTypeData.list || [];

    const roleCounts: { [key: string]: number } = {};
    rolesList.forEach((r: any) => {
      if (r.role) {
        roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
      }
    });

    const rolesByTypeArray = Object.entries(roleCounts).map(([role, count]) => ({
      role,
      count,
    }));

    const stats: SystemStats = {
      users: {
        total: totalUsers,
        growth: userGrowth,
      },
      roles: {
        total: totalRoles,
        byType: rolesByTypeArray,
      },
      tables: {
        profiles: totalUsers,
        user_roles: totalRoles,
      },
    };

    console.log('✅ Successfully fetched system stats from NocoDB');

    return new Response(
      JSON.stringify({ stats }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in get-system-stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
