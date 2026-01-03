const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const COLUMN_ID = 'c53lpsgxz004bfc'; // feature_key column ID

async function setPK() {
    console.log('🔑 Setting feature_key as Primary Key...');

    try {
        const url = `${NOCODB_URL}/api/v2/meta/columns/${COLUMN_ID}`;

        const body = {
            pk: true
        };

        console.log('Sending PATCH to:', url);

        const response = await fetch(url, {
            method: 'PATCH',
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

setPK();
