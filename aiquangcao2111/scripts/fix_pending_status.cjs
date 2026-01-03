// Fix: Fetch actual record ID first, then update status
const https = require('https');

const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mlh0pm0padym9i1';

function makeRequest(method, path, data = null) {
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
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function run() {
    console.log('Step 1: Fetching pending records...');

    const where = encodeURIComponent('(status,eq,pending)');
    const fetchRes = await makeRequest('GET', `/api/v2/tables/${TABLE_ID}/records?where=${where}&limit=10`);

    console.log('Fetch Status:', fetchRes.status);
    console.log('Records:', JSON.stringify(fetchRes.data, null, 2));

    if (fetchRes.data?.list?.length > 0) {
        for (const record of fetchRes.data.list) {
            console.log(`\nStep 2: Updating record Id=${record.Id} to completed...`);

            const updateRes = await makeRequest('PATCH', `/api/v2/tables/${TABLE_ID}/records`, {
                Id: record.Id,
                status: 'completed'
            });

            console.log('Update Status:', updateRes.status);
            console.log('Update Response:', JSON.stringify(updateRes.data, null, 2));
        }
    } else {
        console.log('No pending records found.');
    }
}

run().catch(console.error);
