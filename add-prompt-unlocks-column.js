const https = require('https');

// Config
const CONFIG = {
    hostname: 'db.hpb.edu.vn',
    token: '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo',
    packagesTableId: 'm9fazh5nc6dt1a3' // payment_packages table
};

// Add prompt_unlocks column
const addColumn = () => {
    const data = JSON.stringify({
        column_name: 'prompt_unlocks',
        title: 'prompt_unlocks',
        uidt: 'Number',
        dt: 'int4'
    });

    const req = https.request({
        hostname: CONFIG.hostname,
        path: `/api/v2/meta/tables/${CONFIG.packagesTableId}/columns`,
        method: 'POST',
        headers: {
            'xc-token': CONFIG.token,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    }, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
            console.log('Status:', res.statusCode);
            console.log('Response:', responseData);
        });
    });

    req.on('error', (e) => console.error('Error:', e.message));
    req.write(data);
    req.end();
};

addColumn();
