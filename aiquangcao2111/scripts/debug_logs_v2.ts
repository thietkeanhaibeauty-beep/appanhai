
// Hardcoded config to avoid import issues
const NOCODB_CONFIG = {
    BASE_URL: 'https://db.hpb.edu.vn',
    API_TOKEN: '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
    TABLES: {
        AUTOMATED_RULES: 'mp8nib5rn4l0mb4',
        AUTOMATION_RULE_EXECUTION_LOGS: 'masstbinn3h8hkr',
    }
};

const getNocoDBHeaders = () => ({
    'xc-token': NOCODB_CONFIG.API_TOKEN,
    'Content-Type': 'application/json',
});

async function verifyLogs() {
    try {
        console.log('Fetching recent AUTOMATION_RULE_EXECUTION_LOGS...');
        const response = await fetch(
            `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.AUTOMATION_RULE_EXECUTION_LOGS}/records?limit=5&sort=-Id`,
            { headers: getNocoDBHeaders() }
        );

        if (!response.ok) {
            console.error('Failed:', response.status, await response.text());
            return;
        }

        const data = await response.json();
        console.log('Recent Logs:', JSON.stringify(data.list, null, 2));

        if (data.list.length > 0) {
            // Find the log that matches the user's report (failed)
            const failedLog = data.list.find((log: any) => log.status === 'failed' || log.matched_objects_count > 0);

            if (failedLog) {
                const ruleId = failedLog.rule_id;
                console.log(`Fetching rule details for Rule ID: ${ruleId}`);

                const ruleRes = await fetch(
                    `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.AUTOMATED_RULES}/records/${ruleId}`,
                    { headers: getNocoDBHeaders() }
                );
                const ruleData = await ruleRes.json();
                console.log('Rule Details:', JSON.stringify(ruleData, null, 2));
            }
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

verifyLogs();
