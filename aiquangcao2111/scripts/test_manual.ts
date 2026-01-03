/**
 * TEST THỦ CÔNG - Chạy 1 rule và hiện kết quả chi tiết
 * 
 * Hiển thị:
 * - Điều kiện nào đạt ✅ / chưa đạt 🔄
 * - Nếu tất cả đạt → Thực thi và hiện "Thành công"
 * - Nếu chưa đạt → Hiện "Đang đợi, điều kiện X chưa đạt"
 * 
 * Usage: npx tsx scripts/test_manual.ts <rule_id>
 */

const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0OTM0MDcsImV4cCI6MjA0NzA2OTQwN30.tFz7Wh5FEszl7rDQC_ByLOFDBKoYMZdZFKF2_5AFZNA';

// Rule info
const RULES: Record<number, { name: string; conditions: string }> = {
    19: { name: '100K không KQ → TẮT', conditions: 'spend >= 100K AND results = 0' },
    20: { name: '2 KQ + CPR<40K → TĂNG 30%', conditions: 'results = 2 AND cost_per_result < 40K' },
    21: { name: 'CPR<20K + 4KQ → TĂNG 30%', conditions: 'cost_per_result < 20K AND results >= 4' },
    22: { name: '80K không KQ → GIẢM 20%', conditions: 'spend >= 80K AND results = 0' }
};

function formatNumber(n: number): string {
    return n.toLocaleString('vi-VN');
}

async function main() {
    const ruleId = parseInt(process.argv[2]);

    if (!ruleId || !RULES[ruleId]) {
        console.log('\n📋 DANH SÁCH QUY TẮC THỰC TẾ:');
        console.log('─'.repeat(60));
        Object.entries(RULES).forEach(([id, info]) => {
            console.log(`   ID ${id}: ${info.name}`);
            console.log(`   Điều kiện: ${info.conditions}\n`);
        });
        console.log('─'.repeat(60));
        console.log('Usage: npx tsx scripts/test_manual.ts <rule_id>');
        console.log('VD: npx tsx scripts/test_manual.ts 19');
        return;
    }

    const rule = RULES[ruleId];
    console.log('\n' + '═'.repeat(60));
    console.log(`🧪 TEST THỦ CÔNG: Rule ${ruleId}`);
    console.log(`📋 ${rule.name}`);
    console.log(`📐 Điều kiện: ${rule.conditions}`);
    console.log('═'.repeat(60));

    // Call backend với dryRun=false để thực thi thật
    console.log('\n⏳ Đang kiểm tra điều kiện và thực thi...\n');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/execute-automation-rule`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ruleId })
    });

    const data = await response.json();

    if (!data.success) {
        console.log(`❌ Lỗi: ${data.error || 'Unknown error'}`);
        return;
    }

    console.log(`📊 Số adsets khớp nhãn: ${data.matchedCount || 0}`);

    if (!data.results || data.results.length === 0) {
        console.log('\n🔄 ĐANG ĐỢI: Không có adset nào được gắn nhãn mục tiêu');
        console.log('   → Gắn nhãn TEST-GIAM (ID:9) cho adset rồi chạy lại');
        return;
    }

    console.log('\n📝 KẾT QUẢ TỪNG ADSET:');
    console.log('─'.repeat(60));

    for (const result of data.results) {
        console.log(`\n📌 ${result.objectName}`);

        // Hiển thị metrics nếu có
        if (result.metrics) {
            console.log(`   📊 Metrics: spend=${formatNumber(result.metrics.spend || 0)}, results=${result.metrics.results || 0}, CPR=${formatNumber(Math.round((result.metrics.spend || 0) / (result.metrics.results || 1)))}`);
        }

        // Hiển thị từng điều kiện khớp/không khớp
        if (result.matchedConditions) {
            console.log('   📐 Điều kiện:');
            for (const cond of result.matchedConditions) {
                const icon = cond.met ? '✅' : '🔄';
                console.log(`      ${icon} ${cond.metric}: ${formatNumber(cond.actualValue || 0)} vs ${formatNumber(cond.threshold)} → ${cond.met ? 'ĐẠT' : 'CHƯA ĐẠT'}`);
            }
        }

        // Hiển thị kết quả
        if (result.status === 'completed' || result.result === 'success') {
            console.log(`   ✅ THÀNH CÔNG: Đã thực thi ${result.action}`);
            if (result.details) {
                console.log(`      ${JSON.stringify(result.details)}`);
            }
        } else if (result.status === 'skipped' || result.result === 'skipped') {
            if (result.reason?.includes('giới hạn')) {
                console.log(`   ⏸️ ĐÃ ĐẠT GIỚI HẠN: ${result.reason}`);
            } else if (result.reason?.includes('ROAS') || result.reason?.includes('điều kiện')) {
                console.log(`   🔄 ĐANG ĐỢI: ${result.reason}`);
            } else {
                console.log(`   🔄 ĐANG ĐỢI: ${result.reason || 'Điều kiện chưa đạt'}`);
            }
        } else if (result.status === 'failed' || result.result === 'failed') {
            console.log(`   ❌ LỖI: ${result.error || 'Unknown error'}`);
        } else {
            console.log(`   ℹ️ Status: ${result.status || result.result}`);
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📝 TÓM TẮT:');
    const success = data.results.filter((r: any) => r.status === 'completed' || r.result === 'success').length;
    const waiting = data.results.filter((r: any) => r.status === 'skipped' && !r.reason?.includes('giới hạn')).length;
    const limited = data.results.filter((r: any) => r.reason?.includes('giới hạn')).length;

    console.log(`   ✅ Thành công: ${success}`);
    console.log(`   🔄 Đang đợi: ${waiting}`);
    console.log(`   ⏸️ Đạt giới hạn: ${limited}`);
    console.log('═'.repeat(60));
}

main().catch(console.error);
