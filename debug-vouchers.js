const https = require('https');

const options = {
    hostname: 'db.hpb.edu.vn',
    // Table ID for Vouchers from previous list-tables output: mhgqm56k0lobsgn
    path: '/api/v1/db/data/noco/p8xfd6fzun2guxg/mhgqm56k0lobsgn?limit=5',
    headers: { 'xc-token': '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo' }
};

https.get(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.log(data);
        }
    });
}).on('error', e => console.error(e));
