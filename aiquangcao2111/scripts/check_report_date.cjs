// Check report_date value
const https = require('https');

const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'me14lqzoxj5xwar';

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'db.hpb.edu.vn',
            port: 443,
            path: path,
            method: 'GET',
            headers: { 'xc-token': NOCODB_TOKEN }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });

        req.on('error', reject);
        req.end();
    });
}

async function run() {
    console.log('=== Check report_date in SALES_REPORTS ===\n');

    const data = await makeRequest(`/api/v2/tables/${TABLE_ID}/records?limit=10`);

    data.list?.forEach((r, i) => {
        console.log(`Record ${i + 1}:`);
        console.log(`  report_date: "${r.report_date}" (type: ${typeof r.report_date})`);
        console.log(`  phone_number: ${r.phone_number}`);
        console.log(`  CreatedAt: ${r.CreatedAt}`);
        console.log(`  campaign_id: ${r.campaign_id}`);
        console.log('');
    });
}

run().catch(console.error);
