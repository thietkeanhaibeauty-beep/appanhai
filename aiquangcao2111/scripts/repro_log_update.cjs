// Native fetch used in Node 18+
require('dotenv').config({ path: 'i:/aiquangcao2111/.env' });

const NOCODB_URL = "https://db.hpb.edu.vn";
const NOCODB_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";
const LOGS_TABLE_ID = "masstbinn3h8hkr";

async function testLogUpdate() {
    console.log("🛠️ Testing Log Update (PATCH) in NocoDB - Body ID Method...");

    // 1. Create Dummy Log
    console.log("1. Creating dummy pending log...");
    const createRes = await fetch(`${NOCODB_URL}/api/v2/tables/${LOGS_TABLE_ID}/records`, {
        method: 'POST',
        headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            rule_id: 12345,
            executed_at: new Date().toISOString(),
            status: "pending",
            details: "Test Pending Log for Body Update"
        })
    });

    const createData = await createRes.json();
    const logId = createData.Id;
    console.log(`✅ Created Log ID: ${logId}`);

    // 2. Attempt Update with ID in Body
    console.log("2. Attempting Update (PATCH /records with Id in body)...");
    try {
        // Note: URL ends in /records, NOT /records/:id
        const updateRes = await fetch(`${NOCODB_URL}/api/v2/tables/${LOGS_TABLE_ID}/records`, {
            method: 'PATCH',
            headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Id: logId,
                status: 'success',
                matched_objects_count: 1,
                executed_actions_count: 1,
                details: JSON.stringify([{ objectId: "123", result: "success", fixed: true }])
            })
        });

        const text = await updateRes.text();
        console.log(`Response Status: ${updateRes.status}`);
        console.log(`Response Body: ${text}`);

        if (!updateRes.ok) {
            throw new Error("Update failed: " + text);
        }
        console.log("✅ Update Success!");
    } catch (e) {
        console.error("❌ Update Failed:", e);
    }
}

testLogUpdate();
