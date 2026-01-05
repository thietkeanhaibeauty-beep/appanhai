const https = require('https');

const options = {
    hostname: 'db.hpb.edu.vn',
    path: '/api/v1/db/data/noco/p8xfd6fzun2guxg/m9fazh5nc6dt1a3/views/vw5j3c4k6l7m8n9?limit=100', // Assuming a view or just direct table access if I knew the table name endpoint. 
    // Actually the standard endpoint is /api/v1/db/data/noco/<proj_id>/<table_id>
    path: '/api/v1/db/data/noco/p8xfd6fzun2guxg/m9fazh5nc6dt1a3',
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
