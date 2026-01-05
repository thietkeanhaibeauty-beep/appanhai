// Use native fetch in Node 18+

const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';
const TABLE_ID = 'm9fazh5nc6dt1a3'; // Packages table

async function addCoinsColumn() {
    try {
        console.log('Adding coins column to payment_packages...');
        const response = await fetch(`${NOCODB_URL}/api/v1/db/meta/tables/${TABLE_ID}/columns`, {
            method: 'POST',
            headers: {
                'xc-token': NOCODB_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                column_name: 'coins',
                title: 'coins',
                uidt: 'Number', // or 'Decimal'
                dt: 'int',
                dtxp: '10',
                dtxs: '0'
            })
        });

        if (!response.ok) {
            const text = await response.text();
            if (text.includes('Duplicate column name')) {
                console.log('✅ Column coins already exists.');
                return;
            }
            throw new Error(text);
        }

        const data = await response.json();
        console.log('✅ Column coins added successfully:', data);
    } catch (error) {
        console.error('❌ Error adding column:', error.message);
    }
}

addCoinsColumn();
