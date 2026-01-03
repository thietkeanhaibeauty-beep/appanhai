const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'masstbinn3h8hkr'; // AUTOMATION_RULE_EXECUTION_LOGS

async function debugExecutionLogs() {
    try {
        console.log(`Fetching execution logs for rules 7 and 8...`);
        const whereClause = ''; // Fetch all logs
        const url = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records?where=${whereClause}&limit=10&sort=-CreatedAt`;

        const response = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
        const data = await response.json();

        console.log(`Found ${data.list.length} logs.`);

        if (data.list.length > 0) {
            data.list.forEach(r => {
                console.log('------------------------------------------------');
                console.log(`Log ID: ${r.Id}`);
                console.log(`Rule ID: ${r.rule_id}`);
                console.log(`Status: ${r.status}`);
                console.log(`Executed At: ${r.executed_at}`);
                console.log(`Matched Count: ${r.matched_objects_count}`);
                console.log(`Executed Count: ${r.executed_actions_count}`);
                try {
                    // Try to parse if it's a string, otherwise stringify
                    const details = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
                    console.log(`Details: ${JSON.stringify(details, null, 2)}`);
                } catch (e) {
                    console.log(`Details (raw): ${r.details}`);
                }
            });
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

debugExecutionLogs();
