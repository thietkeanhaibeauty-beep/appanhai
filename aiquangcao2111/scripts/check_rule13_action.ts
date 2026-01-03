/**
 * Check Rule 13 action fields
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

async function main() {
    const res = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/mp8nib5rn4l0mb4/records?where=${encodeURIComponent('(Id,eq,13)')}&limit=1`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const data = await res.json();
    const rule = data.list?.[0];

    console.log('Rule 13 Details:');
    console.log('  Name:', rule?.rule_name);
    console.log('  is_active:', rule?.is_active);

    const actions = typeof rule?.actions === 'string' ? JSON.parse(rule.actions) : rule?.actions;
    console.log('\nActions:');
    console.log(JSON.stringify(actions, null, 2));

    if (actions && actions[0]) {
        const action = actions[0];
        console.log('\nDebug Auto-Revert:');
        console.log('  action.autoRevert:', action.autoRevert);
        console.log('  action.revertAction:', action.revertAction);
        console.log('  action.revertAfterHours:', action.revertAfterHours);
        console.log('  action.revertAtTime:', action.revertAtTime);
        console.log('  Will schedule revert:', action.autoRevert && action.revertAction ? 'YES' : 'NO');
    }
}

main().catch(console.error);
