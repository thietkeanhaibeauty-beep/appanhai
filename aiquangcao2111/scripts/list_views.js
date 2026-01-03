
import http from 'http';

const CONFIG = {
    HOST: '180.93.3.41',
    PORT: 8080,
    TOKEN: '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
    TABLE_ID: 'm7jnf4y29tmv3lj' // CAMPAIGN_LABELS
};

const request = (path) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: CONFIG.HOST,
            port: CONFIG.PORT,
            path: path,
            method: 'GET',
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
        req.end();
    });
};

const run = async () => {
    console.log(`Fetching views for table ${CONFIG.TABLE_ID}...`);
    try {
        const views = await request(`/api/v1/db/meta/tables/${CONFIG.TABLE_ID}/views`);
        if (views.list) {
            console.log('Views found:');
            views.list.forEach(v => {
                console.log(`- ${v.title} (ID: ${v.id}, Type: ${v.type})`);
            });
        } else {
            console.log('Response:', JSON.stringify(views, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
};

run();
