
const headers = { 'xc-token': '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_' };
const NOCODB_URL = 'https://db.hpb.edu.vn';
const TABLE_ACCOUNTS = 'ms3iubpejoynr9a';
const TABLE_INSIGHTS = 'm17gyigy8jqlaoz';

async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function fullSimulation() {
    const adSetId = '120237109895570772'; // HIfu 8/12 Original
    const accountId = 'act_1519991115681028';

    console.log('--- 1. PRE-CHECK & RESET ---');
    // Get Token
    const rAcc = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ACCOUNTS}/records?where=(account_id,eq,${accountId})`, { headers });
    const accData = await rAcc.json();
    const token = accData.list[0].access_token;

    // Turn ON first (Status: ACTIVE)
    console.log('Turning Ad Set ON to reset state...');
    await fetch(`https://graph.facebook.com/v18.0/${adSetId}?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' })
    });

    await sleep(3000);

    const rStatus1 = await fetch(`https://graph.facebook.com/v18.0/${adSetId}?fields=status&access_token=${token}`);
    const s1 = await rStatus1.json();
    console.log('Current Status (Should be ACTIVE):', s1.status);

    if (s1.status !== 'ACTIVE') {
        // Maybe Campaign is Paused? Effective status might be ARCHIVED?
        // But direct status should be ACTIVE.
        console.warn('Warning: Could not set status to ACTIVE. Proceeding anyway.');
    }

    console.log('\n--- 2. SIMULATE RULE EXECUTION ---');
    // Fetch Insights
    const dateStr = new Date().toISOString().split('T')[0];
    console.log(`Fetching Spend for ${dateStr}...`);
    const q = `(adset_id,eq,${adSetId})~and(date_start,eq,${dateStr})`;
    const rIns = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_INSIGHTS}/records?where=${encodeURIComponent(q)}`, { headers });
    const dIns = await rIns.json();
    const insight = dIns.list?.[0];

    if (!insight) return console.error('No Insight Data found! Cannot evaluate rule.');

    const spend = parseFloat(insight.spend || 0);
    console.log(`Spend: ${spend} VND. Condition: > 5000 VND.`);

    if (spend > 5000) {
        console.log('Condition MET. Executing Action: TURN OFF.');

        // EXECUTE ACTION (Exact logic)
        const urlAction = `https://graph.facebook.com/v18.0/${adSetId}?access_token=${token}`;
        const rAction = await fetch(urlAction, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PAUSED' })
        });
        const dAction = await rAction.json();
        console.log('Action Result:', JSON.stringify(dAction));
    } else {
        console.log('Condition NOT MET.');
    }

    console.log('\n--- 3. VERIFY FINAL STATUS ---');
    await sleep(2000);
    const rStatus2 = await fetch(`https://graph.facebook.com/v18.0/${adSetId}?fields=status&access_token=${token}`);
    const s2 = await rStatus2.json();
    console.log('Final Status (Should be PAUSED):', s2.status);
}

fullSimulation();
