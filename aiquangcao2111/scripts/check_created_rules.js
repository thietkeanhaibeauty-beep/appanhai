const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mp8nib5rn4l0mb4'; // AUTOMATED_RULES

async function checkRules() {
    try {
        console.log(`Fetching records from table ${TABLE_ID}...`);
        const url = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records?limit=20&sort=-CreatedAt`;

        const response = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
        const data = await response.json();

        console.log(`Found ${data.list.length} rules.`);

        if (data.list.length > 0) {
            data.list.forEach(r => {
                console.log('------------------------------------------------');
                console.log(`ID: ${r.Id}`);
                console.log(`Name: ${r.rule_name}`);
                console.log(`User ID: ${r.user_id}`);
                console.log(`Is Active: ${r.is_active}`);
                console.log(`Last Run At: ${r.last_run_at}`);
                console.log(`Processing Status: ${r.processing_status}`);
                try {
                    const settings = typeof r.advanced_settings === 'string' ? JSON.parse(r.advanced_settings) : r.advanced_settings;
                    console.log(`Check Frequency: ${settings?.checkFrequency}`);
                    console.log(`Auto Schedule: ${settings?.enableAutoSchedule}`);
                } catch (e) {
                    console.log(`Advanced Settings: ${r.advanced_settings}`);
                }
                console.log(`Created At: ${r.CreatedAt}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkRules();
