const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mlz2jkivq3dus4x'; // ROLE_FEATURE_FLAGS

async function addIdColumn() {
    console.log('🛠️ Adding Id column to ROLE_FEATURE_FLAGS...');

    try {
        const url = `${NOCODB_URL}/api/v2/meta/tables/${TABLE_ID}/columns`;

        const body = {
            title: 'Id',
            column_name: 'Id',
            uidt: 'ID', // Standard ID type
            dt: 'integer',
            pk: true,
            ai: true, // Auto Increment
            rqd: false
        };

        console.log('Sending request to:', url);
        console.log('Body:', body);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'xc-token': NOCODB_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed: ${response.status} ${text}`);
        }

        const result = await response.json();
        console.log('✅ Success:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

addIdColumn();
