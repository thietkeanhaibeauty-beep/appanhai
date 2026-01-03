
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Configuration
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4',
    FACEBOOK_INSIGHTS_AUTO: 'm17gyigy8jqlaoz',
    FACEBOOK_AD_ACCOUNTS: 'ms3iubpejoynr9a'
};

async function fetchNocoDB(tableId: string, where?: string) {
    let url = `${NOCODB_BASE_URL}/api/v2/tables/${tableId}/records?limit=1000&sort=-Id`;
    if (where) url += `&where=${encodeURIComponent(where)}`;

    const res = await fetch(url, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });

    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
    return (await res.json()).list || [];
}

function getDateRange(timeRange: string, timezone: string) {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    const getDateString = (date: Date) => formatter.format(date);

    let startDate = new Date(now);
    let endDate = new Date(now);

    switch (timeRange) {
        case 'today': break;
        case 'yesterday':
            startDate.setDate(now.getDate() - 1);
            endDate.setDate(now.getDate() - 1);
            break;
        // ... simplifed
    }
    return { startDate: getDateString(startDate), endDate: getDateString(endDate) };
}

async function main() {
    console.log('🔍 DEBUG RULE LOGIC V5 - DATE & ACCOUNT CHECK');
    console.log('=============================================');

    try {
        // 1. Fetch Rule
        const allRules = await fetchNocoDB(TABLES.AUTOMATED_RULES);
        const rule = allRules.find((r: any) => r.rule_name?.toLowerCase().includes('tắt'));
        if (!rule) { console.log('❌ Rule not found!'); return; }
        console.log(`✅ Rule: ${rule.rule_name} (Scope: ${rule.scope}, Time: ${rule.time_range})`);

        // 2. Fetch Ad Account to get Timezone & Account ID
        const accounts = await fetchNocoDB(TABLES.FACEBOOK_AD_ACCOUNTS, `(is_active,eq,1)`);
        // Assuming the rule runs for the first active account found (as per edge function logic)
        // Edge function does: list?.[0] from limited query.
        const adAccount = accounts[0];
        if (!adAccount) { console.log('❌ No active ad account found!'); return; }

        console.log(`✅ Ad Account: ${adAccount.name} (ID: ${adAccount.account_id})`);
        console.log(`   Timezone: ${adAccount.timezone_name}`);

        // 3. Calc Date Range
        const { startDate, endDate } = getDateRange(rule.time_range || 'today', adAccount.timezone_name || 'Asia/Ho_Chi_Minh');
        console.log(`   Date Range: ${startDate} to ${endDate}`);

        // 4. Check AUTO Insights
        console.log(`\nChecking FACEBOOK_INSIGHTS_AUTO...`);
        const allInsights = await fetchNocoDB(TABLES.FACEBOOK_INSIGHTS_AUTO);

        // Filter by Account ID
        const accountInsights = allInsights.filter((i: any) => i.account_id === adAccount.account_id);
        console.log(`   Total records: ${allInsights.length}`);
        console.log(`   Records for Account ${adAccount.account_id}: ${accountInsights.length}`);

        if (accountInsights.length === 0) {
            console.log('   ❌ No records for this account ID!');
            console.log('   Sample account_id in AUTO:', allInsights[0]?.account_id);
            return;
        }

        // Filter by User ID
        const userInsights = accountInsights.filter((i: any) => i.user_id === rule.user_id);
        console.log(`   Records for User ${rule.user_id}: ${userInsights.length}`);

        // Filter by Level
        const levelInsights = userInsights.filter((i: any) => i.level === rule.scope);
        console.log(`   Records for Level ${rule.scope}: ${levelInsights.length}`);

        // Filter by Date
        const validDateInsights = levelInsights.filter((insight: any) => {
            if (!insight.date_start) return false;
            const insightDate = insight.date_start.split('T')[0];
            return insightDate >= startDate && insightDate <= endDate;
            // Note: Edge function uses string comparison for dates YYYY-MM-DD
        });
        console.log(`   Records in Date Range: ${validDateInsights.length}`);

        if (levelInsights.length > 0 && validDateInsights.length === 0) {
            console.log('   ❌ Date Mismatch! Found records but none in today/range.');
            const dates = [...new Set(levelInsights.map((i: any) => i.date_start))];
            console.log('   Available dates in insights:', dates);
        } else if (validDateInsights.length > 0) {
            console.log('   ✅ Found candidates for processing!');
            console.log('   Sample:', JSON.stringify(validDateInsights[0], null, 2));
        }

    } catch (e) {
        console.error(e);
    }
}

main();
