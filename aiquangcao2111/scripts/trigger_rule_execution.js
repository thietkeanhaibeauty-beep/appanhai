const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1NzY2ODUsImV4cCI6MjA0NzE1MjY4NX0.uX_j2rX_j2rX_j2rX_j2rX_j2rX_j2rX_j2rX_j2rX_j2r'; // Anon key from previous context or env
// Note: Using anon key might not work if function requires service role or auth. 
// But execute-automation-rule usually checks body userId.

async function triggerRule() {
    try {
        console.log(`Triggering rule 7...`);
        const url = `${SUPABASE_URL}/functions/v1/execute-automation-rule`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ruleId: 2,
                userId: 'e9ed2435-1a36-435b-82e0-ff7eb4afc839', // Correct user ID
                manualRun: true
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${text}`);
        }

        const data = await response.json();
        console.log('Execution Result:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

triggerRule();
