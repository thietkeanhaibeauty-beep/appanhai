
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';

const TABLES = {
    Subscriptions: 'myjov622ntt3j73',
    Packages: 'm9fazh5nc6dt1a3',
    Wallets: 'm16m58ti6kjlax0',
    Users: 'm16m58ti6kjlax0' // Assuming Wallet is User table or related
};

async function migrateUserCoins() {
    try {
        console.log('🔄 Starting user coin migration...');

        // 1. Get Packages to map ID -> Coins
        const pkgRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Packages}/records?limit=100`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const pkgData = await pkgRes.json();
        const pkgMap = {};
        for (const p of pkgData.list) {
            pkgMap[p.Id] = p.coins || 0; // Use Id or Name? Subscriptions use package_id matching Package Name or Id?
            // Based on Pricing.jsx, it sends `package_id: pkgId` (e.g. 'HocVien', 'Trial').
            // So we map Name -> Coins
            pkgMap[p.name] = p.coins || 0;
            // Also map ID -> Coins just in case
            pkgMap[p.Id] = p.coins || 0;
        }
        console.log('📦 Package Coin Map:', pkgMap);

        // 2. Get Active Subscriptions
        // Filter where status = active
        const subRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Subscriptions}/records?where=(status,eq,active)&limit=1000`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const subData = await subRes.json();
        const subscriptions = subData.list || [];
        console.log(`🔍 Found ${subscriptions.length} active subscriptions.`);

        // 3. Update each user's wallet
        for (const sub of subscriptions) {
            const userId = sub.user_id;
            const packageId = sub.package_id; // This is a string name like 'HocVien' or 'Pro'
            const coinGrant = pkgMap[packageId] || 0;

            if (!userId) continue;

            if (coinGrant > 0) {
                // Get current wallet to check if already has coins? 
                // Or just SET the balance? 
                // PROPOSAL: If balance is 0, set to coinGrant. If > 0, maybe add?
                // Safeguard: Check if this user was already migrated? 
                // For this quick fix, let's just ENSURE they have at least the package amount.

                // Fetch User Wallet
                const walletRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Wallets}/records?where=(user_id,eq,${userId})&limit=1`, {
                    headers: { 'xc-token': NOCODB_TOKEN }
                });
                const walletData = await walletRes.json();
                const wallet = walletData.list?.[0];

                if (wallet) {
                    const currentBalance = wallet.balance || 0;
                    // Only update if balance is 0 (assuming they haven't used any or it's a fresh migration)
                    // OR specifically for the user complaining.
                    // Better logic: If currentBalance < coinGrant, top it up.
                    // Or for now, just ADD it? No, that might double dip if we run twice.
                    // Let's sets it to coinGrant if it's 0.

                    if (currentBalance === 0) {
                        console.log(`👤 User ${userId} (Pkg: ${packageId}): Setting balance 0 -> ${coinGrant}`);
                        await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Wallets}/records`, {
                            method: 'PATCH',
                            headers: {
                                'xc-token': NOCODB_TOKEN,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                Id: wallet.Id,
                                balance: coinGrant
                            })
                        });
                    } else {
                        console.log(`👤 User ${userId} has ${currentBalance} coins. Skipping overwrite (Pkg grants ${coinGrant}).`);
                    }
                }
            }
        }
        console.log('✅ Migration complete.');

    } catch (error) {
        console.error('❌ Migration Error:', error);
    }
}

migrateUserCoins();
