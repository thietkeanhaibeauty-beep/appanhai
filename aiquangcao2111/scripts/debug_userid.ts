/**
 * Debug user_id mismatch between rule and label assignment
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

async function main() {
    console.log('═'.repeat(60));
    console.log('DEBUGGING USER_ID MISMATCH');
    console.log('═'.repeat(60));

    // 1. Get Rule 12
    const ruleRes = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/mp8nib5rn4l0mb4/records?where=(Id,eq,12)&limit=1`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const ruleData = await ruleRes.json();
    const rule = ruleData.list?.[0];

    console.log('\n📋 Rule 12:');
    console.log(`   Name: ${rule?.rule_name}`);
    console.log(`   user_id: "${rule?.user_id}"`);
    console.log(`   target_labels: ${rule?.target_labels}`);

    // 2. Get Label Assignment with label_id 9
    const labelRes = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/myjgw4ial5s6zrw/records?where=(label_id,eq,9)&limit=10`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const labelData = await labelRes.json();

    console.log('\n📋 Label Assignments for label_id=9:');
    for (const la of labelData.list || []) {
        console.log(`   - ID: ${la.Id}, user_id: "${la.user_id}", adset_id: ${la.adset_id}`);
    }

    // 3. Check if they match
    console.log('\n📊 COMPARISON:');
    console.log(`   Rule user_id:       "${rule?.user_id}"`);
    const labelAssignment = labelData.list?.[0];
    console.log(`   Assignment user_id: "${labelAssignment?.user_id}"`);
    console.log(`   Match: ${rule?.user_id === labelAssignment?.user_id ? '✅ YES' : '❌ NO - THIS IS THE PROBLEM!'}`);
}

main().catch(console.error);
