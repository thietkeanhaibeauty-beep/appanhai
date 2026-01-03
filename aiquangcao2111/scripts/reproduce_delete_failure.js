const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const RULES_TABLE = 'mp8nib5rn4l0mb4';
const LOGS_TABLE = 'masstbinn3h8hkr';

async function reproduce() {
    try {
        // 1. Create a dummy rule
        console.log('Creating dummy rule...');
        const createRes = await fetch(`${NOCODB_API_URL}/api/v2/tables/${RULES_TABLE}/records`, {
            method: 'POST',
            headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rule_name: 'Delete Test Rule',
                user_id: 'test-user',
                is_active: false
            })
        });
        const rule = await createRes.json();
        const ruleId = rule.Id;
        console.log(`Created rule ${ruleId}`);

        // 2. Create a dummy execution log linked to it
        console.log('Creating dummy execution log...');
        await fetch(`${NOCODB_API_URL}/api/v2/tables/${LOGS_TABLE}/records`, {
            method: 'POST',
            headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rule_id: ruleId,
                status: 'success',
                executed_at: new Date().toISOString()
            })
        });
        console.log('Created execution log');

        // 3. Try to delete the rule WITHOUT deleting the log first
        console.log('Attempting to delete rule...');
        const deleteRes = await fetch(`${NOCODB_API_URL}/api/v2/tables/${RULES_TABLE}/records`, {
            method: 'DELETE',
            headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify([{ Id: ruleId }])
        });

        if (!deleteRes.ok) {
            const text = await deleteRes.text();
            console.error(`Failed to delete rule: ${deleteRes.status} - ${text}`);
        } else {
            console.log('Rule deleted successfully!');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

reproduce();
