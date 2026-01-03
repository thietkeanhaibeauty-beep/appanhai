const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'myjgw4ial5s6zrw'; // CAMPAIGN_LABEL_ASSIGNMENTS

async function checkAssignments() {
    try {
        const whereClause = encodeURIComponent(`(Id,eq,7)~or(Id,eq,8)`);
        const url = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records?where=${whereClause}&limit=10`;

        const response = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
        const data = await response.json();

        if (data.list.length > 0) {
            data.list.forEach(r => {
                console.log('Assignment:', JSON.stringify(r, null, 2));
            });
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkAssignments();
