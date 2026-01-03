const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz';

async function checkRaw() {
    console.log(`\n🔍 Checking Raw Record for Today...`);
    // Filter by date_start = 2025-12-11
    const where = encodeURIComponent(`(date_start,eq,2025-12-11)`);
    const url = `${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?where=${where}&limit=1`;

    const res = await fetch(url, { headers: { 'xc-token': NOCODB_TOKEN } });
    const data = await res.json();
    const list = data.list || [];

    if (list.length > 0) {
        console.log('--- RAW RECORD ---');
        console.log(JSON.stringify(list[0], null, 2));
    } else {
        console.log('No records found for today.');
    }
}

checkRaw();
