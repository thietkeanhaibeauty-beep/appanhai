// const fetch = require('node-fetch');

// Configuration
const NOCODB_BASE_URL = "https://db.hpb.edu.vn";
const NOCODB_API_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";
const TABLE_ID = "m4kdxt87npriw50"; // NOTIFICATION_CONFIGS
const RECORD_ID = 3; // Using ID 3 from previous check

async function testUpdate() {
    console.log(`Testing update for Record ID: ${RECORD_ID}`);

    // Test 1: Bulk Update (Current Method)
    console.log("\n--- Test 1: Bulk Update (Array) ---");
    try {
        const payload = [{
            Id: "3", // Test as string
            is_active: false
        }];

        const url = `${NOCODB_BASE_URL}/api/v2/tables/${TABLE_ID}/records`;
        console.log("URL:", url);
        console.log("Payload:", JSON.stringify(payload));

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                "xc-token": NOCODB_API_TOKEN,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`❌ Bulk Update Failed: ${response.status} - ${text}`);
        } else {
            console.log("✅ Bulk Update Success");
            const data = await response.json();
            console.log("Response:", data);
        }

    } catch (error) {
        console.error("Error in Test 1:", error.message);
    }

    // Test 2: Single Record Update (Alternative Method)
    console.log("\n--- Test 2: Single Record Update (URL Param) ---");
    try {
        const payload = {
            is_active: true // Toggle back to true
        };

        const url = `${NOCODB_BASE_URL}/api/v2/tables/${TABLE_ID}/records/${RECORD_ID}`;
        console.log("URL:", url);
        console.log("Payload:", JSON.stringify(payload));

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                "xc-token": NOCODB_API_TOKEN,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`❌ Single Update Failed: ${response.status} - ${text}`);
        } else {
            console.log("✅ Single Update Success");
            const data = await response.json();
            console.log("Response:", data);
        }

    } catch (error) {
        console.error("Error in Test 2:", error.message);
    }
}

testUpdate();
