
const BASE_URL = 'https://db.hpb.edu.vn';
const TOKEN = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';
const PROJECT_ID = 'p8xfd6fzun2guxg';

async function listTables() {
    try {
        console.log('--- Listing All Tables ---');
        const url = `${BASE_URL}/api/v1/db/meta/projects/${PROJECT_ID}/tables`;

        const res = await fetch(url, {
            headers: { 'xc-token': TOKEN }
        });

        if (!res.ok) {
            console.error('Failed:', res.status, await res.text());
            return;
        }

        const data = await res.json();
        console.log(`Found ${data.list?.length} tables:`);
        data.list?.forEach(t => {
            console.log(`- [${t.title}] ID: ${t.id}`);
        });

    } catch (e) {
        console.error(e);
    }
}

listTables();
