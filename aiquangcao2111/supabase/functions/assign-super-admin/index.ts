import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting super admin assignment...');

    const { userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`👤 User ID: ${userId}`);

    // Find user role record
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const checkUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.USER_ROLES}/records?where=${whereClause}`;

    console.log('🔍 Checking existing role...');
    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (!checkResponse.ok) {
      throw new Error(`NocoDB API error: ${checkResponse.status}`);
    }

    const { list } = await checkResponse.json();
    console.log(`📊 Found ${list.length} role records`);

    if (list.length === 0) {
      // Create new super_admin role
      console.log('📝 Creating super_admin role...');
      const createResponse = await fetch(`${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.USER_ROLES}/records`, {
        method: 'POST',
        headers: getNocoDBHeaders(),
        body: JSON.stringify({
          user_id: userId,
          role: 'super_admin',
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create role: ${createResponse.status} - ${errorText}`);
      }

      console.log('✅ Super admin role created');
    } else {
      // Update existing role to super_admin
      const recordId = list[0].Id;
      console.log(`📝 Updating role record ${recordId} to super_admin...`);

      const updateResponse = await fetch(`${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.USER_ROLES}/records`, {
        method: 'PATCH',
        headers: getNocoDBHeaders(),
        body: JSON.stringify({
          Id: recordId,
          role: 'super_admin',
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to update role: ${updateResponse.status} - ${errorText}`);
      }

      console.log('✅ Role updated to super_admin');
    }

    console.log('🎉 Super admin assignment completed');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Super admin role assigned successfully',
        user_id: userId,
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
