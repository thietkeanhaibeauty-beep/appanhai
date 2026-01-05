
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';
const TABLE_ID = 'm9fazh5nc6dt1a3'; // Packages table

async function getType() {
    try {
        console.log('Fetching columns...');
        const response = await fetch(`${NOCODB_URL}/api/v1/db/meta/tables/${TABLE_ID}/columns`, {
            headers: {
                'xc-token': NOCODB_TOKEN
            }
        });

        if (!response.ok) {
            console.error('Error fetching columns:', await response.text());
            return;
        }

        const data = await response.json();
        console.log('Columns:', data.list.map(c => ({ title: c.title, column_name: c.column_name, dt: c.dt })));

        console.log('Fetching rows...');
        const dataRes = await fetch(`${NOCODB_URL}/api/v1/db/data/noco/p8xfd6fzun2guxg/${TABLE_ID}`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const rows = await dataRes.json();
        console.log('Rows:', JSON.stringify(rows.list, null, 2));
    } catch (e) {
        console.error('Exception:', e);
    }
}

getType();
