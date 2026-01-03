// Native fetch
const TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm37ye177g4m98st'; // Labels (AIlocalhostads)

async function inspectColumns() {
    try {
        const url = `https://db.hpb.edu.vn/api/v2/meta/tables/${TABLE_ID}/columns`;
        const res = await fetch(url, { headers: { 'xc-token': TOKEN } });
        if (!res.ok) {
            console.log('Error fetching columns:', res.status, await res.text());
            return;
        }
        const data = await res.json();
        console.log('COLUMNS:');
        data.list.forEach(c => console.log(`${c.title} (${c.uidt})`));

        // Also try to list records to confirm GET works
        console.log('\nFetching Records...');
        const recUrl = `https://db.hpb.edu.vn/api/v2/tables/${TABLE_ID}/records?limit=1`;
        const recRes = await fetch(recUrl, { headers: { 'xc-token': TOKEN } });
        if (recRes.ok) {
            const recData = await recRes.json();
            console.log('Records count:', recData.list.length);
        } else {
            console.log('Error fetching records:', recRes.status);
        }

    } catch (error) {
        console.error(error);
    }
}

inspectColumns();
