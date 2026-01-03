/**
 * Check label assignments to verify labels are correctly linked to adsets
 * Run with: npx tsx scripts/check_label_assignments.ts
 */

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLES = {
    CAMPAIGN_LABELS: 'm37ye177g4m98st',
    CAMPAIGN_LABEL_ASSIGNMENTS: 'myjgw4ial5s6zrw',
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4'
};

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('           CHECK LABEL ASSIGNMENTS                              ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 1. Get all labels
    console.log('📋 All Labels:');
    const labelsRes = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.CAMPAIGN_LABELS}/records?limit=50`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const labels = (await labelsRes.json()).list || [];
    labels.forEach((l: any) => console.log(`  - ID: ${l.Id}, Name: "${l.label_name}"`));

    // 2. Get all label assignments
    console.log('\n📋 All Label Assignments:');
    const assignRes = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.CAMPAIGN_LABEL_ASSIGNMENTS}/records?limit=50`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const assignments = (await assignRes.json()).list || [];
    console.log(`Found ${assignments.length} assignments:`);
    assignments.forEach((a: any) => {
        const label = labels.find((l: any) => l.Id === a.label_id);
        console.log(`  - Object ID: ${a.object_id}, Label ID: ${a.label_id} (${label?.label_name || 'unknown'})`);
    });

    // 3. Get active rules and their target labels
    console.log('\n📋 Active Rules and Target Labels:');
    const rulesRes = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?where=(is_active,eq,true)&limit=50`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const rules = (await rulesRes.json()).list || [];
    rules.forEach((r: any) => {
        const targetLabels = typeof r.target_labels === 'string' ? JSON.parse(r.target_labels) : r.target_labels;
        console.log(`  - Rule "${r.rule_name}" targets labels: ${JSON.stringify(targetLabels)}`);
    });

    // 4. Cross-check
    console.log('\n📊 CROSS-CHECK:');
    for (const rule of rules) {
        const targetLabels = typeof rule.target_labels === 'string' ? JSON.parse(rule.target_labels) : rule.target_labels;
        console.log(`\n  Rule: "${rule.rule_name}"`);
        console.log(`  Target Labels: ${JSON.stringify(targetLabels)}`);

        // Find matching assignments
        const matchingAssignments = assignments.filter((a: any) =>
            targetLabels.includes(a.label_id) ||
            targetLabels.includes(String(a.label_id)) ||
            targetLabels.map(String).includes(String(a.label_id))
        );

        if (matchingAssignments.length > 0) {
            console.log(`  ✅ Matching objects:`);
            matchingAssignments.forEach((a: any) => console.log(`     - ${a.object_id}`));
        } else {
            console.log(`  ❌ No matching objects found!`);
        }
    }
}

main().catch(console.error);
