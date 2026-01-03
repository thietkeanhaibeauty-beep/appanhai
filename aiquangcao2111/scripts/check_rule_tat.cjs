const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE = 'mp8nib5rn4l0mb4';

async function run() {
    console.log('Fetching all rules...');

    const res = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE}/records?limit=50`, {
        headers: { 'xc-token': NOCODB_TOKEN }
    });
    const data = await res.json();

    console.log(`Found ${data.list?.length || 0} rules:\n`);

    data.list?.forEach(rule => {
        console.log(`${'-'.repeat(60)}`);
        console.log(`Id: ${rule.Id}`);
        console.log(`Name: ${rule.rule_name}`);
        console.log(`Scope: ${rule.scope}`);
        console.log(`Is Active: ${rule.is_active}`);
        console.log(`Time Range: ${rule.time_range}`);
        console.log(`Conditions: ${rule.conditions}`);
        console.log(`Actions: ${rule.actions}`);
        console.log(`Target Labels: ${rule.target_labels}`);
    });
}

run();
