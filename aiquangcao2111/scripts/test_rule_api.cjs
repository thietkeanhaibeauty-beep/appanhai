// Test calling execute-automation-rule directly
const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MTkxMTcsImV4cCI6MjA0ODI5NTExN30.iRHg-xJRqcRy1kYCCxLpBM3s67b49Yn2tXd33_fclQM';

async function testRule() {
    console.log('🔍 Testing execute-automation-rule...');

    const ruleId = 42; // "80k 1 kết quả tắt"
    const userId = 'eef4323b-623f-4679-b89f-8c097c6d3514';

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/execute-automation-rule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                ruleId: ruleId,
                userId: userId,
                manualRun: true,
                dryRunOverride: true // Don't actually turn off, just test
            })
        });

        const data = await response.json();

        console.log('\n📊 Response Status:', response.status);
        console.log('📊 Response Data:', JSON.stringify(data, null, 2));

        if (data.debug) {
            console.log('\n🔧 Debug Info:');
            console.log('  - Labeled Campaign IDs:', data.debug.labeledCampaignIds);
            console.log('  - All Insights Count:', data.debug.allInsightsCount);
            console.log('  - Filtered Insights Count:', data.debug.filteredInsightsCount);
            console.log('  - Date Range:', data.debug.startDate, 'to', data.debug.endDate);
        }

        if (data.matchedCount !== undefined) {
            console.log('\n✅ Matched Count:', data.matchedCount);
        }

        if (data.error) {
            console.log('\n❌ Error:', data.error);
        }

    } catch (err) {
        console.error('❌ Fetch Error:', err.message);
    }
}

testRule();
