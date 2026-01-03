/**
 * NocoDB Migration Script
 * Tạo tables còn thiếu và migrate data từ Lovable Cloud → NocoDB
 */

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from '../src/services/nocodb/config';
import { supabase } from '../src/integrations/supabase/client';

// Table schemas for NocoDB
const TABLES_TO_CREATE = {
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

/**
 * Create a table in NocoDB
 */
async function createTable(tableName: string, schema: any) {
  console.log(`🔨 Creating table: ${tableName}...`);
  
  try {
    const response = await fetch(
      `${NOCODB_CONFIG.BASE_URL}/api/v2/meta/bases/pywdeh4kfvkya0q/tables`,
      {
        method: 'POST',
        headers: getNocoDBHeaders(),
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
  } catch (error) {
    console.error(`❌ Error creating table ${tableName}:`, error);
    throw error;
  }
}

/**
 * Export data from Lovable Cloud table
 */
async function exportFromLovableCloud(tableName: string) {
  console.log(`📤 Exporting data from Lovable Cloud: ${tableName}...`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) throw error;

    console.log(`✅ Exported ${data?.length || 0} records from ${tableName}`);
    return data || [];
  } catch (error) {
    console.error(`❌ Error exporting from ${tableName}:`, error);
    return [];
  }
}

/**
 * Import data to NocoDB table
 */
async function importToNocoDB(tableId: string, records: any[]) {
  if (records.length === 0) {
    console.log('⏭️  No records to import');
    return;
  }

  console.log(`📥 Importing ${records.length} records to NocoDB...`);

  try {
    // Batch insert (NocoDB supports bulk insert)
    const response = await fetch(
      getNocoDBUrl(tableId),
      {
        method: 'POST',
        headers: getNocoDBHeaders(),
        body: JSON.stringify(records)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to import records: ${error}`);
    }

    console.log(`✅ Imported ${records.length} records`);
  } catch (error) {
    console.error('❌ Error importing to NocoDB:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
export async function runMigration() {
  console.log('🚀 Starting NocoDB Migration...\n');

  const tableIds: Record<string, string> = {};

  // Step 1: Create tables
  console.log('📋 STEP 1: Creating tables...\n');
  for (const [tableName, schema] of Object.entries(TABLES_TO_CREATE)) {
    try {
      const tableId = await createTable(tableName, schema);
      tableIds[tableName] = tableId;
    } catch (error) {
      console.error(`Failed to create ${tableName}, skipping...`);
    }
  }

  console.log('\n✅ Tables created. IDs:', tableIds);
  console.log('\n📝 Update these IDs in src/services/nocodb/config.ts:\n');
  console.log(`PROFILES: '${tableIds.profiles || 'FAILED'}',`);
  console.log(`USER_SUBSCRIPTIONS: '${tableIds.user_subscriptions || 'FAILED'}',`);
  console.log(`PAYMENT_TRANSACTIONS: '${tableIds.payment_transactions || 'FAILED'}',`);
  console.log(`SALES_REPORTS: '${tableIds.sales_reports || 'FAILED'}',`);

  // Step 2: Migrate data from existing Lovable Cloud tables
  console.log('\n📋 STEP 2: Migrating existing data...\n');

  const tablesToMigrate = [
    { lovable: 'feature_flags', nocodb: NOCODB_CONFIG.TABLES.FEATURE_FLAGS },
    { lovable: 'role_feature_flags', nocodb: NOCODB_CONFIG.TABLES.ROLE_FEATURE_FLAGS },
    { lovable: 'user_feature_overrides', nocodb: NOCODB_CONFIG.TABLES.USER_FEATURE_OVERRIDES },
    { lovable: 'user_roles', nocodb: NOCODB_CONFIG.TABLES.USER_ROLES }
  ];

  for (const { lovable, nocodb } of tablesToMigrate) {
    console.log(`\n🔄 Migrating ${lovable}...`);
    try {
      const data = await exportFromLovableCloud(lovable);
      if (data.length > 0 && nocodb !== 'user_roles') { // user_roles chưa có ID
        await importToNocoDB(nocodb, data);
      }
    } catch (error) {
      console.error(`Failed to migrate ${lovable}`);
    }
  }

  console.log('\n\n🎉 Migration completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Update Table IDs in src/services/nocodb/config.ts');
  console.log('2. Run the app and test features');
  console.log('3. After testing, delete Lovable Cloud tables');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration().catch(console.error);
}
