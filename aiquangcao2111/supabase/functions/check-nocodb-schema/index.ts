import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOCODB_CONFIG = {
  BASE_URL: 'https://db.hpb.edu.vn',
  API_TOKEN: 'u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij',
  TABLES: {
    // Priority 1 - User Data Tables (MUST HAVE user_id)
    OPENAI_SETTINGS: { id: 'mdemuc9wbwdkq1j', name: 'OPENAI_SETTINGS', priority: 'HIGH' },
    FACEBOOK_AD_ACCOUNTS: { id: 'm06x8ja4ujamo0o', name: 'FACEBOOK_AD_ACCOUNTS', priority: 'HIGH' },
    FACEBOOK_PAGES: { id: 'mj8fcx3e17ibqr5', name: 'FACEBOOK_PAGES', priority: 'HIGH' },
    CAMPAIGN_LABELS: { id: 'm0idnywr0mcv8he', name: 'CAMPAIGN_LABELS', priority: 'HIGH' },
    CAMPAIGN_LABEL_ASSIGNMENTS: { id: 'm4lohjtee32lbau', name: 'CAMPAIGN_LABEL_ASSIGNMENTS', priority: 'HIGH' },
    AUTOMATED_RULES: { id: 'mhmhfd4m16a1hln', name: 'AUTOMATED_RULES', priority: 'HIGH' },
    AUTOMATION_RULE_EXECUTION_LOGS: { id: 'm6vwyabd84vbd58', name: 'AUTOMATION_RULE_EXECUTION_LOGS', priority: 'HIGH' },
    FACEBOOK_INSIGHTS: { id: 'm5r2r47jw900rnx', name: 'FACEBOOK_INSIGHTS', priority: 'HIGH' },
    SALES_REPORTS: { id: 'mii41ujqjf8dgf1', name: 'SALES_REPORTS', priority: 'HIGH' },

    // Priority 2 - Campaign Structure Tables (SHOULD HAVE user_id)
    FACEBOOK_CAMPAIGNS: { id: 'mnrd4joz4j1fhhx', name: 'FACEBOOK_CAMPAIGNS', priority: 'MEDIUM' },
    FACEBOOK_ADSETS: { id: 'mh936t7jgjjlobb', name: 'FACEBOOK_ADSETS', priority: 'MEDIUM' },
    FACEBOOK_ADS: { id: 'mc0qt3cz7p81lzq', name: 'FACEBOOK_ADS', priority: 'MEDIUM' },

    // Priority 3 - Infrastructure Tables (ALREADY HAVE user_id)
    USER_ROLES: { id: 'mcd6xqgbq12msbj', name: 'USER_ROLES', priority: 'LOW' },
    PROFILES: { id: 'mem4ywho9am0g9c', name: 'PROFILES', priority: 'LOW' },
    USER_SUBSCRIPTIONS: { id: 'm7gsmtpmfuhgagl', name: 'USER_SUBSCRIPTIONS', priority: 'LOW' },
    PAYMENT_TRANSACTIONS: { id: 'm9m1c59nfmqx8m4', name: 'PAYMENT_TRANSACTIONS', priority: 'LOW' },
    USAGE_LOGS: { id: 'miw8goxvjit0o7u', name: 'USAGE_LOGS', priority: 'LOW' },

    // Skip - Shared/Read-only Tables
    FACEBOOK_INSIGHTS_HISTORY: { id: 'm6mrc4svwrbenq7', name: 'FACEBOOK_INSIGHTS_HISTORY', priority: 'SKIP' },
    FEATURE_FLAGS: { id: 'mhvsry8nqbwftck', name: 'FEATURE_FLAGS', priority: 'SKIP' },
    ROLE_FEATURE_FLAGS: { id: 'mj2nwmkf9eg17dk', name: 'ROLE_FEATURE_FLAGS', priority: 'SKIP' },
    USER_FEATURE_OVERRIDES: { id: 'ma1rz41hvqas6b9', name: 'USER_FEATURE_OVERRIDES', priority: 'SKIP' },
    PAYMENT_PACKAGES: { id: 'mu1npetkwov7cwp', name: 'PAYMENT_PACKAGES', priority: 'SKIP' },
    PAYMENT_SETTINGS: { id: 'm71f7fpqk53bfhz', name: 'PAYMENT_SETTINGS', priority: 'SKIP' },
  }
};

interface TableCheckResult {
  table_name: string;
  table_id: string;
  priority: string;
  has_user_id: boolean;
  has_data: boolean;
  sample_fields: string[];
  action_needed: string;
  error?: string;
}

async function checkTable(tableId: string, tableName: string, priority: string): Promise<TableCheckResult> {
  try {
    console.log(`🔍 Checking table: ${tableName} (${tableId})`);

    const response = await fetch(
      `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${tableId}/records?limit=1`,
      {
        headers: {
          'xc-token': NOCODB_CONFIG.API_TOKEN,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error fetching ${tableName}:`, errorText);
      return {
        table_name: tableName,
        table_id: tableId,
        priority,
        has_user_id: false,
        has_data: false,
        sample_fields: [],
        action_needed: 'ERROR - Check table access',
        error: errorText
      };
    }

    const data = await response.json();
    const records = data.list || [];

    if (records.length === 0) {
      console.log(`⚠️  ${tableName}: Table is empty`);
      return {
        table_name: tableName,
        table_id: tableId,
        priority,
        has_user_id: false,
        has_data: false,
        sample_fields: [],
        action_needed: priority === 'SKIP' ? 'SKIP - Shared table' : 'EMPTY - Cannot verify schema',
      };
    }

    const firstRecord = records[0];
    const fields = Object.keys(firstRecord);
    const hasUserId = fields.some(field =>
      field.toLowerCase() === 'user_id' ||
      field === 'user_id'
    );

    console.log(`${hasUserId ? '✅' : '❌'} ${tableName}: has_user_id=${hasUserId}, fields=${fields.join(', ')}`);

    let actionNeeded = '';
    if (priority === 'SKIP') {
      actionNeeded = 'SKIP - Shared/Read-only table';
    } else if (hasUserId) {
      actionNeeded = '✅ OK - Already has user_id';
    } else {
      actionNeeded = `🚨 ADD user_id column (${priority} priority)`;
    }

    return {
      table_name: tableName,
      table_id: tableId,
      priority,
      has_user_id: hasUserId,
      has_data: true,
      sample_fields: fields,
      action_needed: actionNeeded,
    };
  } catch (error) {
    console.error(`❌ Exception checking ${tableName}:`, error);
    return {
      table_name: tableName,
      table_id: tableId,
      priority,
      has_user_id: false,
      has_data: false,
      sample_fields: [],
      action_needed: 'ERROR - Exception occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting NocoDB schema check...');

    const results: TableCheckResult[] = [];

    // Check all tables
    for (const [key, tableInfo] of Object.entries(NOCODB_CONFIG.TABLES)) {
      const result = await checkTable(tableInfo.id, tableInfo.name, tableInfo.priority);
      results.push(result);
    }

    // Calculate summary
    const summary = {
      total_tables_checked: results.length,
      tables_with_user_id: results.filter(r => r.has_user_id).length,
      tables_without_user_id: results.filter(r => !r.has_user_id && r.priority !== 'SKIP' && r.has_data).length,
      tables_empty: results.filter(r => !r.has_data).length,
      tables_with_errors: results.filter(r => r.error).length,
      high_priority_missing: results.filter(r => r.priority === 'HIGH' && !r.has_user_id && r.has_data).length,
      medium_priority_missing: results.filter(r => r.priority === 'MEDIUM' && !r.has_user_id && r.has_data).length,
    };

    // Sort results by priority
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, SKIP: 3 };
    results.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      if (priorityDiff !== 0) return priorityDiff;
      return a.table_name.localeCompare(b.table_name);
    });

    const report = {
      timestamp: new Date().toISOString(),
      summary,
      details: results,
      recommendations: generateRecommendations(results),
    };

    console.log('✅ Schema check complete');
    console.log('📊 Summary:', summary);

    return new Response(
      JSON.stringify(report, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('❌ Error in check-nocodb-schema function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateRecommendations(results: TableCheckResult[]): string[] {
  const recommendations: string[] = [];

  const highPriorityMissing = results.filter(r => r.priority === 'HIGH' && !r.has_user_id && r.has_data);
  const mediumPriorityMissing = results.filter(r => r.priority === 'MEDIUM' && !r.has_user_id && r.has_data);

  if (highPriorityMissing.length > 0) {
    recommendations.push(`🚨 CRITICAL: ${highPriorityMissing.length} HIGH priority tables missing user_id: ${highPriorityMissing.map(r => r.table_name).join(', ')}`);
    recommendations.push('Action: Add user_id column (Single Line Text, Required) to these tables immediately');
  }

  if (mediumPriorityMissing.length > 0) {
    recommendations.push(`⚠️  IMPORTANT: ${mediumPriorityMissing.length} MEDIUM priority tables missing user_id: ${mediumPriorityMissing.map(r => r.table_name).join(', ')}`);
    recommendations.push('Action: Add user_id column to these tables for proper data isolation');
  }

  const tablesWithUserId = results.filter(r => r.has_user_id);
  if (tablesWithUserId.length > 0) {
    recommendations.push(`✅ ${tablesWithUserId.length} tables already have user_id: ${tablesWithUserId.map(r => r.table_name).join(', ')}`);
  }

  const edgeFunctionsFix = results.find(r => r.table_name === 'FACEBOOK_AD_ACCOUNTS' && !r.has_user_id);
  if (edgeFunctionsFix) {
    recommendations.push('🔧 Update fetch-ad-accounts Edge Function to save user_id (like fetch-pages does)');
  }

  return recommendations;
}
