// Debug Sales Reports fetch
const https = require('https');

const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'me14lqzoxj5xwar';
const USER_ID = '41b342fd-989a-4957-8d92-0bb72db42c7b';

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
    console.log('=== Debug SALES_REPORTS Fetch ===\n');

    // Test 1: Get all records (no filter)
    console.log('1. Fetching ALL records (no filter)...');
    const allTest = await makeRequest('GET', `/api/v2/tables/${TABLE_ID}/records?limit=10`);
    console.log('Status:', allTest.status);
    console.log('Total records:', allTest.data?.pageInfo?.totalRows || 0);
    if (allTest.data?.list?.length > 0) {
        console.log('First record user_id:', allTest.data.list[0].user_id);
    }

    // Test 2: Query with user_id filter
    console.log('\n2. Fetching with user_id filter...');
    const whereClause = encodeURIComponent(`(user_id,eq,${USER_ID})`);
    const filterTest = await makeRequest('GET', `/api/v2/tables/${TABLE_ID}/records?where=${whereClause}&limit=10`);
    console.log('Status:', filterTest.status);
    console.log('Total records:', filterTest.data?.pageInfo?.totalRows || 0);

    // Test 3: Query with user_id + sort
    console.log('\n3. Fetching with user_id filter + sort=-CreatedAt...');
    const sortTest = await makeRequest('GET', `/api/v2/tables/${TABLE_ID}/records?where=${whereClause}&sort=-CreatedAt&limit=10`);
    console.log('Status:', sortTest.status);
    console.log('Total records:', sortTest.data?.pageInfo?.totalRows || 0);

    if (sortTest.status !== 200) {
        console.log('Error:', sortTest.data);
    } else if (sortTest.data?.list?.length > 0) {
        console.log('\nRecords found:');
        sortTest.data.list.forEach((r, i) => {
            console.log(`  ${i + 1}. phone: ${r.phone_number}, status: ${r.appointment_status}`);
        });
    }
}

run().catch(console.error);
