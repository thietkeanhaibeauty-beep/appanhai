// const fetch = require('node-fetch'); // Node 20 has built-in fetch

// Configuration
const NOCODB_BASE_URL = "https://db.hpb.edu.vn";
const NOCODB_API_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";
const TABLE_ID = "m4kdxt87npriw50"; // NOTIFICATION_CONFIGS

async function checkData() {
    console.log("Fetching Notification Configs...");

    try {
        const url = `${NOCODB_BASE_URL}/api/v2/tables/${TABLE_ID}/records?limit=10&sort=-Id`;
        const response = await fetch(url, {
            headers: {
                "xc-token": NOCODB_API_TOKEN
            }
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText} - ${text}`);
        }

        const data = await response.json();
        const list = data.list || [];

        if (list.length === 0) {
            console.log("No records found.");
        } else {
            console.log("Recent Records:");
            list.forEach(item => {
                console.log(`ID: ${item.Id}`);
                console.log(`Name: ${item.name}`);
                console.log(`Selected Metrics (Raw):`, item.selected_metrics);
                console.log(`Type of Metrics:`, typeof item.selected_metrics);
                console.log("-------------------");
            });
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
}

checkData();
