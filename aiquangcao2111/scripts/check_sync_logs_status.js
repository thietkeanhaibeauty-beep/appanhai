// const fetch = require('node-fetch'); // Node 20 has built-in fetch

// Configuration
const NOCODB_BASE_URL = "https://db.hpb.edu.vn";
const NOCODB_API_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_"; // Using the token found in previous files
const TABLE_SYNC_LOGS = "mtrjomtzrv1wwix"; // Correct ID from config.ts

async function checkSyncLogs() {
    console.log("Fetching recent Sync Logs...");

    try {
        const url = `${NOCODB_BASE_URL}/api/v2/tables/${TABLE_SYNC_LOGS}/records?limit=10&sort=-Id`;
        const response = await fetch(url, {
            headers: {
                "xc-token": NOCODB_API_TOKEN
            }
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText} - ${text}`);
        }

        const data = await response.json();
        const logs = data.list || [];

        if (logs.length === 0) {
            console.log("No sync logs found.");
        } else {
            console.log("Recent Sync Logs:");
            console.table(logs.map(log => ({
                Id: log.Id,
                Status: log.status,
                Started: log.started_at,
                Finished: log.finished_at,
                Records: log.records_processed,
                Error: log.error_message ? log.error_message.substring(0, 50) + "..." : "None"
            })));
        }

    } catch (error) {
        console.error("Error checking sync logs:", error.message);
    }
}

checkSyncLogs();
