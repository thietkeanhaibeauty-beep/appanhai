const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mp8nib5rn4l0mb4'; // AUTOMATED_RULES

async function restoreRule7() {
    const conditions = [
        { metric: 'spend', operator: 'greater_than', value: 163901 },
        { metric: 'onsite_conversion.messaging_conversation_started_7d', operator: 'less_than', value: 1 }
    ];

    console.log(`Restoring Rule 7 conditions to:`, JSON.stringify(conditions));

    const response = await fetch(`${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records`, {
        method: 'PATCH',
        headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify([{
            Id: 7,
            conditions: JSON.stringify(conditions)
        }])
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`Failed to update rule 7: ${text}`);
    } else {
        console.log(`Rule 7 updated successfully.`);
    }
}

async function main() {
    try {
        await restoreRule7();
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
