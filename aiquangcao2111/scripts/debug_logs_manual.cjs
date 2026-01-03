// Hardcoded config based on supabase/functions/_shared/nocodb-config.ts
const API_URL = "https://db.hpb.edu.vn";
const API_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";

// Table IDs from config
const TABLE_LOGS = "masstbinn3h8hkr"; // AUTOMATION_RULE_EXECUTION_LOGS

async function fetchLogs() {
    try {
        console.log("Fetching logs from:", API_URL);
        // Limit 20, Sort by Id descending (newest first)
        const response = await fetch(`${API_URL}/api/v2/tables/${TABLE_LOGS}/records?limit=20&sort=-Id`, {
            headers: {
                "xc-token": API_TOKEN,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Error fetching logs:", await response.text());
            return;
        }

        const data = await response.json();
        const logs = data.list || [];

        console.log(`Found ${logs.length} logs.`);

        for (const log of logs) {
            if (String(log.rule_id) === "42") {
                console.log("\n---------------------------------------------------");
                console.log(`✅ FOUND LOG FOR RULE 42!`);
                console.log(`Log ID: ${log.Id}`);
                console.log(`Status: ${log.status}`);
                console.log(`Executed At: ${log.executed_at}`);
                console.log(`Matched Count: ${log.matched_objects_count}`);
                console.log(`Details:`);
                console.log(log.details ? log.details.substring(0, 1000) : "No details");

                try {
                    const parsed = JSON.parse(log.details);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        try {
                            const detailsObj = JSON.parse(parsed[0].details || "{}");
                            console.log("Skipped Reason:", detailsObj.reason);
                            console.log("Skipped Details:", detailsObj.details);
                        } catch (e) { }
                    }
                } catch (e) { }
            }
        }
    } catch (error) {
        console.error("Script error:", error);
    }
}

fetchLogs();
