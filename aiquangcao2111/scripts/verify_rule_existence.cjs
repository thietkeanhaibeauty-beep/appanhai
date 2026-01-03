// Native fetch used in Node 18+
require('dotenv').config({ path: 'i:/aiquangcao2111/.env' });

const NOCODB_URL = "https://db.hpb.edu.vn";
const NOCODB_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";
const RULES_TABLE = "mp8nib5rn4l0mb4";
const RULE_ID = 68;

async function checkRule() {
    console.log(`Checking Rule ${RULE_ID}...`);
    const url = `${NOCODB_URL}/api/v2/tables/${RULES_TABLE}/records?where=${encodeURIComponent(`(Id,eq,${RULE_ID})`)}`;
    console.log("URL:", url);

    const res = await fetch(url, { headers: { 'xc-token': NOCODB_TOKEN } });
    console.log("Status:", res.status);

    const text = await res.text();
    console.log("Body:", text);
}

checkRule();
