
const BASE_URL = 'https://db.hpb.edu.vn';
const TOKEN = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';
const TABLE_ID = 'mhgqm56k0lobsgn';
const CODE = 'TEST1234';

async function test() {
    try {
        console.log('--- Debugging with LIKE ---');
        // Test 'like'
        console.log(`\nTesting filter: (Code,like,${CODE})...`);
        const query = `(Code,like,${CODE})`; // Try without % first
        const url = `${BASE_URL}/api/v2/tables/${TABLE_ID}/records?where=${encodeURIComponent(query)}&limit=5`;

        const res = await fetch(url, { headers: { 'xc-token': TOKEN } });
        const data = await res.json();

        console.log('Search Result:', data.list?.length > 0 ? '✅ Found' : '❌ Not Found');
        if (data.list) console.log(data.list);

    } catch (e) { console.error(e); }
}

test();
