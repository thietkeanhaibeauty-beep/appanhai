/**
 * Find active adsets and assign test labels
 * Run with: npx tsx scripts/find_and_label_adsets.ts
 */

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLES = {
    FACEBOOK_INSIGHTS_AUTO: 'm17gyigy8jqlaoz',
    CAMPAIGN_LABEL_ASSIGNMENTS: 'myjgw4ial5s6zrw'
};

const TEST_GIAM_LABEL_ID = 7;
const TEST_TAT_LABEL_ID = 8;

async function getActiveAdsets() {
    // Get adsets with status ACTIVE
    const url = `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.FACEBOOK_INSIGHTS_AUTO}/records?where=(level,eq,adset)~and(status,eq,ACTIVE)&limit=20&sort=-spend`;
    const response = await fetch(url, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    return (await response.json()).list || [];
}

async function assignLabel(objectId: string, labelId: number) {
    const response = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.CAMPAIGN_LABEL_ASSIGNMENTS}/records`, {
        method: 'POST',
        headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            object_id: objectId,
            label_id: labelId,
            user_id: 'test-user'
        })
    });

    if (!response.ok) {
        const error = await response.text();
        if (error.includes('duplicate') || error.includes('UNIQUE')) {
            console.log(`   ⚠️ Label already assigned to ${objectId}`);
            return null;
        }
        throw new Error(`Failed to assign label: ${error}`);
    }

    return response.json();
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('           FIND AND LABEL ADSETS FOR TESTING                    ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Step 1: Find active adsets
    console.log('📋 Finding active adsets...\n');
    const adsets = await getActiveAdsets();

    if (adsets.length === 0) {
        console.log('❌ No active adsets found!');
        return;
    }

    console.log(`Found ${adsets.length} active adsets:\n`);

    adsets.forEach((adset: any, index: number) => {
        console.log(`${index + 1}. ID: ${adset.object_id}`);
        console.log(`   Name: ${adset.object_name}`);
        console.log(`   Status: ${adset.status}`);
        console.log(`   Spend: ${(adset.spend || 0).toLocaleString()}₫`);
        console.log(`   Budget: ${(adset.daily_budget || adset.lifetime_budget || 0).toLocaleString()}₫`);
        console.log('');
    });

    if (adsets.length < 2) {
        console.log('⚠️ Need at least 2 adsets for testing!');
        return;
    }

    // Step 2: Select adsets for testing
    // Use first 2 adsets
    const adsetForGiam = adsets[0];
    const adsetForTat = adsets.length > 1 ? adsets[1] : adsets[0];

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    ASSIGNING TEST LABELS                       ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Assign TEST-GIAM label
    console.log(`🏷️ Assigning TEST-GIAM (ID:${TEST_GIAM_LABEL_ID}) to "${adsetForGiam.object_name}"...`);
    try {
        await assignLabel(adsetForGiam.object_id, TEST_GIAM_LABEL_ID);
        console.log(`   ✅ Done!`);
    } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
    }

    // Assign TEST-TAT label
    console.log(`\n🏷️ Assigning TEST-TAT (ID:${TEST_TAT_LABEL_ID}) to "${adsetForTat.object_name}"...`);
    try {
        await assignLabel(adsetForTat.object_id, TEST_TAT_LABEL_ID);
        console.log(`   ✅ Done!`);
    } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                        SUMMARY                                 ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`
📌 TEST SETUP:

1. ADSET CHO TEST GIẢM 20%:
   - Name: ${adsetForGiam.object_name}
   - ID: ${adsetForGiam.object_id}
   - Current Budget: ${(adsetForGiam.daily_budget || adsetForGiam.lifetime_budget || 0).toLocaleString()}₫
   - Label: TEST-GIAM (ID: ${TEST_GIAM_LABEL_ID})

2. ADSET CHO TEST TẮT + BẬT LẠI:
   - Name: ${adsetForTat.object_name}
   - ID: ${adsetForTat.object_id}
   - Status: ${adsetForTat.status}
   - Label: TEST-TAT (ID: ${TEST_TAT_LABEL_ID})

📋 NEXT STEPS:
   1. Chờ cron chạy (mỗi 5 phút) để test rule GIAM (điều kiện chưa đạt)
   2. Sau đó sửa điều kiện để test case ĐẠT
   3. Kích hoạt rule TEST-TAT-BAT-LAI để test tắt + bật lại
`);
}

main().catch(console.error);
