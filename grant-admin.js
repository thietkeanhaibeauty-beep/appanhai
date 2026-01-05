const https = require('https');

// Config
const CONFIG = {
    hostname: 'db.hpb.edu.vn',
    token: '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo',
    userRolesTableId: 'm0bix8eqprite24', // Table Id for UserRoles
    targetUserId: '72c689ae-ca93-4917-af73-2dfabb03c614',
    newRole: 'super_admin'
};

const updateRole = () => {
    // 1. Search for existing role record
    const path = `/api/v2/tables/${CONFIG.userRolesTableId}/records?where=(user_id,eq,${CONFIG.targetUserId})&limit=1`;

    const req = https.get({
        hostname: CONFIG.hostname,
        path: path,
        headers: { 'xc-token': CONFIG.token }
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                const existingRecord = json.list?.[0];

                if (existingRecord) {
                    console.log(`Found existing role record: ${existingRecord.Id} with role: ${existingRecord.role}`);
                    // Update
                    performUpdate(existingRecord.Id);
                } else {
                    console.log('No existing role record found. Creating new one...');
                    // Create
                    performCreate();
                }
            } catch (e) {
                console.error('Error parsing response:', e);
            }
        });
    });

    req.on('error', (e) => console.error('Request error:', e));
};

const performUpdate = (recordId) => {
    const data = JSON.stringify({
        Id: recordId,
        role: CONFIG.newRole
    });

    const req = https.request({
        hostname: CONFIG.hostname,
        path: `/api/v2/tables/${CONFIG.userRolesTableId}/records`,
        method: 'PATCH',
        headers: {
            'xc-token': CONFIG.token,
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    }, (res) => {
        console.log(`Update Status: ${res.statusCode}`);
        res.on('data', d => process.stdout.write(d));
    });

    req.write(data);
    req.end();
};

const performCreate = () => {
    const data = JSON.stringify({
        user_id: CONFIG.targetUserId,
        role: CONFIG.newRole
    });

    const req = https.request({
        hostname: CONFIG.hostname,
        path: `/api/v2/tables/${CONFIG.userRolesTableId}/records`,
        method: 'POST',
        headers: {
            'xc-token': CONFIG.token,
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    }, (res) => {
        console.log(`Create Status: ${res.statusCode}`);
        res.on('data', d => process.stdout.write(d));
    });

    req.write(data);
    req.end();
};

console.log(`Updating role for user ${CONFIG.targetUserId} to ${CONFIG.newRole}...`);
updateRole();
