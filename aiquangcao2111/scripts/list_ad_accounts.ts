/**
 * List all ad accounts from NocoDB
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

async function main() {
    console.log('Fetching all Ad Accounts...');
    const res = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/mfj39y0jmfqbxgx/records?limit=50`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const data = await res.json();

    if (!data.list || data.list.length === 0) {
        console.log('No ad accounts found in database!');
        return;
    }

    console.log(`Found ${data.list.length} accounts:`);
    data.list.forEach((acc: any) => {
        console.log(`- ID: ${acc.account_id}, Name: "${acc.account_name}", Active: ${acc.is_active}, User: ${acc.user_id}`);
    });
}

main().catch(console.error);
