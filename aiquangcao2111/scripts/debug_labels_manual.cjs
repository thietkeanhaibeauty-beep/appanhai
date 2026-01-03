const API_URL = "https://db.hpb.edu.vn";
const API_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";
const TABLE_ASSIGNMENTS = "myjgw4ial5s6zrw"; // CAMPAIGN_LABEL_ASSIGNMENTS

async function checkAssignments() {
    try {
        console.log("Checking assignments for Label 23...");
        const response = await fetch(`${API_URL}/api/v2/tables/${TABLE_ASSIGNMENTS}/records?where=(label_id,eq,23)&limit=100`, {
            headers: {
                "xc-token": API_TOKEN,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Error fetching assignments:", await response.text());
            return;
        }

        const data = await response.json();
        const list = data.list || [];

        console.log(`Found ${list.length} assignments for Label 23.`);

        list.forEach(a => {
            console.log(`Assignment: ID ${a.Id}, Campaign: ${a.campaign_id}, AdSet: ${a.adset_id}, Ad: ${a.ad_id}`);
        });

    } catch (error) {
        console.error("Script error:", error);
    }
}

checkAssignments();
