/**
 * Manually invoke execute-automation-rule to test the fix
 */;

const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0OTM0MDcsImV4cCI6MjA0NzA2OTQwN30.tFz7Wh5FEszl7rDQC_ByLOFDBKoYMZdZFKF2_5AFZNA';

async function main() {
    console.log('Manually invoking execute-automation-rule for Rule 12...\n');

    const userId = '3b69c215-aba9-4b73-bbaa-3795b8ed38df';
    const ruleId = 12;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/execute-automation-rule`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ruleId: ruleId,
            userId: userId,
            dryRun: true // Start with dry run to see what would happen
        })
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
