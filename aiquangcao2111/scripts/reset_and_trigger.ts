/**
 * Reset failed revert records to pending and trigger again
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mwfp1d1542ab4ok';

const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0OTM0MDcsImV4cCI6MjA0NzA2OTQwN30.tFz7Wh5FEszl7rDQC_ByLOFDBKoYMZdZFKF2_5AFZNA';

async function main() {
    console.log('1. Resetting revert ID:4 to pending...');

    // Reset the real adset revert to pending
    const resetRes = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLE_ID}/records`, {
        method: 'PATCH',
        headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            Id: 4,
            status: 'pending'
        })
    });
    console.log('   Reset status:', resetRes.status);

    console.log('\n2. Triggering process-pending-reverts...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-pending-reverts`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });

    console.log('   Status:', response.status);
    const data = await response.json();
    console.log('   Response:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
