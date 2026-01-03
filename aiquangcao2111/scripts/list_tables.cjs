// Native fetch is available in Node 18+

const TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

// Focus on known candidates to reduce noise
const BASES = [
    { title: 'AIlocalhostads', id: 'ptqnw7j4vejr8ir' },
    { title: 'dataadsai', id: 'p0lvt22fuj3opkl' }
];

async function listTables() {
    try {
        console.log('Fetching Tables for Candidate Bases...');

        for (const base of BASES) {
            console.log(`\n=== Checking Base: ${base.title} (${base.id}) ===`);
            const tablesUrl = `https://db.hpb.edu.vn/api/v2/meta/bases/${base.id}/tables`;
            const tRes = await fetch(tablesUrl, { headers: { 'xc-token': TOKEN } });

            if (tRes.ok) {
                const tData = await tRes.json();
                const list = tData.list || [];
                console.log(`Found ${list.length} tables.`);

                // Check for Sales Report ID match
                const salesMatch = list.find(t => t.id === 'm8xqudjpkihacxw');
                if (salesMatch) {
                    console.log(`✅ FOUND SALES_REPORTS (m8xqudjpkihacxw) in ${base.title}!`);
                    console.log(`   Table Name: ${salesMatch.title}`);
                }

                // Check for Rules ID matches
                const rulesMatch = list.find(t => t.id === 'mp8nib5rn4l0mb4');
                if (rulesMatch) console.log(`⚠️ Found AUTOMATED_RULES (mp8nib5rn4l0mb4) in ${base.title}.`);

                const rulesMatch2 = list.find(t => t.id === 'm985xb6ql61r1zm');
                if (rulesMatch2) console.log(`⚠️ Found AUTOMATED_RULES (m985xb6ql61r1zm) in ${base.title}.`);

            } else {
                console.log('Failed to fetch tables for base:', base.id, tRes.status);
            }
        }

    } catch (error) {
        console.error('Crash:', error);
    }
}

listTables();
