const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz'; // FACEBOOK_INSIGHTS_AUTO

async function listAll() {
    console.log(`📋 Listing data in FACEBOOK_INSIGHTS_AUTO (${TABLE_ID})...\n`);
    const res = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?limit=100&sort=-UpdatedAt`, {
        headers: { 'xc-token': NOCODB_TOKEN }
    });
    const data = await res.json();
    const list = data.list || [];

    if (list.length === 0) {
        console.log('❌ Table is EMPTY.');
    } else {
        console.log(`✅ Found ${list.length} records.`);
        console.log('--------------------------------------------------');
        list.forEach(item => {
            console.log(`Typ: ${item.level.padEnd(8)} | Name: ${item.campaign_name?.substring(0, 20)}... | AdSet: ${item.adset_name?.substring(0, 20)}... | Spend: ${item.spend?.toLocaleString()} | Date: ${item.date_start}`);
        });
        console.log('--------------------------------------------------');
    }
}

listAll();
