const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'ms3iubpejoynr9a'; // FACEBOOK_AD_ACCOUNTS

async function debugAdAccounts() {
    try {
        console.log(`Fetching records from table ${TABLE_ID}...`);
        const url = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records?limit=20`;

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
            console.log('Latest 5 records sample:');
            data.list.slice(0, 5).forEach(record => {
                console.log('------------------------------------------------');
                console.log(`ID: ${record.Id}`);
                console.log(`User ID: ${record.user_id}`);
                console.log(`Account ID: ${record.account_id}`);
                console.log(`Account Name: ${record.account_name}`);
                console.log(`Is Active: ${record.is_active}`);
            });
        } else {
            console.log('No records found in the table.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

debugAdAccounts();
