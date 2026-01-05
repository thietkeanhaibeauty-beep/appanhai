const https = require('https');

// Config
const CONFIG = {
    hostname: 'db.hpb.edu.vn',
    token: '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo',
    voucherTableId: 'mhgqm56k0lobsgn'
};

// Test create voucher
const testData = JSON.stringify({
    Code: 'TEST_DEBUG',
    AllowedPhones: '0965388977',
    PackageId: 'HocVien',
    DurationDays: 365,
    UsageLimit: 1000,
    IsActive: true
});

console.log('Sending data:', testData);

const req = https.request({
    hostname: CONFIG.hostname,
    path: `/api/v2/tables/${CONFIG.voucherTableId}/records`,
    method: 'POST',
    headers: {
        'xc-token': CONFIG.token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testData)
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
req.write(testData);
req.end();
