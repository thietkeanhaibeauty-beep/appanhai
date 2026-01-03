
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Configuration
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    FACEBOOK_INSIGHTS_AUTO: 'm17gyigy8jqlaoz'
};

async function fetchNocoDB(tableId: string, where?: string) {
    let url = `${NOCODB_BASE_URL}/api/v2/tables/${tableId}/records?limit=1000&sort=-Id`;
    if (where) url += `&where=${encodeURIComponent(where)}`;
    const res = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
    return (await res.json()).list || [];
}

const TARGET_ID = '120237152213480772';

async function main() {
    console.log(`🔍 CHECKING ID ${TARGET_ID} in AUTO TABLE`);
    try {
        // 1. Direct Search
        const direct = await fetchNocoDB(TABLES.FACEBOOK_INSIGHTS_AUTO, `(adset_id,eq,${TARGET_ID})`);
        console.log(`Direct Match Count: ${direct.length}`);
        if (direct.length > 0) {
            console.log('Sample Record Meta:');
            console.log(' - User ID:', direct[0].user_id);
            console.log(' - Account ID:', direct[0].account_id);
            console.log(' - Level:', direct[0].level);
            console.log(' - Date Start:', direct[0].date_start);

            // Check for whitespace issues
            console.log(' - Adset Name:', `"${direct[0].adset_name}"`);
        } else {
            console.log('❌ Direct search returned 0!');
        }

    } catch (e) {
        console.error(e);
    }
}

main();
