// Test SALES_REPORTS table with CreatedAt sort
const https = require('https');

const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'me14lqzoxj5xwar';

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
    console.log('=== Testing SALES_REPORTS with CreatedAt Sort ===\n');

    // Test 1: Query with CreatedAt sort (like working AUTOMATED_RULES)
    console.log('1. Testing sort=-CreatedAt...');
    const sortTest = await makeRequest('GET', `/api/v2/tables/${TABLE_ID}/records?limit=5&sort=-CreatedAt`);
    console.log('Status:', sortTest.status);
    console.log('Success:', sortTest.status === 200 ? '✅ YES' : '❌ NO');

    // Test 2: Query with where clause + CreatedAt sort
    console.log('\n2. Testing where clause + sort=-CreatedAt...');
    const whereClause = encodeURIComponent('(user_id,eq,test123)');
    const whereTest = await makeRequest('GET', `/api/v2/tables/${TABLE_ID}/records?where=${whereClause}&limit=5&sort=-CreatedAt`);
    console.log('Status:', whereTest.status);
    console.log('Success:', whereTest.status === 200 ? '✅ YES' : '❌ NO');

    if (whereTest.status !== 200) {
        console.log('Error:', whereTest.data);
    }
}

run().catch(console.error);
