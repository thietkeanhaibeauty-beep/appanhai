
// Hardcoded config
const NOCODB_CONFIG = {
    BASE_URL: 'https://db.hpb.edu.vn',
    API_TOKEN: '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
    TABLES: { AUTOMATION_RULE_EXECUTION_LOGS: 'masstbinn3h8hkr' }
};

const getNocoDBHeaders = () => ({ 'xc-token': NOCODB_CONFIG.API_TOKEN, 'Content-Type': 'application/json' });

async function getLogDetails() {
    try {
        const response = await fetch(
            `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.AUTOMATION_RULE_EXECUTION_LOGS}/records?limit=5&sort=-Id`,
            { headers: getNocoDBHeaders() }
        );
        const data = await response.json();
        const failedLogs = data.list.filter((l: any) => l.status === 'failed' || l.matched_objects_count > 0);

        console.log('--- FAILED LOG DETAILS ---');
        failedLogs.forEach((log: any) => {
            console.log(`Log ID: ${log.Id} | Rule ID: ${log.rule_id} | Status: ${log.status}`);
            console.log('Details:', log.details); // Expecting JSON string or object
        });
    } catch (e) {
        console.error(e);
    }
}

getLogDetails();
