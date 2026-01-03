const FACEBOOK_BASE_URL = "https://graph.facebook.com/v21.0";
const ACCESS_TOKEN = "EAAEwq8x4k2IBO4R1ZAmw9vK611v1W2Q0lK0ZCDjZAeZBYk4zV8g12ZC20v452Wf1XglAZAm0kH7cI90b8mZC1q0LCNz61lT4V5ZAs443ZCr8JTZCf8h06eZBkC9bM0xI9U30sYy4i9i0pG6731y05l1ZBj45ZCh282F92X3415C29g1351111624V226k15b94X515l6811";
const AD_ACCOUNT_ID = "act_1279205069357827"; // From previous context logs
const DATE_PRESET = "today";

async function testInsights() {
    console.log(`\n🔍 Fetching Insights for Account: ${AD_ACCOUNT_ID} (Preset: ${DATE_PRESET})`);

    const insightFields = [
        "campaign_id", "campaign_name", "spend", "impressions"
    ].join(",");

    // Explicitly using the same params as Sync Job
    const url = `${FACEBOOK_BASE_URL}/${AD_ACCOUNT_ID}/insights?level=campaign&date_preset=${DATE_PRESET}&fields=${insightFields}&limit=100&access_token=${ACCESS_TOKEN}`;

    console.log(`URL: ${url}`);

    try {
        const res = await fetch(url);
        const json = await res.json();

        if (json.error) {
            console.error('❌ API Error:', json.error);
            return;
        }

        console.log(`Found ${json.data.length} records.`);
        json.data.forEach(item => {
            console.log(`Camp: ${item.campaign_name} | Spend: ${item.spend}`);
        });

        // Check specifically for "Feedback Sáng 9/12"
        const target = json.data.find(i => i.campaign_name && i.campaign_name.includes("Feedback Sáng 9/12"));
        if (target) {
            console.log(`\n✅ FOUND TARGET: ${target.campaign_name} - Spend: ${target.spend}`);
        } else {
            console.log(`\n❌ TARGET NOT FOUND in response.`);
        }

    } catch (e) {
        console.error('Fetch Failed:', e);
    }
}

testInsights();
