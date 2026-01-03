
import http from 'http';

const CONFIG = {
    HOST: '180.93.3.41',
    PORT: 8080,
    TOKEN: '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
    TABLE_ID: 'm37ye177g4m98st' // NEW CAMPAIGN_LABELS
};

const request = (path, method, body) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: CONFIG.HOST,
            port: CONFIG.PORT,
            path: path,
            method: method || 'GET',
            headers: {
                'xc-token': CONFIG.TOKEN,
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
};

const run = async () => {
    console.log(`Creating test record in table ${CONFIG.TABLE_ID}...`);
    try {
        const record = await request(`/api/v2/tables/${CONFIG.TABLE_ID}/records`, 'POST', {
            label_name: 'TEST_NEW_TABLE_LABEL',
            label_color: '#00FF00',
            user_id: 'e9ed2435-1a36-435b-82e0-ff7eb4afc839' // Use valid user ID
        });
        console.log('Creation Response:', JSON.stringify(record, null, 2));

        if (record.Id) {
            console.log(`✅ SUCCESS: Table returns Id: ${record.Id}`);
            // Cleanup
            await request(`/api/v2/tables/${CONFIG.TABLE_ID}/records`, 'DELETE', [{ Id: record.Id }]);
            console.log('Cleanup: Deleted test record.');
        } else {
            console.log('❌ FAILURE: Table does NOT return Id.');
        }
    } catch (e) {
        console.error(e);
    }
};

run();
