/**
 * Manually trigger process-pending-reverts function
 */
const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0OTM0MDcsImV4cCI6MjA0NzA2OTQwN30.tFz7Wh5FEszl7rDQC_ByLOFDBKoYMZdZFKF2_5AFZNA';

async function main() {
    console.log('═'.repeat(60));
    console.log('Triggering process-pending-reverts...');
    console.log('═'.repeat(60));

    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-pending-reverts`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
