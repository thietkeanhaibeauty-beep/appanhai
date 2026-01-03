const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mp8nib5rn4l0mb4'; // AUTOMATED_RULES

async function fixOperators(ruleId) {
    const getUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records/${ruleId}`;
    const getRes = await fetch(getUrl, { headers: { 'xc-token': NOCODB_API_TOKEN } });
    const rule = await getRes.json();

    let conditions = JSON.parse(rule.conditions);

    // Convert operators to lowercase
    conditions = conditions.map(c => ({
        ...c,
        operator: c.operator.toLowerCase()
    }));

    console.log(`Updating Rule ${ruleId} operators to:`, JSON.stringify(conditions));

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
        await fixOperators(7);
        await fixOperators(8);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
