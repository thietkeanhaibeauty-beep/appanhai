
// import fetch from 'node-fetch'; // Native fetch in Node 20

const NOCODB_URL = "https://db.hpb.edu.vn";
const NOCODB_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";
const TABLE_INSIGHTS_AUTO = "m17gyigy8jqlaoz";

async function checkCampaignStatus() {
    const campaignName = "Anh tuấn";
    const where = encodeURIComponent(`(campaign_name,like,%${campaignName}%)`);
    const url = `${NOCODB_URL}/api/v2/tables/${TABLE_INSIGHTS_AUTO}/records?where=${where}&limit=10&sort=-date_start`;

    console.log(`Fetching records for campaign: ${campaignName}`);

    try {
        const res = await fetch(url, {
            headers: {
                "xc-token": NOCODB_TOKEN
            }
        });

        if (!res.ok) {
            console.error("Error fetching:", res.status, res.statusText);
            return;
        }

        const data = await res.json();
        const list = data.list || [];

        console.log(`Found ${list.length} records.`);
        list.forEach(r => {
            console.log(`Date: ${r.date_start}, ID: ${r.campaign_id}, Account: ${r.account_id}, Status: ${r.status}, Effective: ${r.effective_status}`);
        });

    } catch (e) {
        console.error("Exception:", e);
    }
}

checkCampaignStatus();
