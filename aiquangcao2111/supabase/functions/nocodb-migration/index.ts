import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const BASE_ID = 'p0lvt22fuj3opkl';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TableSchema {
  title: string;
  columns: any[];
}

const TABLES_TO_CREATE: Record<string, TableSchema> = {
  profiles: {
    title: 'profiles',
    columns: [
      { column_name: 'id', title: 'Id', uidt: 'ID' },
      { column_name: 'user_id', title: 'user_id', uidt: 'SingleLineText', rqd: true, unique: true },
      { column_name: 'email', title: 'email', uidt: 'Email', rqd: true },
      { column_name: 'full_name', title: 'full_name', uidt: 'SingleLineText' },
      { column_name: 'avatar_url', title: 'avatar_url', uidt: 'URL' },
      { column_name: 'created_at', title: 'created_at', uidt: 'DateTime', default: 'now()' },
      { column_name: 'updated_at', title: 'updated_at', uidt: 'DateTime', default: 'now()' }
    ]
  },
  user_subscriptions: {
    title: 'user_subscriptions',
    columns: [
      { column_name: 'id', title: 'Id', uidt: 'ID' },
      { column_name: 'user_id', title: 'user_id', uidt: 'SingleLineText', rqd: true },
      { column_name: 'package_id', title: 'package_id', uidt: 'SingleLineText', rqd: true },
      { column_name: 'status', title: 'status', uidt: 'SingleSelect', dtxp: "'active','expired','cancelled','trial'", default: 'trial' },
      { column_name: 'start_date', title: 'start_date', uidt: 'DateTime', rqd: true },
      { column_name: 'end_date', title: 'end_date', uidt: 'DateTime', rqd: true },
      { column_name: 'auto_renew', title: 'auto_renew', uidt: 'Checkbox', default: false },
      { column_name: 'created_at', title: 'created_at', uidt: 'DateTime', default: 'now()' },
      { column_name: 'updated_at', title: 'updated_at', uidt: 'DateTime', default: 'now()' }
    ]
  },
  payment_transactions: {
    title: 'payment_transactions',
    columns: [
      { column_name: 'id', title: 'Id', uidt: 'ID' },
      { column_name: 'user_id', title: 'user_id', uidt: 'SingleLineText', rqd: true },
      { column_name: 'subscription_id', title: 'subscription_id', uidt: 'SingleLineText' },
      { column_name: 'amount', title: 'amount', uidt: 'Number', rqd: true },
      { column_name: 'currency', title: 'currency', uidt: 'SingleLineText', default: 'VND' },
      { column_name: 'payment_method', title: 'payment_method', uidt: 'SingleSelect', dtxp: "'stripe','vnpay','bank_transfer'" },
      { column_name: 'payment_gateway_id', title: 'payment_gateway_id', uidt: 'SingleLineText' },
      { column_name: 'status', title: 'status', uidt: 'SingleSelect', dtxp: "'pending','completed','failed','refunded'", default: 'pending' },
      { column_name: 'created_at', title: 'created_at', uidt: 'DateTime', default: 'now()' },
      { column_name: 'completed_at', title: 'completed_at', uidt: 'DateTime' }
    ]
  },
  sales_reports: {
    title: 'sales_reports',
    columns: [
      { column_name: 'id', title: 'Id', uidt: 'ID' },
      { column_name: 'user_id', title: 'user_id', uidt: 'SingleLineText', rqd: true },
      { column_name: 'report_date', title: 'report_date', uidt: 'Date', rqd: true },
      { column_name: 'total_spend', title: 'total_spend', uidt: 'Number', default: 0 },
      { column_name: 'total_revenue', title: 'total_revenue', uidt: 'Number', default: 0 },
      { column_name: 'total_conversions', title: 'total_conversions', uidt: 'Number', default: 0 },
      { column_name: 'roas', title: 'roas', uidt: 'Decimal', default: 0 },
      { column_name: 'created_at', title: 'created_at', uidt: 'DateTime', default: 'now()' }
    ]
  }
};

async function createTable(tableName: string, schema: TableSchema): Promise<string> {
  console.log(`🔨 Creating table: ${tableName}...`);

  const response = await fetch(
    `${NOCODB_URL}/api/v2/meta/bases/${BASE_ID}/tables`,
    {
      method: 'POST',
      headers: {
        'xc-token': NOCODB_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table_name: schema.title,
        title: schema.title,
        columns: schema.columns
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create table ${tableName}: ${error}`);
  }

  const result = await response.json();
  console.log(`✅ Created table ${tableName}, ID: ${result.id}`);
  return result.id;
}

async function exportFromLovableCloud(supabase: any, tableName: string) {
  console.log(`📤 Exporting data from Lovable Cloud: ${tableName}...`);

  const { data, error } = await supabase
    .from(tableName)
    .select('*');

  if (error) {
    console.error(`Error exporting ${tableName}:`, error);
    return [];
  }

  console.log(`✅ Exported ${data?.length || 0} records from ${tableName}`);
  return data || [];
}

async function importToNocoDB(tableId: string, records: any[]) {
  if (records.length === 0) {
    console.log('⏭️  No records to import');
    return;
  }

  console.log(`📥 Importing ${records.length} records to NocoDB...`);

  const response = await fetch(
    `${NOCODB_URL}/api/v2/tables/${tableId}/records`,
    {
      method: 'POST',
      headers: {
        'xc-token': NOCODB_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(records)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to import records: ${error}`);
  }

  console.log(`✅ Imported ${records.length} records`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const migrationLog: string[] = [];
    const tableIds: Record<string, string> = {};

    migrationLog.push('🚀 Starting NocoDB Migration...\n');

    // Step 1: Create tables
    migrationLog.push('📋 STEP 1: Creating tables...\n');

    for (const [tableName, schema] of Object.entries(TABLES_TO_CREATE)) {
      try {
        const tableId = await createTable(tableName, schema);
        tableIds[tableName] = tableId;
        migrationLog.push(`✅ Created ${tableName}: ${tableId}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        migrationLog.push(`❌ Failed to create ${tableName}: ${errorMsg}`);
      }
    }

    // Step 2: Migrate existing data
    migrationLog.push('\n📋 STEP 2: Migrating existing data...\n');

    const tablesToMigrate = [
      { lovable: 'feature_flags', nocodb: 'mhvsry8nqbwftck' },
      { lovable: 'role_feature_flags', nocodb: 'mj2nwmkf9eg17dk' },
      { lovable: 'user_feature_overrides', nocodb: 'ma1rz41hvqas6b9' }
    ];

    for (const { lovable, nocodb } of tablesToMigrate) {
      try {
        const data = await exportFromLovableCloud(supabase, lovable);
        if (data.length > 0) {
          await importToNocoDB(nocodb, data);
          migrationLog.push(`✅ Migrated ${lovable}: ${data.length} records`);
        } else {
          migrationLog.push(`⏭️  ${lovable}: No data to migrate`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        migrationLog.push(`❌ Failed to migrate ${lovable}: ${errorMsg}`);
      }
    }

    migrationLog.push('\n🎉 Migration completed!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration completed successfully',
        tableIds,
        log: migrationLog
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Migration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
