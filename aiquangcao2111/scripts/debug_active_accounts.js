const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'ms3iubpejoynr9a'; // FACEBOOK_AD_ACCOUNTS

async function verifyFix() {
    try {
        const users = [
            'fc1be8c2-3052-4fc1-9371-8627db5a4f8a', // Has is_active: true
            'e9ed2435-1a36-435b-82e0-ff7eb4afc839'  // Has is_active: 1
        ];

        for (const userId of users) {
            console.log(`Testing user ${userId}...`);

            // Combined filter
            const whereClause = encodeURIComponent(`(user_id,eq,${userId})~and((is_active,eq,true)~or(is_active,eq,1))`);
            const url = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records?where=${whereClause}&limit=100`;

            console.log(`URL: ${url}`);

            const response = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
            const data = await response.json();

            console.log(`Found ${data.list.length} records.`);
            if (data.list.length > 0) {
                console.log('SUCCESS: Found active account.');
            } else {
                console.error('FAILURE: No active account found.');
            }
            console.log('------------------------------------------------');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

verifyFix();
