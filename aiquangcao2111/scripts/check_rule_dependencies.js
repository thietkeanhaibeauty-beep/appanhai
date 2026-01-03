const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    EXECUTION_LOGS: 'masstbinn3h8hkr',
    OBJECT_EXECUTIONS: 'AUTOMATION_RULE_OBJECT_EXECUTIONS' // Need to find the ID for this if it exists in NocoDB, or it might be Supabase only?
};

// Wait, AUTOMATION_RULE_OBJECT_EXECUTIONS is likely a Supabase table if it was used in the Edge Function via supabase client.
// The Edge Function uses:
// supabase.from('automation_rule_object_executions')
// So it is a Supabase table, not NocoDB.
// But AUTOMATION_RULE_EXECUTION_LOGS is a NocoDB table (ID: masstbinn3h8hkr).

async function checkNocoDBLogs(ruleId) {
    try {
        console.log(`Checking NocoDB logs for rule ${ruleId}...`);
        const whereClause = encodeURIComponent(`(rule_id,eq,${ruleId})`);
        const url = `${NOCODB_API_URL}/api/v2/tables/${TABLES.EXECUTION_LOGS}/records?where=${whereClause}&limit=1`;

        const response = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
        const data = await response.json();

        console.log(`Found ${data.list.length} NocoDB logs.`);
    } catch (error) {
        console.error('Error checking NocoDB logs:', error);
    }
}

async function main() {
    await checkNocoDBLogs(7);
    await checkNocoDBLogs(8);
}

main();
