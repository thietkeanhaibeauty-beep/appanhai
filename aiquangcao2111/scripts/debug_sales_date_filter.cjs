// Debug Sales Reports Date Filter
const https = require('https');

const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'me14lqzoxj5xwar';
const USER_ID = '41b342fd-989a-4957-8d92-0bb72db42c7b';

// Date range from screenshot/context (approx)
const START_DATE = '2024-11-12';
const END_DATE = '2025-01-11';

function makeRequest(method, path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'db.hpb.edu.vn',
            port: 443,
            path: path,
            method: method,
            headers: {
                'xc-token': NOCODB_TOKEN,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function run() {
    console.log('=== Debug SALES_REPORTS Date Filter ===\n');

    // Test 1: Query with user_id + Date Range
    const whereClause = `(user_id,eq,${USER_ID})~and(report_date,ge,${START_DATE})~and(report_date,le,${END_DATE})`;
    const encodedWhere = encodeURIComponent(whereClause);

    console.log('1. Testing with date range:', whereClause);
    // WITHOUT SORT (current state of code)
    const url = `/api/v2/tables/${TABLE_ID}/records?where=${encodedWhere}&limit=1000`;

    const test1 = await makeRequest('GET', url);
    console.log('Status:', test1.status);

    if (test1.status !== 200) {
        console.log('❌ Error:', JSON.stringify(test1.data, null, 2));
    } else {
        console.log('✅ Success! Found records:', test1.data?.list?.length || 0);
    }
}

run().catch(console.error);
