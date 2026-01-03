// Native fetch is available in Node 20+


const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mwfp1d1542ab4ok'; // PENDING_REVERTS

async function testUpdate() {
    try {
        console.log('Searching for pending records...');
        const listUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records?where=(status,eq,pending)&limit=1`;
        const response = await fetch(listUrl, {
            headers: {
                'xc-token': NOCODB_API_TOKEN
            }
        });

        const data = await response.json();
        console.log('Found records:', data.list?.length);

        if (data.list && data.list.length > 0) {
            const record = data.list[0];
            console.log('Testing update on record:', record.Id);

            const updateUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records/${record.Id}`;
            const updateRes = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'xc-token': NOCODB_API_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'completed'
                })
            });

            console.log('Update status:', updateRes.status);
            const resText = await updateRes.text();
            console.log('Response:', resText);

            if (updateRes.ok) {
                console.log('✅ Update successful! NocoDB accepts "completed" status.');
            } else {
                console.error('❌ Update failed. Please check if "completed" is in the Single Select options.');
            }

        } else {
            console.log('No pending records found to test.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testUpdate();
