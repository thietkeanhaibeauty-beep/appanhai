
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';

const TABLES = {
    Subscriptions: 'myjov622ntt3j73',
    Packages: 'm9fazh5nc6dt1a3',
    Wallets: 'm16m58ti6kjlax0'
};

async function forceMigrate() {
    try {
        console.log('🔄 Re-running User Migration...');

        // 1. Build Map
        const pkgRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Packages}/records?limit=100`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const pkgData = await pkgRes.json();
        const pkgMap = {};
        for (const p of pkgData.list) {
            pkgMap[p.Id] = p.coins || 0;
            pkgMap[p.name] = p.coins || 0;
            // Handle case-insensitive match if needed?
        }
        console.log('📦 Package Map:', pkgMap);

        // 2. Get Active Subs
        const subRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Subscriptions}/records?where=(status,eq,active)&limit=1000`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const subData = await subRes.json();

        for (const sub of subData.list) {
            const userId = sub.user_id;
            // The package_id in subscription might be ID or Name. 
            // Based on earlier logs, it seemed to be ID '19' or Name 'HocVien'.
            const pkgId = sub.package_id;

            // Determine monthly coin amount
            let monthlyCoins = pkgMap[pkgId] || 0;
            if (monthlyCoins === 0) {
                // Try parsing ID if it's a string number
                monthlyCoins = pkgMap[parseInt(pkgId)] || 0;
            }
            // Fallback: Try mapping known names
            if (monthlyCoins === 0) {
                if (pkgId === 'Pro') monthlyCoins = 200;
                if (pkgId === 'Starter') monthlyCoins = 50;
                if (pkgId === 'HocVien') monthlyCoins = 100;
                if (pkgId === 'Trial') monthlyCoins = 10;
            }

            if (monthlyCoins === 0) {
                console.log(`⚠️ No coins found for package ${pkgId} (User ${userId})`);
                continue;
            }

            // Calculate Multiplier based on End Date
            let multiplier = 1;
            if (sub.end_date) {
                const end = new Date(sub.end_date);
                const now = new Date();
                const diffTime = Math.abs(end - now);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // If duration > 360 days => 12 months/year
                // User has "5/1/2027", so > 365 days.
                // Logic: 
                // < 35 days: 1 month
                // > 300 days: 12 months? 
                // Or just grant 1 month for now to be safe, unless it's clearly a yearly pack.
                // The user complained "if 1 year then monthly?". 
                // Let's grant 12x if > 300 days.
                if (diffDays > 300) multiplier = 12;
            }

            const totalGrant = monthlyCoins * multiplier;
            console.log(`👤 User ${userId} (Pkg: ${pkgId}): Granting ${totalGrant} coins (${monthlyCoins} x ${multiplier})`);

            // Update Wallet
            const walletRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Wallets}/records?where=(user_id,eq,${userId})&limit=1`, {
                headers: { 'xc-token': NOCODB_TOKEN }
            });
            const walletData = await walletRes.json();
            const wallet = walletData.list?.[0];

            if (wallet) {
                // If balance is 0, set it. If already has coins, assume handled?
                // User complained "0 coins", so likely 0.
                if ((wallet.balance || 0) < totalGrant) {
                    console.log(`   -> Updating balance ${wallet.balance} -> ${totalGrant}`);
                    await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Wallets}/records`, {
                        method: 'PATCH',
                        headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            Id: wallet.Id,
                            balance: totalGrant
                        })
                    });
                } else {
                    console.log(`   -> Balance ${wallet.balance} is already >= ${totalGrant}. Skipping.`);
                }
            } else {
                // Create wallet
                console.log(`   -> Creating wallet with ${totalGrant}`);
                await fetch(`${NOCODB_URL}/api/v2/tables/${TABLES.Wallets}/records`, {
                    method: 'POST',
                    headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        balance: totalGrant
                    })
                });
            }
        }
        console.log('✅ Forced Migration Complete.');
    } catch (e) {
        console.error(e);
    }
}

forceMigrate();
