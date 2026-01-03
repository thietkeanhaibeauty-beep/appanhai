const API_URL = "https://db.hpb.edu.vn";
const API_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";
const TABLE_RULES = "mp8nib5rn4l0mb4"; // AUTOMATED_RULES

async function fetchRules() {
    try {
        const response = await fetch(`${API_URL}/api/v2/tables/${TABLE_RULES}/records?limit=100`, {
            headers: {
                "xc-token": API_TOKEN,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Error fetching rules:", await response.text());
            return;
        }

        const data = await response.json();
        const rules = data.list || [];

        console.log(`Found ${rules.length} rules.`);

        const targetRule = rules.find(r => r.rule_name && r.rule_name.includes("80k"));
        if (targetRule) {
            console.log("Found Target Rule:", targetRule);
            console.log("ID:", targetRule.Id);
            console.log("Target Labels:", targetRule.target_labels);
            console.log("Conditions:", targetRule.conditions);
        } else {
            console.log("Rule '80k...' not found.");
            // List top 5 rules
            rules.slice(0, 5).forEach(r => console.log(`${r.Id}: ${r.rule_name}`));
        }

    } catch (error) {
        console.error("Script error:", error);
    }
}

fetchRules();
