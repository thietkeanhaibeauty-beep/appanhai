
const headers = { 'xc-token': '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_' };
const NOCODB_URL = 'https://db.hpb.edu.vn';
const TABLE_RULES = 'mp8nib5rn4l0mb4';
const TABLE_LABELS = 'myjgw4ial5s6zrw'; // CAMPAIGN_LABEL_ASSIGNMENTS
const TABLE_ACCOUNTS = 'ms3iubpejoynr9a';

async function debugTargeting() {
    console.log('--- Step 1: Analyze Rule Configuration ---');
    const r1 = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_RULES}/records?where=(rule_name,like,tắt)`, { headers });
    const rules = await r1.json();
    const rule = rules.list?.[0];

    if (!rule) return console.error('Rule "tắt" not found');
    console.log(`Rule ID: ${rule.Id}`);
    console.log(`Scope: ${rule.scope}`);
    console.log(`Target Labels: ${rule.target_labels || '(Empty - GLOBAL RULE!)'}`);

    if (!rule.target_labels || rule.target_labels === '[]') {
        console.warn('!!! WARNING: Rule has NO target labels. It will run on ALL objects in the account.');
    }

    console.log('\n--- Step 2: Analyze ID 120237109895570772 ---');
    // Get token to query Graph API
    const accId = 'act_1519991115681028';
    const r2 = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ACCOUNTS}/records?where=(account_id,eq,${accId})`, { headers });
    const d2 = await r2.json();
    const token = d2.list?.[0]?.access_token;

    if (!token) return console.error('Token not found');

    const checkId = '120237109895570772';
    const url = `https://graph.facebook.com/v18.0/${checkId}?access_token=${token}&fields=name,level,objective`;
    const r3 = await fetch(url);
    const fbObj = await r3.json();

    console.log(`FB Object for ID ${checkId}:`);
    console.log(JSON.stringify(fbObj, null, 2));

    if (fbObj.error) {
        console.error('Error fetching object from FB:', fbObj.error.message);
    } else {
        // Check mismatch
        if (rule.scope === 'adset' && !fbObj.daily_budget && !fbObj.lifetime_budget && !fbObj.bid_strategy) {
            // Campaigns usually have 'objective', AdSets have 'targeting', Ads have 'creative'
            // A generic way is checking the structure or if it has 'campaign_id' in it (if it's an adset).
            // Actually 'level' field is not standard on Node. Let's check fields.
            if (fbObj.objective) console.log('--> This looks like a CAMPAIGN.');
            else if (fbObj.targeting) console.log('--> This looks like an AD SET.');
            else console.log('--> Could not determine type definitively from basic fields.');
        }
    }

    console.log('\n--- Step 3: Check Label Assignments ---');
    if (rule.target_labels) {
        try {
            const labelIds = JSON.parse(rule.target_labels);
            console.log(`Looking for assignments for Label IDs: ${labelIds.join(', ')}`);

            const q = `(label_id,in,${labelIds.join(',')})`;
            const r4 = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_LABELS}/records?where=${encodeURIComponent(q)}`, { headers });
            const assignments = await r4.json();

            console.log(`Found ${assignments.list?.length || 0} assignments.`);
            assignments.list?.forEach(a => {
                console.log(`- Label ${a.label_id} assigned to: Campaign=${a.campaign_id}, AdSet=${a.adset_id}, Ad=${a.ad_id}`);
                if (a.adset_id === checkId) console.log('  -> MATCHES the User ID!');
            });

        } catch (e) {
            console.error('Error parsing labels:', e.message);
        }
    }
}

debugTargeting();
