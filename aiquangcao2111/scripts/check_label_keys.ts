
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Configuration
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    CAMPAIGN_LABEL_ASSIGNMENTS: 'myjgw4ial5s6zrw'
};

async function fetchNocoDB(tableId: string) {
    let url = `${NOCODB_BASE_URL}/api/v2/tables/${tableId}/records?limit=1`;
    const res = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
    return (await res.json()).list || [];
}

async function main() {
    console.log('🔍 CHECK LABEL ASSIGNMENT KEYS');
    try {
        const list = await fetchNocoDB(TABLES.CAMPAIGN_LABEL_ASSIGNMENTS);
        if (list.length > 0) {
            console.log('Keys:', Object.keys(list[0]).sort().join('\n'));
            console.log('Has account_id?', list[0].hasOwnProperty('account_id'));
            console.log('Sample account_id:', list[0].account_id);
        } else {
            console.log('Empty table');
        }
    } catch (e) {
        console.error(e);
    }
}

main();
