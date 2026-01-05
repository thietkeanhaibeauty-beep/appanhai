
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';
const TABLE_ID = 'm9fazh5nc6dt1a3'; // Packages table

async function checkAndFix() {
    try {
        console.log('🔍 Checking Package Coins...');
        const listRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?limit=100`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const data = await listRes.json();

        // Log current state
        data.list.forEach(p => console.log(`- ${p.name} (ID: ${p.Id}): ${p.coins} coins`));

        // Refill if empty
        const PACKAGE_COINS = {
            'Trial': 10,
            'Starter': 50,
            'Pro': 200,
            'HocVien': 100
        };

        for (const p of data.list) {
            const expected = PACKAGE_COINS[p.name];
            if (expected && (!p.coins || p.coins !== expected)) {
                console.log(`⚠️ Fixing ${p.name}: ${p.coins} -> ${expected}`);
                await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records`, {
                    method: 'PATCH',
                    headers: {
                        'xc-token': NOCODB_TOKEN,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        Id: p.Id,
                        coins: expected
                    })
                });
            }
        }
        console.log('✅ Package Coins Verified.');

    } catch (e) {
        console.error(e);
    }
}

checkAndFix();
