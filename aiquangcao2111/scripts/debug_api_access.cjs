// Native fetch
const TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

// Test both the User's claimed ID (AIlocalhostads) and the dataadsai ID
const TABLES = [
    { name: 'Rules (AIlocalhostads)', id: 'mp8nib5rn4l0mb4' },
    { name: 'Labels (AIlocalhostads)', id: 'm37ye177g4m98st' },
    { name: 'Sales Reports (Unknown Base)', id: 'm8xqudjpkihacxw' },
    { name: 'Rules (dataadsai)', id: 'm985xb6ql61r1zm' },
    { name: 'Labels (dataadsai)', id: 'm1fofevviku4xne' },
];

async function checkAccess() {
    for (const t of TABLES) {
        console.log(`\nTesting ${t.name} [ID: ${t.id}] with WHERE clause...`);
        // Exact query from screenshot
        const where = encodeURIComponent('(user_id,eq,3b69c215-aba9-4b73-bbaa-3795b8ed38df)');
        const url = `https://db.hpb.edu.vn/api/v2/tables/${t.id}/records?where=${where}&limit=1`;
        try {
            const res = await fetch(url, {
                headers: {
                    'xc-token': TOKEN,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`Status: ${res.status} ${res.statusText}`);
            if (!res.ok) {
                console.log('Body:', await res.text());
            } else {
                const data = await res.json();
                console.log('Success! Record count:', data.pageInfo?.totalRows ?? 'unknown');
            }
        } catch (e) {
            console.error('Fetch Error:', e.message);
        }
    }
}

checkAccess();
