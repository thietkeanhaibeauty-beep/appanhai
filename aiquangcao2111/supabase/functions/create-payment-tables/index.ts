const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const BASE_ID = 'p0lvt22fuj3opkl';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Creating payment tables in NocoDB...');

    const results = [];

    // ============= 1. Create payment_packages table =============
    const packagesTableSchema = {
      table_name: 'payment_packages',
      title: 'payment_packages',
      columns: [
        {
          column_name: 'id',
          title: 'id',
          uidt: 'ID',
          pk: true,
          ai: true,
        },
        {
          column_name: 'name',
          title: 'name',
          uidt: 'SingleLineText',
          rqd: true,
        },
        {
          column_name: 'description',
          title: 'description',
          uidt: 'LongText',
          rqd: false,
        },
        {
          column_name: 'price',
          title: 'price',
          uidt: 'Number',
          rqd: true,
        },
        {
          column_name: 'currency',
          title: 'currency',
          uidt: 'SingleLineText',
          rqd: false,
        },
        {
          column_name: 'duration_days',
          title: 'duration_days',
          uidt: 'Number',
          rqd: true,
        },
        {
          column_name: 'features',
          title: 'features',
          uidt: 'LongText',
          rqd: false,
        },
        {
          column_name: 'is_active',
          title: 'is_active',
          uidt: 'Checkbox',
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
      const packagesResponse = await fetch(
        `${NOCODB_BASE_URL}/api/v2/meta/bases/${BASE_ID}/tables`,
        {
          method: 'POST',
          headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(packagesTableSchema),
        }
      );

      const packagesData = await packagesResponse.json();

      if (!packagesResponse.ok) {
        throw new Error(`NocoDB error: ${JSON.stringify(packagesData)}`);
      }

      results.push({
        table: 'payment_packages',
        success: true,
        message: '✅ Đã tạo bảng payment_packages',
        table_id: packagesData.id,
      });

      console.log('✅ Created payment_packages table:', packagesData.id);
    } catch (error: any) {
      console.error('❌ Error creating payment_packages table:', error);
      results.push({
        table: 'payment_packages',
        success: false,
        error: error?.message || 'Unknown error',
      });
    }

    // ============= 2. Create payment_settings table =============
    const settingsTableSchema = {
      table_name: 'payment_settings',
      title: 'payment_settings',
      columns: [
        {
          column_name: 'id',
          title: 'id',
          uidt: 'ID',
          pk: true,
          ai: true,
        },
        {
          column_name: 'setting_key',
          title: 'setting_key',
          uidt: 'SingleLineText',
          rqd: true,
        },
        {
          column_name: 'setting_value',
          title: 'setting_value',
          uidt: 'LongText',
          rqd: true,
        },
        {
          column_name: 'description',
          title: 'description',
          uidt: 'LongText',
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
      const settingsResponse = await fetch(
        `${NOCODB_BASE_URL}/api/v2/meta/bases/${BASE_ID}/tables`,
        {
          method: 'POST',
          headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settingsTableSchema),
        }
      );

      const settingsData = await settingsResponse.json();

      if (!settingsResponse.ok) {
        throw new Error(`NocoDB error: ${JSON.stringify(settingsData)}`);
      }

      results.push({
        table: 'payment_settings',
        success: true,
        message: '✅ Đã tạo bảng payment_settings',
        table_id: settingsData.id,
      });

      console.log('✅ Created payment_settings table:', settingsData.id);
    } catch (error: any) {
      console.error('❌ Error creating payment_settings table:', error);
      results.push({
        table: 'payment_settings',
        success: false,
        error: error?.message || 'Unknown error',
      });
    }

    // ============= 3. Create user_payments table =============
    const userPaymentsTableSchema = {
      table_name: 'user_payments',
      title: 'user_payments',
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
          column_name: 'package_id',
          title: 'package_id',
          uidt: 'Number',
          rqd: true,
        },
        {
          column_name: 'amount',
          title: 'amount',
          uidt: 'Number',
          rqd: true,
        },
        {
          column_name: 'currency',
          title: 'currency',
          uidt: 'SingleLineText',
          rqd: false,
        },
        {
          column_name: 'status',
          title: 'status',
          uidt: 'SingleSelect',
          dtxp: "'pending','completed','failed','refunded'",
          rqd: true,
        },
        {
          column_name: 'payment_method',
          title: 'payment_method',
          uidt: 'SingleLineText',
          rqd: false,
        },
        {
          column_name: 'transaction_id',
          title: 'transaction_id',
          uidt: 'SingleLineText',
          rqd: false,
        },
        {
          column_name: 'start_date',
          title: 'start_date',
          uidt: 'DateTime',
          rqd: false,
        },
        {
          column_name: 'end_date',
          title: 'end_date',
          uidt: 'DateTime',
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
      const userPaymentsResponse = await fetch(
        `${NOCODB_BASE_URL}/api/v2/meta/bases/${BASE_ID}/tables`,
        {
          method: 'POST',
          headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userPaymentsTableSchema),
        }
      );

      const userPaymentsData = await userPaymentsResponse.json();

      if (!userPaymentsResponse.ok) {
        throw new Error(`NocoDB error: ${JSON.stringify(userPaymentsData)}`);
      }

      results.push({
        table: 'user_payments',
        success: true,
        message: '✅ Đã tạo bảng user_payments',
        table_id: userPaymentsData.id,
      });

      console.log('✅ Created user_payments table:', userPaymentsData.id);
    } catch (error: any) {
      console.error('❌ Error creating user_payments table:', error);
      results.push({
        table: 'user_payments',
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
