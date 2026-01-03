
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Configuration
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    FACEBOOK_INSIGHTS_AUTO: 'm17gyigy8jqlaoz'
};

async function fetchNocoDB(tableId: string) {
    let url = `${NOCODB_BASE_URL}/api/v2/tables/${tableId}/records?limit=250&sort=-Id`;
    const res = await fetch(url, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });

    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
    return (await res.json()).list || [];
}

async function main() {
    console.log('🔍 CHECK LEVELS & IDs V2');
    try {
        const list = await fetchNocoDB(TABLES.FACEBOOK_INSIGHTS_AUTO);
        if (list.length > 0) {
            // Count levels
            const levels = list.reduce((acc: any, curr: any) => {
                acc[curr.level] = (acc[curr.level] || 0) + 1;
                return acc;
            }, {});
            console.log('Level Distribution:', levels);

            // Check adset level specific
            const adsetMetrics = list.filter((i: any) => i.level === 'adset');
            if (adsetMetrics.length > 0) {
                console.log(`\nChecking ${adsetMetrics.length} AdSet records:`);
                console.log('First record adset_id:', adsetMetrics[0].adset_id);
                console.log('First record adset_name:', adsetMetrics[0].adset_name);
                console.log('Adset ID type:', typeof adsetMetrics[0].adset_id);
                console.log('Adset ID length:', adsetMetrics[0].adset_id?.length);

                const withValidId = adsetMetrics.filter(i => i.adset_id && i.adset_id.length > 5);
                console.log(`\nValid AdSet IDs: ${withValidId.length} / ${adsetMetrics.length}`);

                if (withValidId.length === 0) {
                    console.warn('⚠️ CRITICAL: All adset records have empty/invalid adset_id!');
                }
            } else {
                console.log('\n❌ No ADSET level records found!');
            }
        } else {
            console.log('Empty table');
        }
    } catch (e) {
        console.error(e);
    }
}

main();
