const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const USER_ROLES_TABLE = 'm7fkz8rlwuizquy';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Fixing user roles in NocoDB');

    // Get all users without roles from Supabase
    const users = [
      '11a4b80e-11f1-443a-bb32-7a393cab69f5', // 888nthanhdtx
      '7730da26-ab33-4d29-a5f6-7f20c6525384', // 99nthanhdtx
      '3690fbad-b84c-49ce-ad30-3390a2e365b0', // 5nthanhdtx
      '7353c548-ea16-4864-93be-9dddc61de2ba', // 1nthanhdtx
    ];

    const results = [];

    for (const userId of users) {
      try {
        // Check if role exists
        const checkUrl = `${NOCODB_BASE_URL}/api/v2/tables/${USER_ROLES_TABLE}/records?where=(user_id,eq,${userId})`;

        const checkResponse = await fetch(checkUrl, {
          headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json',
          },
        });

        const checkData = await checkResponse.json();

        if (checkData.list && checkData.list.length > 0) {
          console.log('✅ Role already exists for user:', userId);
          results.push({ userId, status: 'exists', role: checkData.list[0] });
          continue;
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
            role: 'user',
          }),
        });

        if (insertResponse.ok) {
          const newRole = await insertResponse.json();
          console.log('✅ Role created for user:', userId);
          results.push({ userId, status: 'created', role: newRole });
        } else {
          console.error('❌ Failed to create role for user:', userId);
          results.push({ userId, status: 'failed' });
        }
      } catch (error) {
        console.error('❌ Error processing user:', userId, error);
        results.push({ userId, status: 'error', error: error instanceof Error ? error.message : String(error) });
      }
    }

    console.log('✅ Role fix completed:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error fixing roles:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
