const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mp8nib5rn4l0mb4'; // AUTOMATED_RULES

async function updateRuleMetric(ruleId) {
    const getUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records/${ruleId}`;
    const getRes = await fetch(getUrl, { headers: { 'xc-token': NOCODB_API_TOKEN } });
    const rule = await getRes.json();

    let conditions = JSON.parse(rule.conditions);

    // Update metric to 'onsite_conversion.messaging_conversation_started_7d'
    // And reset value to 1 (meaning < 1, i.e., 0)
    conditions = conditions.map(c => {
        if (c.metric === 'results') {
            return {
                metric: 'onsite_conversion.messaging_conversation_started_7d',
                operator: 'less_than',
                value: 1
            };
        }
        return c;
    });

    console.log(`Updating Rule ${ruleId} conditions to:`, JSON.stringify(conditions));

    const response = await fetch(`${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records`, {
        method: 'PATCH',
        headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify([{
            Id: ruleId,
            conditions: JSON.stringify(conditions)
        }])
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`Failed to update rule ${ruleId}: ${text}`);
    } else {
        console.log(`Rule ${ruleId} updated successfully.`);
    }
}

async function main() {
    try {
        await updateRuleMetric(7);
        await updateRuleMetric(8);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
