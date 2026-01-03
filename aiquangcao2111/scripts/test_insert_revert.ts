/**
 * Test inserting a record into PENDING_REVERTS table
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mwfp1d1542ab4ok';

async function main() {
    console.log('Testing INSERT into PENDING_REVERTS...\n');

    const testPayload = {
        rule_id: "99",
        object_id: "test_object_123",
        object_type: "adset",
        revert_action: "turn_on",
        revert_value: JSON.stringify({ budgetBefore: 0 }),
        revert_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min from now
        status: "pending",
        user_id: "test-user-123"
    };

    console.log('Payload:', JSON.stringify(testPayload, null, 2));

    const res = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLE_ID}/records`, {
        method: 'POST',
        headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
    });

    console.log('\nResponse status:', res.status);
    const text = await res.text();
    console.log('Response body:', text);
}

main().catch(console.error);
