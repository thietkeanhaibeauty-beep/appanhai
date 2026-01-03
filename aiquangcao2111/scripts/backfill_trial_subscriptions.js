const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDcxMTYsImV4cCI6MjA3OTI4MzExNn0.iRHg-xMZ1i_qb0xnQ6vDivcFEEdrpYb0Z6cSkgOLLyU';
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    PROFILES: 'mlcrus3sfhchdhw',
    USER_SUBSCRIPTIONS: 'm1i0c7r17slnb5g'
};

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

async function fetchAllRecords(tableId) {
    let allRecords = [];
    let offset = 0;
    const limit = 100;

    while (true) {
        const url = `${NOCODB_URL}/api/v2/tables/${tableId}/records?limit=${limit}&offset=${offset}`;
        const response = await fetch(url, {
            headers: {
                'xc-token': NOCODB_TOKEN
            }
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to fetch records from ${tableId}: ${response.status} - ${text}`);
        }

        const data = await response.json();
        const list = data.list || [];
        allRecords = [...allRecords, ...list];

        if (list.length < limit) break;
        offset += limit;
    }

    return allRecords;
}

async function invokeEdgeFunction(functionName, body) {
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Function failed: ${response.status} - ${text}`);
    }

    return response.json();
}

async function backfillTrials() {
    console.log('🚀 Starting Trial Subscription Backfill (Native Node.js)...');

    try {
        // 1. Fetch all profiles
        console.log('📥 Fetching all profiles...');
        const profiles = await fetchAllRecords(TABLES.PROFILES);
        console.log(`✅ Found ${profiles.length} profiles.`);

        // 2. Fetch all subscriptions
        console.log('📥 Fetching all subscriptions...');
        const subscriptions = await fetchAllRecords(TABLES.USER_SUBSCRIPTIONS);
        console.log(`✅ Found ${subscriptions.length} subscriptions.`);

        // 3. Identify users without subscription
        const subscribedUserIds = new Set(subscriptions.map(s => s.user_id));
        const usersWithoutSubscription = profiles.filter(p => !subscribedUserIds.has(p.user_id));

        console.log(`⚠️ Found ${usersWithoutSubscription.length} users without subscription.`);

        if (usersWithoutSubscription.length === 0) {
            console.log('✅ All users have subscriptions. Nothing to do.');
            return;
        }

        // 4. Assign trial to missing users
        console.log('🔄 Assigning trials...');
        let successCount = 0;
        let failCount = 0;

        for (const user of usersWithoutSubscription) {
            if (!user.user_id) {
                console.warn('⚠️ Skipping profile without user_id:', user);
                continue;
            }

            console.log(`👉 Assigning to user: ${user.user_id} (${user.full_name || 'No Name'})...`);

            try {
                await invokeEdgeFunction('assign-trial-subscription', { userId: user.user_id });
                console.log(`✅ Success: ${user.user_id}`);
                successCount++;
            } catch (err) {
                console.error(`❌ Failed to assign to ${user.user_id}:`, err.message);
                failCount++;
            }

            // Small delay
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log('🏁 Backfill complete!');
        console.log(`✅ Success: ${successCount}`);
        console.log(`❌ Failed: ${failCount}`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

backfillTrials();
