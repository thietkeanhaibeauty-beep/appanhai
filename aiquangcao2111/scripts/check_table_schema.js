const NOCODB_URL = 'https://db.hpb.edu.vn';
const API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz'; // Correct Table ID
const RECORD_ID = 7; // Dummy record ID

async function deleteDummyRecord() {
    console.log(`Deleting dummy record ${RECORD_ID} from: ${TABLE_ID}`);
    // Bulk delete endpoint: DELETE /api/v2/tables/{tableId}/records
    // Body: [{ Id: 7 }]
    const url = `${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records`;

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'xc-token': API_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{ Id: RECORD_ID }])
        });

        if (!response.ok) {
            console.error('Error deleting record:', response.status, await response.text());
            return;
        }

        const data = await response.json();
        console.log('✅ Record deleted successfully.');
        console.log('Response:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Exception:', error);
    }
}

deleteDummyRecord();
