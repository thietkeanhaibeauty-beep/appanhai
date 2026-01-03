const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDcxMTYsImV4cCI6MjA3OTI4MzExNn0.iRHg-xMZ1i_qb0xnQ6vDivcFEEdrpYb0Z6cSkgOLLyU';

async function triggerSync() {
    console.log('🚀 Triggering sync-ads-cron manually...');

    // Using date_preset=today to sync today's data
    const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-ads-cron`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`
        },
        body: JSON.stringify({ date_preset: 'today' })
    });

    if (res.ok) {
        const data = await res.json();
        console.log('✅ Sync Success!');
        console.log('Processed:', data.processed);
        if (data.logs) {
            console.log('\n--- Logs ---');
            data.logs.forEach(l => console.log(l));
        }
    } else {
        const txt = await res.text();
        console.error('❌ Sync Failed:', res.status, txt);
    }
}

triggerSync();
