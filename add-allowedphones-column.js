const https = require('https');

// Config
const CONFIG = {
    hostname: 'db.hpb.edu.vn',
    token: '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo',
    voucherTableId: 'mhgqm56k0lobsgn'
};

// Add AllowedPhones column to Vouchers table
const columnData = JSON.stringify({
    column_name: 'AllowedPhones',
    title: 'AllowedPhones',
    uidt: 'LongText',  // Long text to store list of phone numbers
    dt: 'text'
});

console.log('Adding AllowedPhones column to Vouchers table...');

const req = https.request({
    hostname: CONFIG.hostname,
    path: `/api/v2/meta/tables/${CONFIG.voucherTableId}/columns`,
    method: 'POST',
    headers: {
        'xc-token': CONFIG.token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(columnData)
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
    });
});

req.on('error', (e) => console.error('Error:', e));
req.write(columnData);
req.end();
