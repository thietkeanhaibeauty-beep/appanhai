// Test SALES_REPORTS table access
const https = require('https');

const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'me14lqzoxj5xwar'; // NEW SALES_REPORTS TABLE

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
    console.log('=== Testing SALES_REPORTS Table ===\n');

    // 1. Fetch table schema
    console.log('1. Fetching table info...');
    const schemaRes = await makeRequest('GET', `/api/v2/meta/tables/${TABLE_ID}`);
    console.log('Status:', schemaRes.status);

    if (schemaRes.status === 200) {
        const columns = schemaRes.data.columns || [];
        console.log('\nColumns found:', columns.length);
        console.log('\nColumn details:');
        columns.forEach((col, i) => {
            console.log(`  ${i + 1}. ${col.title} (${col.uidt}) - cn: ${col.column_name}`);
        });
    } else {
        console.log('Error:', schemaRes.data);
    }

    // 2. Try fetching records
    console.log('\n2. Fetching records...');
    const recordsRes = await makeRequest('GET', `/api/v2/tables/${TABLE_ID}/records?limit=5`);
    console.log('Status:', recordsRes.status);
    console.log('Records:', JSON.stringify(recordsRes.data, null, 2));
}

run().catch(console.error);
