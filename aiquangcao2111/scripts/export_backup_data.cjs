const fs = require('fs');
const path = require('path');
const https = require('https');

// Config
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    AUTOMATED_RULES: 'mlsshti794grsvf',
    CAMPAIGN_LABELS: 'm37ye177g4m98st',
    CAMPAIGN_LABEL_ASSIGNMENTS: 'myjgw4ial5s6zrw'
};

const BACKUP_DIR = path.join(__dirname, '../backup autorule19h17 12_12');

// Helper to fetch data
function fetchData(tableId) {
    return new Promise((resolve, reject) => {
        const url = `${NOCODB_URL}/api/v2/tables/${tableId}/records?limit=1000`;
        const options = {
            headers: {
                'xc-token': NOCODB_TOKEN,
                'Content-Type': 'application/json'
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.list || []);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function runBackup() {
    console.log('Starting Data Export...');

    // Ensure dir exists
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    try {
        // 1. Rules
        console.log('Fetching Rules...');
        const rules = await fetchData(TABLES.AUTOMATED_RULES);
        fs.writeFileSync(path.join(BACKUP_DIR, 'AUTOMATED_RULES.json'), JSON.stringify(rules, null, 2));
        console.log(`Saved ${rules.length} rules.`);

        // 2. Labels
        console.log('Fetching Labels...');
        const labels = await fetchData(TABLES.CAMPAIGN_LABELS);
        fs.writeFileSync(path.join(BACKUP_DIR, 'CAMPAIGN_LABELS.json'), JSON.stringify(labels, null, 2));
        console.log(`Saved ${labels.length} labels.`);

        // 3. Assignments
        console.log('Fetching Assignments...');
        const assignments = await fetchData(TABLES.CAMPAIGN_LABEL_ASSIGNMENTS);
        fs.writeFileSync(path.join(BACKUP_DIR, 'CAMPAIGN_LABEL_ASSIGNMENTS.json'), JSON.stringify(assignments, null, 2));
        console.log(`Saved ${assignments.length} assignments.`);

        console.log('Data Export Complete!');
    } catch (error) {
        console.error('Backup failed:', error);
    }
}

runBackup();
