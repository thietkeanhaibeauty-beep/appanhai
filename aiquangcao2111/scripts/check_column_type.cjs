const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz'; // FACEBOOK_INSIGHTS_AUTO

async function checkMeta() {
    console.log(`\n🔍 Checking Column Types for table ${TABLE_ID}...`);

    const url = `${NOCODB_URL}/api/v2/meta/tables/${TABLE_ID}`;

    // NocoDB API structure might differ for v2 meta. 
    // Usually it returns table details including columns.

    const res = await fetch(url, { headers: { 'xc-token': NOCODB_TOKEN } });
    const data = await res.json();

    const columns = data.columns || [];

    const idCols = columns.filter(c => ['campaign_id', 'adset_id', 'ad_id', 'account_id'].includes(c.title));

    console.log('--- ID Columns ---');
    idCols.forEach(c => {
        console.log(`${c.title}: ${c.uidt} (Type: ${c.dt})`);
    });
}

checkMeta();
