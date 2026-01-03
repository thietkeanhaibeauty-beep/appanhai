
const headers = { 'xc-token': '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_' };
const NOCODB_URL = 'https://db.hpb.edu.vn';
const TABLE_ACCOUNTS = 'ms3iubpejoynr9a';

async function checkStatus() {
    const accId = 'act_1519991115681028';
    const r1 = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ACCOUNTS}/records?where=(account_id,eq,${accId})`, { headers });
    const d1 = await r1.json();
    const token = d1.list[0].access_token;

    const adSetId = '120237109895570772';
    const url = `https://graph.facebook.com/v18.0/${adSetId}?fields=name,status,effective_status&access_token=${token}`;

    const r2 = await fetch(url);
    const d2 = await r2.json();
    console.log('Current Ad Set Status:', JSON.stringify(d2, null, 2));
}
checkStatus();
