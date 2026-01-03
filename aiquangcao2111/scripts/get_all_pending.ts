/**
 * Get all pending reverts records
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

async function main() {
    console.log('Fetching ALL pending reverts...');
    const res = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/mwfp1d1542ab4ok/records?limit=20`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const data = await res.json();

    console.log(`Total: ${data.list?.length || 0} records\n`);
    for (const r of data.list || []) {
        console.log(`ID: ${r.Id}`);
        console.log(`  object_id: ${r.object_id}`);
        console.log(`  revert_action: ${r.revert_action}`);
        console.log(`  revert_at: ${r.revert_at}`);
        console.log(`  status: ${r.status}`);
        console.log(`  CreatedAt: ${r.CreatedAt1}`);
        console.log('');
    }
}

main().catch(console.error);
