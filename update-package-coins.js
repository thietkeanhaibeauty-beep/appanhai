
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';
const TABLE_ID = 'm9fazh5nc6dt1a3'; // Packages table

// Define coin values for each package
const PACKAGE_COINS = {
    'Trial': 10,
    'Starter': 50,
    'Pro': 200,
    'HocVien': 100
};

async function updatePackageCoins() {
    try {
        // 1. Get all packages
        const listRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?limit=100`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const data = await listRes.json();
        const packages = data.list || [];

        console.log(`Found ${packages.length} packages.`);

        // 2. Update each package
        for (const pkg of packages) {
            const coinAmount = PACKAGE_COINS[pkg.name] || 0;

            if (coinAmount > 0) {
                console.log(`Updating ${pkg.name} with ${coinAmount} coins...`);
                await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records`, {
                    method: 'PATCH',
                    headers: {
                        'xc-token': NOCODB_TOKEN,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        Id: pkg.Id,
                        coins: coinAmount
                    })
                });
            } else {
                console.log(`Skipping ${pkg.name} (No coin value defined)`);
            }
        }
        console.log('✅ All packages updated.');

    } catch (error) {
        console.error('❌ Error updating packages:', error);
    }
}

updatePackageCoins();
