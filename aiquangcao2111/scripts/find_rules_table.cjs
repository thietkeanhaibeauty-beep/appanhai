// Native fetch is available in Node 18+

const TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const BASE_ID = 'ptqnw7j4vejr8ir'; // AIlocalhostads

async function findRulesTable() {
    try {
        console.log('Fetching ALL Tables from AIlocalhostads...');
        const tablesUrl = `https://db.hpb.edu.vn/api/v2/meta/bases/${BASE_ID}/tables`;
        const tRes = await fetch(tablesUrl, { headers: { 'xc-token': TOKEN } });

        if (!tRes.ok) {
            console.log('Error:', tRes.status);
            return;
        }

        const tData = await tRes.json();
        const list = tData.list || [];
        console.log(`Total Tables: ${list.length}\n`);

        // Print all tables
        console.log('=== ALL TABLES IN AIlocalhostads ===');
        list.forEach(t => {
            console.log(`[${t.id}] ${t.title}`);
        });

        // Find tables with "rule" or "label" in name (case insensitive)
        console.log('\n=== SEARCHING FOR AUTOMATION-RELATED TABLES ===');
        const keywords = ['rule', 'label', 'automation', 'quy'];
        list.forEach(t => {
            const lowerTitle = t.title.toLowerCase();
            if (keywords.some(k => lowerTitle.includes(k))) {
                console.log(`✅ MATCH: [${t.id}] ${t.title}`);
            }
        });

    } catch (error) {
        console.error('Crash:', error);
    }
}

findRulesTable();
