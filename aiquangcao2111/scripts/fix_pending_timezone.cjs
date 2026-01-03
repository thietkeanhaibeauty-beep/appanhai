/**
 * Fix timezone của pending reverts cũ
 * Convert từ 18:55 UTC (sai) → 11:55 UTC (đúng, = 18:55 VN)
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const PENDING_REVERTS_TABLE = 'mwfp1d1542ab4ok';

async function fixTimezone() {
    console.log('🔧 Fixing timezone for old pending reverts...\n');

    // Fetch all pending records
    const response = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${PENDING_REVERTS_TABLE}/records?where=(status,eq,pending)&limit=50`,
        {
            headers: {
                'xc-token': NOCODB_API_TOKEN,
                'Content-Type': 'application/json'
            }
        }
    );

    const data = await response.json();
    const records = data.list || [];

    console.log(`📋 Found ${records.length} pending records to fix\n`);

    const now = new Date();

    for (const r of records) {
        // Parse old revert_at (this was saved as UTC but should have been VN time)
        // So 18:55 UTC should have been 11:55 UTC (= 18:55 VN)
        const oldRevertAt = new Date(r.revert_at);

        // Subtract 7 hours to get correct UTC time
        const correctedRevertAt = new Date(oldRevertAt.getTime() - (7 * 60 * 60 * 1000));

        console.log(`ID ${r.Id}: ${r.revert_at} → ${correctedRevertAt.toISOString()}`);

        // Update record
        const updateResponse = await fetch(
            `${NOCODB_BASE_URL}/api/v2/tables/${PENDING_REVERTS_TABLE}/records`,
            {
                method: 'PATCH',
                headers: {
                    'xc-token': NOCODB_API_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Id: r.Id,
                    revert_at: correctedRevertAt.toISOString()
                })
            }
        );

        if (updateResponse.ok) {
            console.log(`  ✅ Updated successfully`);
        } else {
            console.log(`  ❌ Failed: ${await updateResponse.text()}`);
        }
    }

    console.log('\n✨ Done! Re-check pending reverts now.');
}

fixTimezone().catch(console.error);
