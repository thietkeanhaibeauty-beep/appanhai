/**
 * Test NocoDB query for label matching
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

async function main() {
    // Test query like backend does
    const labelIds = '"9"'; // This is what the backend generates from ["9"]
    const query = encodeURIComponent(`(label_id,in,${labelIds})`);

    console.log('Testing NocoDB query:');
    console.log('  labelIds (from target_labels.join):', labelIds);
    console.log('  Full query:', `(label_id,in,${labelIds})`);

    const res = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/myjgw4ial5s6zrw/records?where=${query}&limit=10`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });

    const data = await res.json();
    console.log('\nResults:', data.list?.length || 0);
    (data.list || []).forEach((r: any) => {
        console.log(`  - ID: ${r.Id}, label_id: ${r.label_id}, adset_id: ${r.adset_id}`);
    });

    // Also test with just 9 (no quotes)
    console.log('\n--- Try with just "9" ---');
    const query2 = encodeURIComponent(`(label_id,in,9)`);
    const res2 = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/myjgw4ial5s6zrw/records?where=${query2}&limit=10`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const data2 = await res2.json();
    console.log('Results:', data2.list?.length || 0);
    (data2.list || []).forEach((r: any) => {
        console.log(`  - ID: ${r.Id}, label_id: ${r.label_id}, adset_id: ${r.adset_id}`);
    });
}

main().catch(console.error);
