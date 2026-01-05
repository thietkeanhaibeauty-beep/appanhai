const https = require('https');

// Config
const CONFIG = {
    hostname: 'db.hpb.edu.vn',
    token: '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo',
    projectId: 'p8xfd6fzun2guxg'
};

// Create VoucherRedemptions table
const createTable = () => {
    const tableData = JSON.stringify({
        table_name: 'VoucherRedemptions',
        title: 'VoucherRedemptions',
        columns: [
            { column_name: 'voucher_code', title: 'voucher_code', uidt: 'SingleLineText' },
            { column_name: 'phone', title: 'phone', uidt: 'SingleLineText' },
            { column_name: 'user_id', title: 'user_id', uidt: 'SingleLineText' },
            { column_name: 'user_email', title: 'user_email', uidt: 'Email' },
            { column_name: 'package_id', title: 'package_id', uidt: 'SingleLineText' },
            { column_name: 'redeemed_at', title: 'redeemed_at', uidt: 'DateTime' }
        ]
    });

    const req = https.request({
        hostname: CONFIG.hostname,
        path: `/api/v2/meta/bases/${CONFIG.projectId}/tables`,
        method: 'POST',
        headers: {
            'xc-token': CONFIG.token,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(tableData)
        }
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('Status:', res.statusCode);
            try {
                const json = JSON.parse(data);
                console.log('Created table:', json.title, 'ID:', json.id);
            } catch (e) {
                console.log('Response:', data);
            }
        });
    });

    req.on('error', (e) => console.error('Error:', e));
    req.write(tableData);
    req.end();
};

console.log('Creating VoucherRedemptions table...');
createTable();
