const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz';

async function checkMetrics() {
    console.log(`\n🔍 Checking Metrics in FACEBOOK_INSIGHTS_AUTO...`);
    const today = '2025-12-11';

    // Check for records with spend > 0
    const where = encodeURIComponent(`(date_start,eq,${today})~and(spend,gt,0)`);
    const url = `${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?where=${where}&limit=5`;

    const res = await fetch(url, { headers: { 'xc-token': NOCODB_TOKEN } });
    const data = await res.json();
    const list = data.list || [];

    console.log(`Found ${data.pageInfo?.totalRows ?? list.length} records with Spend > 0 for today.`);

    if (list.length > 0) {
        list.forEach(r => {
            console.log(`- [${r.level}] ${r.insight_key}`);
            console.log(`  Spend: ${r.spend}, Results: ${r.results}, Cost/Res: ${r.cost_per_result}`);
        });
    } else {
        // Check finding ANY record
        const whereAny = encodeURIComponent(`(date_start,eq,${today})`);
        const resAny = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?where=${whereAny}&limit=5`, { headers: { 'xc-token': NOCODB_TOKEN } });
        const dataAny = await resAny.json();
        console.log(`Total records for today (including 0 spend): ${dataAny.pageInfo?.totalRows ?? dataAny.list?.length}`);
        if (dataAny.list?.length > 0) {
            console.log('Sample 0-spend records:');
            dataAny.list.forEach(r => console.log(`- [${r.level}] Spend: ${r.spend} Key: ${r.insight_key}`));
        }
    }
}

checkMetrics();
