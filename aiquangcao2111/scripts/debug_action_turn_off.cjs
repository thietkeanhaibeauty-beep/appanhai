
const headers = { 'xc-token': '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_' };
const NOCODB_URL = 'https://db.hpb.edu.vn';
const TABLE_ACCOUNTS = 'ms3iubpejoynr9a'; // FACEBOOK_AD_ACCOUNTS

async function testTurnOff() {
    // 1. Get Token for Account
    const accId = 'act_1519991115681028';
    console.log('Fetching token for', accId);
    const r1 = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ACCOUNTS}/records?where=(account_id,eq,${accId})`, { headers });
    const d1 = await r1.json();
    if (!d1.list?.length) return console.error('Account not found');

    const token = d1.list[0].access_token;
    // console.log('Token found:', token.substring(0, 10) + '...');

    // 2. Try Turn Off Ad Set
    const adSetId = '120237152213480772'; // HIfu 8/12
    const url = `https://graph.facebook.com/v18.0/${adSetId}?access_token=${token}`;

    console.log('Target Ad Set:', adSetId);
    console.log('Sending PAUSED request...');

    const r2 = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAUSED' })
    });

    const d2 = await r2.json();
    console.log('Response:', JSON.stringify(d2, null, 2));
}

testTurnOff();
