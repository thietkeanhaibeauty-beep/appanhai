const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'ms3iubpejoynr9a'; // FACEBOOK_AD_ACCOUNTS

async function checkOwner() {
    try {
        const accountId = 'act_724813253053178';
        console.log(`Checking owner of account ${accountId}...`);
        const whereClause = encodeURIComponent(`(account_id,eq,${accountId})`);
        const url = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records?where=${whereClause}&limit=1`;

        const response = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
        const data = await response.json();

        if (data.list.length > 0) {
            console.log('Account found:');
            console.log(`User ID: ${data.list[0].user_id}`);
            console.log(`Account Name: ${data.list[0].name}`);
        } else {
            console.log('Account not found.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkOwner();
