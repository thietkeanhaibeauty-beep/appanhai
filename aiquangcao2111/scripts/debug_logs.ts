
import { NOCODB_CONFIG, getNocoDBHeaders } from './supabase/functions/_shared/nocodb-config.ts';

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
            const ruleId = data.list[0].rule_id;
            console.log(`Fetching rule details for Rule ID: ${ruleId}`);

            const ruleRes = await fetch(
                `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.AUTOMATED_RULES}/records/${ruleId}`,
                { headers: getNocoDBHeaders() }
            );
            const ruleData = await ruleRes.json();
            console.log('Rule Details:', JSON.stringify(ruleData, null, 2));
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

verifyLogs();
