const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = 'u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    // 1. Check user roles
    const rolesUrl = `${NOCODB_BASE_URL}/api/v2/tables/mcd6xqgbq12msbj/records?where=(user_id,eq,${userId})`;
    const rolesResponse = await fetch(rolesUrl, {
      headers: { 'xc-token': NOCODB_API_TOKEN },
    });
    const rolesData = await rolesResponse.json();

    // 2. Check feature flags
    const flagsUrl = `${NOCODB_BASE_URL}/api/v2/tables/mbctnl9dbktdz9f/records?limit=100`;
    const flagsResponse = await fetch(flagsUrl, {
      headers: { 'xc-token': NOCODB_API_TOKEN },
    });
    const flagsData = await flagsResponse.json();

    // 3. Check role features
    const roleFlagsUrl = `${NOCODB_BASE_URL}/api/v2/tables/mskba16vzzcofe6/records?limit=100`;
    const roleFlagsResponse = await fetch(roleFlagsUrl, {
      headers: { 'xc-token': NOCODB_API_TOKEN },
    });
    const roleFlagsData = await roleFlagsResponse.json();

    // 4. If no role, create one
    let newRole = null;
    if (!rolesData.list || rolesData.list.length === 0) {
      const createRoleUrl = `${NOCODB_BASE_URL}/api/v2/tables/mcd6xqgbq12msbj/records`;
      const createRoleResponse = await fetch(createRoleUrl, {
        method: 'POST',
        headers: {
          'xc-token': NOCODB_API_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          role: 'user',
        }),
      });
      newRole = await createRoleResponse.json();
    }

    return new Response(
      JSON.stringify({
        userId,
        roles: rolesData.list || [],
        newRole,
        featureFlags: flagsData.list || [],
        roleFeatureFlags: roleFlagsData.list || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
