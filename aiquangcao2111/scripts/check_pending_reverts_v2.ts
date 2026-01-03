/**
 * Check PENDING_REVERTS with correct table ID
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mwfp1d1542ab4ok'; // Correct ID from config

async function main() {
    console.log('═'.repeat(60));
    console.log('Kiểm tra PENDING_REVERTS (bảng lên lịch bật lại)');
    console.log('═'.repeat(60));

    const res = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLE_ID}/records?limit=20`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });

    const data = await res.json();
    console.log(`\nĐã lên lịch ${data.list?.length || 0} hành động:\n`);

    if (data.list && data.list.length > 0) {
        for (const item of data.list) {
            console.log(`📅 ID: ${item.Id}`);
            console.log(`   Object: ${item.object_id} (${item.object_type})`);
            console.log(`   Hành động: ${item.action_type}`);
            console.log(`   Lên lịch: ${item.execute_at}`);
            console.log(`   Trạng thái: ${item.status}`);
            console.log('');
        }
    } else {
        console.log('Không có hành động nào được lên lịch.');
        console.log('\nDEBUG: Có thể backend không lưu được hoặc API call bị fail.');
    }
}

main().catch(console.error);
