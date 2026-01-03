// Check ALL automation rules to find "60k 1 kết quả tắt"
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const AUTOMATED_RULES = 'mp8nib5rn4l0mb4';

async function checkRules() {
    console.log('🔍 Fetching ALL automation rules...');

    const url = `${NOCODB_URL}/api/v2/tables/${AUTOMATED_RULES}/records?limit=100`;

    try {
        const response = await fetch(url, {
            headers: {
                'xc-token': NOCODB_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('❌ Error:', response.status, await response.text());
            return;
        }

        const data = await response.json();
        const records = data.list || [];

        console.log(`\n📊 Found ${records.length} rules:\n`);

        records.forEach((r, i) => {
            console.log(`--- Rule ${i + 1}: ${r.name || 'Unnamed'} ---`);
            console.log('  Id:', r.Id);
            console.log('  scope:', r.scope);
            console.log('  is_active:', r.is_active);
            console.log('  target_labels:', r.target_labels);
            console.log('  conditions:', r.conditions);
            console.log('  actions:', r.actions);
            console.log('');
        });

        // Find the specific rule
        const targetRule = records.find(r => r.name && r.name.includes('60k'));
        if (targetRule) {
            console.log('\n\n🎯 FOUND TARGET RULE:');
            console.log(JSON.stringify(targetRule, null, 2));
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

checkRules();
