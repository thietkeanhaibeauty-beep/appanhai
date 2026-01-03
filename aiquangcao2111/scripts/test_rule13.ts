/**
 * Test Rule 13 (TEST-TAT-BAT-LAI) - Turn off and auto-revert after 5 minutes
 */
const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0OTM0MDcsImV4cCI6MjA0NzA2OTQwN30.tFz7Wh5FEszl7rDQC_ByLOFDBKoYMZdZFKF2_5AFZNA';

async function main() {
    console.log('═'.repeat(60));
    console.log('Thực thi Rule 13 (TEST-TAT-BAT-LAI)');
    console.log('Hành động: Tắt adset + Tự động bật lại sau 5 phút');
    console.log('═'.repeat(60));

    const userId = '3b69c215-aba9-4b73-bbaa-3795b8ed38df';
    const ruleId = 13;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/execute-automation-rule`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ruleId: ruleId,
            userId: userId,
            dryRun: false
        })
    });

    console.log('\nHTTP Status:', response.status);
    const data = await response.json();

    console.log('\n📊 Kết quả:');
    console.log('   matchedCount:', data.matchedCount);
    console.log('   results:', data.results?.length || 0, 'items');

    if (data.results && data.results.length > 0) {
        const result = data.results[0];
        console.log('\n🎯 Chi tiết thực thi:');
        console.log('   Object:', result.objectName);
        console.log('   Action:', result.action);
        console.log('   Result:', result.result);
        console.log('   Status:', result.status);
        if (result.details) {
            console.log('   Details:', JSON.stringify(result.details, null, 2));
        }
    }

    if (data.error) {
        console.log('\n❌ Error:', data.error);
    }

    console.log('\n📝 Full response:');
    console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
