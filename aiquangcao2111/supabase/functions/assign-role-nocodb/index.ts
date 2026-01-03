import { getUserFromRequest } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOCODB_BASE_URL = Deno.env.get('NOCODB_BASE_URL') || 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = Deno.env.get('NOCODB_API_TOKEN') || 'u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij';
const USER_ROLES_TABLE = 'mcd6xqgbq12msbj';

async function assignRoleInNocoDB(userId: string, role: string) {
  // Check if role already exists
  const checkUrl = `${NOCODB_BASE_URL}/api/v2/tables/${USER_ROLES_TABLE}/records?where=(user_id,eq,${userId})~and(role,eq,${role})`;

  const checkResponse = await fetch(checkUrl, {
    headers: {
      'xc-token': NOCODB_API_TOKEN,
      'Content-Type': 'application/json',
    },
  });

  if (!checkResponse.ok) {
    throw new Error(`Failed to check existing role: ${checkResponse.status}`);
  }

  const checkData = await checkResponse.json();
  if (checkData.list && checkData.list.length > 0) {
    console.log('✅ Role already exists:', role);
    return checkData.list[0];
  }

  // Insert new role
  const insertUrl = `${NOCODB_BASE_URL}/api/v2/tables/${USER_ROLES_TABLE}/records`;

  const insertResponse = await fetch(insertUrl, {
    method: 'POST',
    headers: {
      'xc-token': NOCODB_API_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      role: role,
    }),
  });

  if (!insertResponse.ok) {
    const errorBody = await insertResponse.text();
    throw new Error(`Failed to insert role: ${insertResponse.status} - ${errorBody}`);
  }

  return await insertResponse.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Assigning role to user in NocoDB');

    const user = await getUserFromRequest(req);
    const { userId, role } = await req.json();

    const targetUserId = userId || user.id;
    const targetRole = role || 'user';

    console.log('📝 Assigning role:', { userId: targetUserId, role: targetRole });

    const result = await assignRoleInNocoDB(targetUserId, targetRole);

    console.log('✅ Role assigned successfully');

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error assigning role:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
