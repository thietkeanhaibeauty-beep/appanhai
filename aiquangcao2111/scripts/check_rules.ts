const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

async function main() {
    const res = await fetch(NOCODB_BASE_URL + '/api/v2/tables/mp8nib5rn4l0mb4/records?sort=-Id&limit=5', {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const rules = (await res.json()).list || [];

    console.log('📋 5 QUY TẮC MỚI NHẤT:');
    console.log('═'.repeat(60));

    for (const r of rules) {
        const conds = typeof r.conditions === 'string' ? JSON.parse(r.conditions || '[]') : (r.conditions || []);
        const actions = typeof r.actions === 'string' ? JSON.parse(r.actions || '[]') : (r.actions || []);
        const adv = typeof r.advanced_settings === 'string' ? JSON.parse(r.advanced_settings || '{}') : (r.advanced_settings || {});

        console.log(`\nID ${r.Id}: ${r.rule_name}`);
        console.log(`   Active: ${r.is_active} | AutoSchedule: ${adv.enableAutoSchedule}`);
        console.log(`   Labels: ${r.target_labels}`);
        console.log(`   Conditions: ${conds.map((c: any) => c.metric + ' ' + c.operator + ' ' + c.value).join(' AND ')}`);

        for (const a of actions) {
            console.log(`   Action: ${a.type}`);
            if (a.autoRevert) {
                console.log(`      ✅ AutoRevert: ${a.revertAtTime || (a.revertAfterHours + 'h')}`);
            }
        }
    }
}
main();
