
// Built-in fetch in Node 20+

const NOCODB_CONFIG = {
    BASE_URL: 'https://db.hpb.edu.vn',
    API_TOKEN: '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
    TABLES: {
        OPENAI_SETTINGS: 'me8nzzace4omg8i',
    }
};

const TARGET_USER_ID = 'b05b7725-4da0-4f81-b869-5ddfd374fb59';

async function verifyKey() {
    console.log(`Fetching OpenAI Settings for User: ${TARGET_USER_ID}`);

    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.OPENAI_SETTINGS}/records?where=(user_id,eq,${TARGET_USER_ID})`;

    try {
        const response = await fetch(url, {
            headers: {
                'xc-token': NOCODB_CONFIG.API_TOKEN
            }
        });

        if (!response.ok) {
            console.error(`Failed to fetch settings: ${response.status}`);
            return;
        }

        const data = await response.json();
        if (!data.list || data.list.length === 0) {
            console.error('❌ No settings found for this user in NocoDB.');
            return;
        }

        const record = data.list[0];
        let apiKey = record.api_key;

        if (!apiKey) {
            console.error('❌ api_key is empty in NocoDB.');
            return;
        }

        // Clean key like the Edge Function does
        apiKey = apiKey.replace(/^["']|["']$/g, '');

        console.log(`ℹ️ Found API Key (starts with): ${apiKey.substring(0, 7)}...`);

        // Test with OpenAI
        console.log('🧪 Testing key with OpenAI API...');
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (openaiResponse.ok) {
            console.log('✅ OpenAI Key is VALID and working!');
        } else {
            console.error(`❌ OpenAI Key is INVALID. Status: ${openaiResponse.status}`);
            const err = await openaiResponse.text();
            console.error('Error details:', err);
        }

    } catch (e) {
        console.error('Script Error:', e);
    }
}

verifyKey();
