// Test the EXACT URL that Browser/Proxy tries to call

const TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const userId = '3b69c215-aba9-4b73-bbaa-3795b8ed38df';

async function testExactUrl() {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `https://db.hpb.edu.vn/api/v2/tables/mp8nib5rn4l0mb4/records?where=${whereClause}&sort=-CreatedAt&limit=100`;
    
    console.log('Testing URL:', url);
    
    const res = await fetch(url, {
        headers: {
            'xc-token': TOKEN,
            'Content-Type': 'application/json',
            'User-Agent': 'node-fetch/1.0',
            'Accept': '*/*'
        }
    });
    
    console.log('Status:', res.status, res.statusText);
    
    if (!res.ok) {
        console.log('Error Body:', await res.text());
    } else {
        const data = await res.json();
        console.log('Success! Record count:', data.list?.length || 0);
    }
}

testExactUrl();
