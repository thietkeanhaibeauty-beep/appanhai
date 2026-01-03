const API_URL = "https://db.hpb.edu.vn";
const API_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";

const TABLE_ASSIGNMENTS = "myjgw4ial5s6zrw";     // CAMPAIGN_LABEL_ASSIGNMENTS
const TABLE_INSIGHTS = "m2uao1is9j02wfn";       // FACEBOOK_INSIGHTS (or m17gyigy8jqlaoz for AUTO?)
// index.ts uses FACEBOOK_INSIGHTS_AUTO (m17gyigy8jqlaoz) 
// Wait, checking restored index.ts code...
// line 19: FACEBOOK_INSIGHTS: NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO, (m17gyigy8jqlaoz)
const TABLE_INSIGHTS_AUTO = "m17gyigy8jqlaoz";

const ADSET_ID = "120240709129460334";
const USER_ID = "eef4323b-623f-4679-b89f-8c097c6d3514";
const DATE_CHECK = "2025-12-11";

async function checkData() {
    try {
        // 1. Check Assignment
        console.log(`\n--- Checking Assignment for AdSet ${ADSET_ID} ---`);
        const assignRes = await fetch(`${API_URL}/api/v2/tables/${TABLE_ASSIGNMENTS}/records?where=(adset_id,eq,${ADSET_ID})`, {
            headers: { "xc-token": API_TOKEN }
        });
        const assignData = await assignRes.json();
        const assignment = assignData.list?.[0];
        console.log("Assignment:", assignment);
        console.log("Match User ID?", assignment?.user_id === USER_ID);

        // 2. Check Insights (Auto Table)
        console.log(`\n--- Checking Insights (Auto) for Date >= ${DATE_CHECK} ---`);
        const insightRes = await fetch(`${API_URL}/api/v2/tables/${TABLE_INSIGHTS_AUTO}/records?where=(adset_id,eq,${ADSET_ID})~and(date_start,ge,${DATE_CHECK})&limit=10`, {
            headers: { "xc-token": API_TOKEN }
        });

        if (!insightRes.ok) {
            console.log("Error fetching insights:", await insightRes.text());
        } else {
            const insightData = await insightRes.json();
            const insights = insightData.list || [];
            console.log(`Found ${insights.length} insights.`);
            insights.forEach(i => {
                console.log(`Insight: Start ${i.date_start}, Spend: ${i.spend}, Results: ${i.results}`);
            });
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

checkData();
