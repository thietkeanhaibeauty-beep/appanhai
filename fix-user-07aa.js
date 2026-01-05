
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';

const TABLES = {
    Wallets: 'm16m58ti6kjlax0'
};

const USER_ID = '07aaed62-0bbf-460e-91f1-28190273706e';
const TARGET_COINS = 1200; // 100 * 12 (Hoc Vien 1 year)

async function fixSpecificUser() {
    try {
        console.log(`🔍 Checking wallet for user ${USER_ID}...`);

        const walletRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Wallets}/records?where=(user_id,eq,${USER_ID})&limit=1`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const walletData = await walletRes.json();
        const existingWallet = walletData.list?.[0];

        if (existingWallet) {
            console.log(`Found wallet. Balance: ${existingWallet.balance}`);
            // Fix if null or 0 or low
            if (!existingWallet.balance || existingWallet.balance < TARGET_COINS) {
                console.log(`Updating balance to ${TARGET_COINS}...`);
                await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Wallets}/records`, {
                    method: 'PATCH',
                    headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        Id: existingWallet.Id,
                        balance: TARGET_COINS
                    })
                });
                console.log('✅ Updated.');
            } else {
                console.log('✅ Balance is sufficient.');
            }
        } else {
            console.log('No wallet found. Creating...');
            await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Wallets}/records`, {
                method: 'POST',
                headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: USER_ID,
                    balance: TARGET_COINS
                })
            });
            console.log('✅ Created.');
        }

    } catch (e) {
        console.error(e);
    }
}

fixSpecificUser();
