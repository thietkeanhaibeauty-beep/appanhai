const https = require('https');

// Config
const CONFIG = {
    hostname: 'db.hpb.edu.vn',
    token: '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo',
    packagesTableId: 'm9fazh5nc6dt1a3' // payment_packages table
};

// Update prompt_unlocks for each package
const updates = [
    { name: 'Trial', prompt_unlocks: 3 },
    { name: 'Starter', prompt_unlocks: 10 },
    { name: 'Pro', prompt_unlocks: 50 },
    { name: 'HocVien', prompt_unlocks: 30 },
    { name: 'Enterprise', prompt_unlocks: 999 } // Unlimited
];

const updatePackage = async (packageName, unlocks) => {
    return new Promise((resolve) => {
        // First get the record
        const getReq = https.request({
            hostname: CONFIG.hostname,
            path: `/api/v2/tables/${CONFIG.packagesTableId}/records?where=(name,eq,${packageName})&limit=1`,
            method: 'GET',
            headers: { 'xc-token': CONFIG.token }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const result = JSON.parse(data);
                const record = result.list?.[0];
                if (record) {
                    // Update the record
                    const updateData = JSON.stringify({ Id: record.Id, prompt_unlocks: unlocks });
                    const patchReq = https.request({
                        hostname: CONFIG.hostname,
                        path: `/api/v2/tables/${CONFIG.packagesTableId}/records`,
                        method: 'PATCH',
                        headers: {
                            'xc-token': CONFIG.token,
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(updateData)
                        }
                    }, (pRes) => {
                        let pData = '';
                        pRes.on('data', chunk => pData += chunk);
                        pRes.on('end', () => {
                            console.log(`✅ ${packageName}: ${unlocks} lượt`);
                            resolve();
                        });
                    });
                    patchReq.write(updateData);
                    patchReq.end();
                } else {
                    console.log(`❌ Không tìm thấy gói: ${packageName}`);
                    resolve();
                }
            });
        });
        getReq.end();
    });
};

const runUpdates = async () => {
    for (const pkg of updates) {
        await updatePackage(pkg.name, pkg.prompt_unlocks);
    }
    console.log('\n✅ Hoàn tất cập nhật!');
};

runUpdates();
