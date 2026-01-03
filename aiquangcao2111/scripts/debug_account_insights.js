const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz'; // FACEBOOK_INSIGHTS

async function debugAccountInsights() {
    try {
        const accountId = 'act_724813253053178'; // Hồng vy thúy
        console.log(`Fetching records for account ${accountId}...`);

        const whereClause = encodeURIComponent(`(account_id,eq,${accountId})`);
        const url = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records?where=${whereClause}&limit=20&sort=-date_start`;

        console.log(`URL: ${url}`);

        const response = await fetch(url, {
            headers: {
                'xc-token': NOCODB_API_TOKEN
            }
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${text}`);
        }

        const data = await response.json();
        console.log(`Found ${data.list.length} records.`);

        if (data.list.length > 0) {
            console.log('Latest 5 records:');
            data.list.slice(0, 5).forEach(record => {
                console.log(`Date: ${record.date_start} | Campaign: ${record.campaign_name} | Spend: ${record.spend}`);
            });
        } else {
            console.log('No records found for this account.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

debugAccountInsights();
