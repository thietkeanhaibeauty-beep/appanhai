
// Built-in fetch in Node 20+

// --- Config ---
const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDcxMTYsImV4cCI6MjA3OTI4MzExNn0.iRHg-xMZ1i_qb0xnQ6vDivcFEEdrpYb0Z6cSkgOLLyU';

const NOCODB_CONFIG = {
    BASE_URL: 'https://db.hpb.edu.vn',
    API_TOKEN: '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
    TABLES: {
        PROFILES: 'mlcrus3sfhchdhw',
        OPENAI_SETTINGS: 'me8nzzace4omg8i',
    }
};

// --- Helpers ---
async function getFirstUserId() {
    // Try fetching from OPENAI_SETTINGS to get a user who actually has settings
    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.OPENAI_SETTINGS}/records?limit=1`;
    console.log(`Fetching User ID from OPENAI_SETTINGS: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'xc-token': NOCODB_CONFIG.API_TOKEN
            }
        });

        if (!response.ok) {
            console.error(`Failed to fetch settings: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Response:', text);
            return null;
        }

        const data = await response.json();
        if (data.list && data.list.length > 0) {
            console.log('Full OpenAI Setting Record:', JSON.stringify(data.list[0], null, 2));
            // Try common variations
            const uid = data.list[0].UserId || data.list[0].user_id || data.list[0].User_Id || data.list[0].id;
            return uid;
        }
        console.warn('No OpenAI settings found.');
        return null;
    } catch (e) {
        console.error('Fetch Error:', e);
        return null;
    }
}

async function invokeEdgeFunction(functionName: string, body: any) {
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Edge Function Error ${response.status}: ${text}`);
    }

    return response.json();
}

// --- Test Functions ---

async function testParseCampaign(userId: string) {
    console.log(`\n🧪 Testing 'parse-campaign-with-user-api' with User ID: ${userId}...`);

    const input = `Tên chiến dịch: hifu 21/11
20 55t
nữ
200k
vị trí: 21.85582150580036, 106.76063541534162 3km
sở thích làm đẹp, spa, thẩm mỹ viện
https://www.facebook.com/reel/840276678740046`;

    try {
        const data = await invokeEdgeFunction('parse-campaign-with-user-api', {
            text: input,
            userId: userId,
        });
        console.log('✅ Parse Success:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Parse Error:', error);
    }
}

async function testValidatePost() {
    console.log("\n🧪 Testing 'validate-facebook-post'...");
    const postUrl = "https://www.facebook.com/reel/840276678740046";

    try {
        const data = await invokeEdgeFunction('validate-facebook-post', {
            postUrl
        });
        console.log('✅ Validate Success:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Validate Error:', error);
    }
}

// --- Main ---

async function main() {
    try {
        console.log("🚀 Starting Edge Function Tests (Native Fetch)...");

        // 1. Get User ID
        let userId = await getFirstUserId();

        if (!userId) {
            console.error("❌ Could not fetch any user ID from NocoDB. Using DUMMY ID.");
            userId = "dummy_user_id";
        } else {
            console.log(`ℹ️ Found User ID: ${userId}`);
        }

        // 2. Test Parse
        await testParseCampaign(userId);

        // 3. Test Validate
        await testValidatePost();

    } catch (e) {
        console.error("❌ Script Error:", e);
    }
}

main();
