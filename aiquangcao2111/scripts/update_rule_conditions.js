const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mp8nib5rn4l0mb4'; // AUTOMATED_RULES

async function updateRule(ruleId, currentResults) {
    const url = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records`;

    // New condition: results < currentResults + 1 (meaning 0 new results)
    const newThreshold = currentResults + 1;

    // We need to fetch the existing rule first to preserve other fields if needed, 
    // but here we know we just want to update conditions.
    // However, we need to keep the spend condition.
    // Spend condition was: spend > targetSpend. We don't change that.
    // We only update the results condition.

    // Fetch rule to get current spend threshold
    const getUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records/${ruleId}`;
    const getRes = await fetch(getUrl, { headers: { 'xc-token': NOCODB_API_TOKEN } });
    const rule = await getRes.json();

    let conditions = JSON.parse(rule.conditions);

    // Update results condition
    conditions = conditions.map(c => {
        if (c.metric === 'results') {
            return { ...c, value: newThreshold };
        }
        return c;
    });

    console.log(`Updating Rule ${ruleId} conditions to:`, JSON.stringify(conditions));

    const response = await fetch(url, {
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
        // Hifu 18/11: Current Results ~220 -> Threshold < 221
        await updateRule(7, 220);

        // Hifu 19: Current Results ~149 -> Threshold < 150
        await updateRule(8, 149);

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
