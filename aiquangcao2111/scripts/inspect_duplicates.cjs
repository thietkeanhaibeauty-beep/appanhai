const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz';

async function inspectDuplicates() {
    console.log(`\n🔍 Inspecting Duplicate Keys...`);
    const today = '2025-12-11';

    // Fetch a known duplicate group
    // From previous output: campaign_120240908433890334__
    const campaignId = '120240908433890334';

    const where = encodeURIComponent(`(campaign_id,eq,${campaignId})~and(date_start,eq,${today})`);
    const url = `${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?where=${where}&limit=10`;

    const res = await fetch(url, { headers: { 'xc-token': NOCODB_TOKEN } });
    const data = await res.json();
    const list = data.list || [];

    console.log(`Found ${list.length} records for Campaign ${campaignId}:`);
    list.forEach(r => {
        console.log(`- Id: ${r.Id}`);
        console.log(`  CreatedAt: ${r.CreatedAt}`);
        console.log(`  Key: ${r.insight_key}`);
        console.log(`  Spend: ${r.spend}`);
    });
}

inspectDuplicates();
