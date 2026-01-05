
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';

const TABLES = {
    Subscriptions: 'myjov622ntt3j73',
    Packages: 'm9fazh5nc6dt1a3',
    Wallets: 'm16m58ti6kjlax0'
};

async function debugHocVien() {
    try {
        console.log('🔍 Debugging HocVien Subscriptions...');

        // 1. Get All Active Subscriptions with HocVien
        // Note: Using 'like' because exact match might fail if case differs or padding
        const subRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Subscriptions}/records?where=(package_id,like,HocVien)~or(package_id,like,hocvien)&limit=20`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const subData = await subRes.json();

        console.log(`Found ${subData.list?.length || 0} HocVien subscriptions.`);

        for (const sub of (subData.list || [])) {
            console.log(`\n---------------------------------`);
            console.log(`👤 User: ${sub.user_id}`);
            console.log(`📦 Package: ${sub.package_id}`);
            console.log(`📅 End Date: ${sub.end_date}`);

            // Check Wallet
            const walletRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Wallets}/records?where=(user_id,eq,${sub.user_id})&limit=1`, {
                headers: { 'xc-token': NOCODB_TOKEN }
            });
            const walletData = await walletRes.json();
            const wallet = walletData.list?.[0];

            console.log(`💰 Wallet Balance: ${wallet ? wallet.balance : 'NO WALLET'}`);

            // Auto-Fix
            if (!wallet || wallet.balance === 0) {
                console.log('🛠️ Fixing coin balance for this user...');
                const COINS_PER_MONTH = 100; // HocVien
                let totalCoins = COINS_PER_MONTH;

                // Calc duration
                if (sub.end_date) {
                    const end = new Date(sub.end_date);
                    const now = new Date();
                    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
                    if (diffDays > 300) totalCoins = 100 * 12; // 1 year
                }

                console.log(`   -> Target Coins: ${totalCoins}`);

                if (wallet) {
                    await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Wallets}/records`, {
                        method: 'PATCH',
                        headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            Id: wallet.Id,
                            balance: totalCoins
                        })
                    });
                } else {
                    await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Wallets}/records`, {
                        method: 'POST',
                        headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: sub.user_id,
                            balance: totalCoins
                        })
                    });
                }
                console.log('   ✅ Fixed.');
            } else {
                console.log('   ✅ Wallet has positive balance. Skipping.');
            }
        }

    } catch (e) {
        console.error(e);
    }
}

debugHocVien();
