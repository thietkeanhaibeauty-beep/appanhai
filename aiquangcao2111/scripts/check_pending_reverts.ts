/**
 * Check pending reverts table for scheduled actions
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

async function main() {
    console.log('═'.repeat(60));
    console.log('Kiểm tra PENDING_REVERTS (hành động được lên lịch bật lại)');
    console.log('═'.repeat(60));

    // Table ID for PENDING_REVERTS from config
    const res = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/mziwykqsmm4kxgz/records?limit=20&sort=-scheduled_at`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });

    const data = await res.json();
    console.log(`\nĐã lên lịch ${data.list?.length || 0} hành động:\n`);

    for (const item of data.list || []) {
        const scheduledAt = new Date(item.scheduled_at);
        const now = new Date();
        const diffMs = scheduledAt.getTime() - now.getTime();
        const diffMin = Math.round(diffMs / 60000);

        console.log(`📅 ${item.Id}`);
        console.log(`   Object: ${item.object_id} (${item.object_type})`);
        console.log(`   Hành động: ${item.action_type}`);
        console.log(`   Lên lịch: ${scheduledAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
        console.log(`   Trạng thái: ${item.status}`);
        console.log(`   Còn: ${diffMin > 0 ? diffMin + ' phút' : 'Đã quá hạn ' + Math.abs(diffMin) + ' phút'}`);
        console.log('');
    }
}

main().catch(console.error);
