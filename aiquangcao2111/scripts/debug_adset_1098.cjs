
const headers = { 'xc-token': '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_' };
const NOCODB_URL = 'https://db.hpb.edu.vn';
const TABLE_INSIGHTS = 'm17gyigy8jqlaoz';
const TABLE_ACCOUNTS = 'ms3iubpejoynr9a';

async function debugAdSet() {
    const adSetId = '120237109895570772'; // The Original HIfu 8/12
    console.log('--- Checking AdSet:', adSetId, '---');

    // 1. Check Spend in NocoDB (Today)
    console.log('Fetching Insights...');
    // Note: date_start might need format. Assuming 'YYYY-MM-DD'. Using Today 2025-12-12
    const dateStr = new Date().toISOString().split('T')[0];
    const q = `(adset_id,eq,${adSetId})~and(date_start,eq,${dateStr})`;
    const r1 = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_INSIGHTS}/records?where=${encodeURIComponent(q)}`, { headers });
    const d1 = await r1.json();

    if (d1.list?.length) {
        const i = d1.list[0];
        console.log(`NocoDB Insight Found: Spend=${i.spend}, Impressions=${i.impressions}`);
    } else {
        console.warn(`!!! NO INSIGHT DATA found in NocoDB for ${adSetId} on ${dateStr}`);
        // Check global (maybe date format mismatch?)
        const r1b = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_INSIGHTS}/records?where=(adset_id,eq,${adSetId})&limit=1`, { headers });
        const d1b = await r1b.json();
        if (d1b.list?.length) console.log('Checking any date:', d1b.list[0].date_start, 'Spend:', d1b.list[0].spend);
    }

    // 2. Try Turn Off via FB API
    console.log('\n--- Attempting Turn Off ... ---');
    const accId = 'act_1519991115681028';
    const r2 = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ACCOUNTS}/records?where=(account_id,eq,${accId})`, { headers });
    const d2 = await r2.json();
    const token = d2.list[0].access_token;

    const url = `https://graph.facebook.com/v18.0/${adSetId}?access_token=${token}`;
    const r3 = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAUSED' })
    });
    const k3 = await r3.json();
    console.log('FB API Response:', JSON.stringify(k3, null, 2));

    // 3. Verify Status
    if (k3.success) {
        const r4 = await fetch(url + '&fields=status');
        const k4 = await r4.json();
        console.log('Final Status Verification:', k4.status);
    }
}

debugAdSet();
