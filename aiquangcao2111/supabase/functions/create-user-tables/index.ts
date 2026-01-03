import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const BASE_ID = 'p0lvt22fuj3opkl';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Creating profiles and user_roles tables in NocoDB...');

    const results = [];

    // ============= 1. Create profiles table =============
    const profilesTableSchema = {
      table_name: 'profiles',
      title: 'profiles',
      columns: [
        {
          column_name: 'id',
          title: 'id',
          uidt: 'ID',
          pk: true,
          ai: true,
        },
        {
          column_name: 'user_id',
          title: 'user_id',
          uidt: 'SingleLineText',
          rqd: true,
        },
        {
          column_name: 'email',
          title: 'email',
          uidt: 'Email',
          rqd: false,
        },
        {
          column_name: 'full_name',
          title: 'full_name',
          uidt: 'SingleLineText',
          rqd: false,
        },
        {
          column_name: 'avatar_url',
          title: 'avatar_url',
          uidt: 'URL',
          rqd: false,
        },
        {
          column_name: 'phone',
          title: 'phone',
          uidt: 'PhoneNumber',
          rqd: false,
        },
        {
          column_name: 'CreatedAt',
          title: 'CreatedAt',
          uidt: 'DateTime',
          rqd: false,
        },
        {
          column_name: 'UpdatedAt',
          title: 'UpdatedAt',
          uidt: 'DateTime',
          rqd: false,
        },
      ],
    };

    try {
      const profilesResponse = await fetch(
        `${NOCODB_BASE_URL}/api/v2/meta/bases/${BASE_ID}/tables`,
        {
          method: 'POST',
          headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profilesTableSchema),
        }
      );

      const profilesData = await profilesResponse.json();

      if (!profilesResponse.ok) {
        throw new Error(`NocoDB error: ${JSON.stringify(profilesData)}`);
      }

      results.push({
        table: 'profiles',
        success: true,
        message: '✅ Đã tạo bảng profiles',
        table_id: profilesData.id,
      });

      console.log('✅ Created profiles table:', profilesData.id);
    } catch (error: any) {
      console.error('❌ Error creating profiles table:', error);
      results.push({
        table: 'profiles',
        success: false,
        error: error?.message || 'Unknown error',
      });
    }

    // ============= 2. Create user_roles table =============
    const userRolesTableSchema = {
      table_name: 'user_roles',
      title: 'user_roles',
      columns: [
        {
          column_name: 'id',
          title: 'id',
          uidt: 'ID',
          pk: true,
          ai: true,
        },
        {
          column_name: 'user_id',
          title: 'user_id',
          uidt: 'SingleLineText',
          rqd: true,
        },
        {
          column_name: 'role',
          title: 'role',
          uidt: 'SingleSelect',
          dtxp: "'user','admin','super_admin'",
          rqd: true,
        },
        {
          column_name: 'CreatedAt',
          title: 'CreatedAt',
          uidt: 'DateTime',
          rqd: false,
        },
        {
          column_name: 'UpdatedAt',
          title: 'UpdatedAt',
          uidt: 'DateTime',
          rqd: false,
        },
      ],
    };

    try {
      const rolesResponse = await fetch(
        `${NOCODB_BASE_URL}/api/v2/meta/bases/${BASE_ID}/tables`,
        {
          method: 'POST',
          headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userRolesTableSchema),
        }
      );

      const rolesData = await rolesResponse.json();

      if (!rolesResponse.ok) {
        throw new Error(`NocoDB error: ${JSON.stringify(rolesData)}`);
      }

      results.push({
        table: 'user_roles',
        success: true,
        message: '✅ Đã tạo bảng user_roles',
        table_id: rolesData.id,
      });

      console.log('✅ Created user_roles table:', rolesData.id);
    } catch (error: any) {
      console.error('❌ Error creating user_roles table:', error);
      results.push({
        table: 'user_roles',
        success: false,
        error: error?.message || 'Unknown error',
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
