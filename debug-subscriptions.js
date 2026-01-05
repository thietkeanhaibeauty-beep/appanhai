const https = require('https');

// Config
const CONFIG = {
    hostname: 'db.hpb.edu.vn',
    token: '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo'
};

// Get subscriptions table ID first
const req = https.request({
    hostname: CONFIG.hostname,
    path: '/api/v2/meta/bases/p8xfd6fzun2guxg/tables',
    method: 'GET',
    headers: { 'xc-token': CONFIG.token }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const tables = JSON.parse(data);
        console.log('=== All Tables ===');
        tables.list?.forEach(t => {
            console.log(`${t.title}: ${t.id}`);
        });

        // Find subscriptions table
        const subTable = tables.list?.find(t =>
            t.title.toLowerCase().includes('subscription')
        );

        if (subTable) {
            console.log('\n=== Found Subscriptions Table ===');
            console.log('ID:', subTable.id);

            // Now fetch subscriptions data
            const req2 = https.request({
                hostname: CONFIG.hostname,
                path: `/api/v2/tables/${subTable.id}/records?limit=10`,
                method: 'GET',
                headers: { 'xc-token': CONFIG.token }
            }, (res2) => {
                let data2 = '';
                res2.on('data', chunk => data2 += chunk);
                res2.on('end', () => {
                    console.log('\n=== Subscriptions Data ===');
                    console.log(JSON.stringify(JSON.parse(data2), null, 2));
                });
            });
            req2.end();
        }
    });
});
req.end();
