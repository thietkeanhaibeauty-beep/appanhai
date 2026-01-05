const https = require('https');

// Config
const CONFIG = {
    hostname: 'db.hpb.edu.vn',
    token: '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo',
    baseId: 'p8xfd6fzun2guxg'
};

// Create prompt_unlocks table
const createTable = () => {
    const data = JSON.stringify({
        table_name: 'prompt_unlocks',
        title: 'prompt_unlocks',
        columns: [
            {
                column_name: 'user_id',
                title: 'user_id',
                uidt: 'SingleLineText',
                rqd: true
            },
            {
                column_name: 'template_id',
                title: 'template_id',
                uidt: 'SingleLineText',
                rqd: true
            },
            {
                column_name: 'unlocked_at',
                title: 'unlocked_at',
                uidt: 'DateTime',
                rqd: true
            },
            {
                column_name: 'expires_at',
                title: 'expires_at',
                uidt: 'DateTime',
                rqd: true
            }
        ]
    });

    const req = https.request({
        hostname: CONFIG.hostname,
        path: `/api/v2/meta/bases/${CONFIG.baseId}/tables`,
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
            try {
                const result = JSON.parse(responseData);
                console.log('Table created:', result.title);
                console.log('Table ID:', result.id);
            } catch (e) {
                console.log('Response:', responseData);
            }
        });
    });

    req.on('error', (e) => console.error('Error:', e.message));
    req.write(data);
    req.end();
};

createTable();
