
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';
const TABLE_ID = 'm9fazh5nc6dt1a3'; // Packages table

async function getData() {
    try {
        console.log('Fetching rows...');
        const dataRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?limit=10`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });

        if (!dataRes.ok) {
            console.error('Error:', await dataRes.text());
            return;
        }

        const rows = await dataRes.json();
        console.log('Rows:', JSON.stringify(rows.list, null, 2));
    } catch (e) {
        console.error('Exception:', e);
    }
}

getData();
