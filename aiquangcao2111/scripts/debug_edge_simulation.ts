
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Configuration (Mocking Edge Function environment)
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4',
    FACEBOOK_AD_ACCOUNTS: 'ms3iubpejoynr9a',
    CAMPAIGN_LABEL_ASSIGNMENTS: 'myjgw4ial5s6zrw',
    FACEBOOK_INSIGHTS_AUTO: 'm17gyigy8jqlaoz'
};

const getNocoDBHeaders = () => ({
    "xc-token": NOCODB_API_TOKEN,
    "Content-Type": "application/json",
});

async function fetchWithTimeout(url: string, options: any) {
    console.log(`[MockFetch] ${options.method || 'GET'} ${url}`);
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
    return res;
}

// Mock User & Rule from previous debug
const TEST_RULE_ID = 62;
const TEST_USER_ID = '3b69c215-aba9-4b73-bbaa-3795b8ed38df';

async function main() {
    console.log('🚀 SIMULATING EDGE FUNCTION LOGIC V2 (MULTI-ACCOUNT)');

    try {
        // 1. Get Rule
        const whereClause = encodeURIComponent(`(Id,eq,${TEST_RULE_ID})`);
        const ruleUrl = `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?where=${whereClause}`;
        const ruleResponse = await fetchWithTimeout(ruleUrl, { method: "GET", headers: getNocoDBHeaders() });
        const ruleData = await ruleResponse.json();
        const rule = ruleData.list?.[0];

        if (!rule) throw new Error("Rule not found");
        console.log(`✅ Found Rule: ${rule.rule_name}`);

        // 2. Get ALL Ad Accounts (V2)
        const accountWhere = encodeURIComponent(`(is_active,eq,1)`);
        const accountResponse = await fetchWithTimeout(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.FACEBOOK_AD_ACCOUNTS}/records?where=${accountWhere}&limit=100`, { method: "GET", headers: getNocoDBHeaders() });
        const accountData = await accountResponse.json();
        const allAdAccounts = accountData.list || [];

        console.log(`✅ Loaded ${allAdAccounts.length} Active Accounts`);

        const accountTokenMap = new Map();
        allAdAccounts.forEach((acc: any) => {
            if (acc.account_id) accountTokenMap.set(acc.account_id, 'TOKEN_MOCK');
        });

        // 3. Get Labeled Objects
        let targetLabels = rule.target_labels;
        if (typeof targetLabels === 'string') targetLabels = targetLabels.split(','); // Simplified

        console.log('Target Labels:', targetLabels);

        const labelIds = Array.isArray(targetLabels) ? targetLabels.join(',') : targetLabels;
        const labelWhere = encodeURIComponent(`(label_id,in,${labelIds})`);

        const labelResponse = await fetchWithTimeout(
            `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.CAMPAIGN_LABEL_ASSIGNMENTS}/records?where=${labelWhere}&limit=1000`,
            { method: "GET", headers: getNocoDBHeaders() }
        );
        const labelData = await labelResponse.json();
        const allLabeledObjects = labelData.list || [];
        const labeledObjects = allLabeledObjects.filter((obj: any) => obj.user_id === TEST_USER_ID);

        console.log(`✅ Found ${labeledObjects.length} labeled objects for user.`);

        const labeledAdSetIds = labeledObjects.map((obj: any) => obj.adset_id).filter((id: any) => id);
        console.log(`   AdSet IDs: ${labeledAdSetIds.length}`);

        // 4. Build Attributes for Insights Query
        const conditions = [];
        if (labeledAdSetIds.length > 0) {
            conditions.push(`(adset_id,in,${labeledAdSetIds.join(',')})`);
        }

        let idFilter = '';
        if (conditions.length > 1) {
            idFilter = `(${conditions.join('~or')})`;
        } else if (conditions.length === 1) {
            idFilter = conditions[0];
        }

        const levelFilter = `(level,eq,adset)`;

        // ✅ V2: NO ACCOUNT ID FILTER
        const rawWhere = `(user_id,eq,${TEST_USER_ID})~and${levelFilter}~and${idFilter}`;
        console.log(`\nGenerated WHERE clause (V2): ${rawWhere}`);

        const insightsWhereClause = encodeURIComponent(rawWhere);

        const insightsUrl = `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.FACEBOOK_INSIGHTS_AUTO}/records?where=${insightsWhereClause}&limit=1000&sort=-date_start`;

        console.log(`\nFetching INSIGHTS URL: ${insightsUrl}`);

        const insightsResponse = await fetchWithTimeout(insightsUrl, {
            method: "GET",
            headers: getNocoDBHeaders(),
        });

        const insightsData = await insightsResponse.json();
        const list = insightsData.list || [];
        console.log(`\n✅ Insights Fetch Result! Found ${list.length} records.`);

        // 5. Verify Account ID matching
        if (list.length > 0) {
            console.log('Sample Record Account ID:', list[0].account_id);
            const hasToken = accountTokenMap.has(list[0].account_id);
            console.log('Do we have a token for this account?', hasToken);
        }

    } catch (e) {
        console.error('\n❌ SIMULATION FAILED:', e);
    }
}

main();
