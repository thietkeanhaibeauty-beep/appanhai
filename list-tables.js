const https = require('https');

const options = {
    hostname: 'db.hpb.edu.vn',
    path: '/api/v1/db/meta/projects/p8xfd6fzun2guxg/tables',
    headers: { 'xc-token': '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo' }
};

https.get(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const tables = JSON.parse(data).list;
        console.log('\n=== DANH SÁCH BẢNG ===\n');
        tables.forEach(t => console.log(`${t.title}: ${t.id}`));
        console.log('\n=== TỔNG: ' + tables.length + ' bảng ===');
    });
}).on('error', e => console.error(e));
