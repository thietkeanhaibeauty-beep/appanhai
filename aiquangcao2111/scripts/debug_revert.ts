/**
 * DEBUG: Check why 1AM auto-revert didn't work
 */

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    PENDING_REVERTS: 'mw59j10rxaibvje',
    EXECUTION_LOGS: 'mq7r0pxsfb0cz7h',
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4'
};

async function main() {
    console.log('═'.repeat(60));
    console.log('🔍 DEBUG: Tại sao 1h sáng không bật lại?');
    console.log('═'.repeat(60));
    console.log(`⏰ Thời điểm: ${new Date().toLocaleString('vi-VN')}\n`);

    // 1. Check PENDING_REVERTS
    console.log('1️⃣ PENDING_REVERTS (Lịch bật lại):');
    const revertsRes = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.PENDING_REVERTS}/records?limit=20&sort=-Id`,
        { headers: { 'xc-token': NOCODB_API_TOKEN } }
    );
    const reverts = (await revertsRes.json()).list || [];

    if (reverts.length === 0) {
        console.log('   ❌ KHÔNG CÓ pending reverts! Rule có thể không lưu revert.');
    } else {
        console.log(`   📋 ${reverts.length} pending reverts:`);
        for (const r of reverts) {
            console.log(`\n   ID ${r.Id}:`);
            console.log(`      Rule: ${r.rule_id}`);
            console.log(`      Object: ${r.object_id}`);
            console.log(`      Revert at: ${r.revert_at}`);
            console.log(`      Status: ${r.status}`);
            console.log(`      Created: ${r.CreatedAt}`);
        }
    }

    // 2. Check Execution Logs for rule 23
    console.log('\n' + '─'.repeat(60));
    console.log('2️⃣ EXECUTION LOGS (Rule 23):');
    const logsRes = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.EXECUTION_LOGS}/records?where=(rule_id,eq,23)&sort=-executed_at&limit=10`,
        { headers: { 'xc-token': NOCODB_API_TOKEN } }
    );
    const logs = (await logsRes.json()).list || [];

    if (logs.length === 0) {
        console.log('   ❌ Không có logs cho Rule 23!');
    } else {
        console.log(`   📋 ${logs.length} logs:`);
        for (const l of logs) {
            console.log(`\n   ${l.executed_at}: ${l.status}`);
            if (l.details) {
                const details = typeof l.details === 'string' ? JSON.parse(l.details) : l.details;
                console.log(`      Details: ${JSON.stringify(details).substring(0, 200)}`);
            }
        }
    }

    // 3. Check Rule 23 config
    console.log('\n' + '─'.repeat(60));
    console.log('3️⃣ RULE 23 CONFIG:');
    const ruleRes = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?where=(Id,eq,23)`,
        { headers: { 'xc-token': NOCODB_API_TOKEN } }
    );
    const rules = (await ruleRes.json()).list || [];

    if (rules.length > 0) {
        const r = rules[0];
        const actions = typeof r.actions === 'string' ? JSON.parse(r.actions) : r.actions;
        console.log(`   Name: ${r.rule_name}`);
        console.log(`   Active: ${r.is_active}`);
        console.log(`   Last run: ${r.last_run_at}`);
        console.log(`   Actions: ${JSON.stringify(actions)}`);
    }

    console.log('\n' + '═'.repeat(60));
}

main().catch(console.error);
