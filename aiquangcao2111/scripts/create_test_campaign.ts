// Built-in fetch in Node 20+

// --- Config ---
const NOCODB_CONFIG = {
    BASE_URL: 'https://db.hpb.edu.vn',
    API_TOKEN: '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
    TABLES: {
        DRAFT_CATEGORIES: 'm15skixqxwnjv0m',
        DRAFT_CAMPAIGNS: 'm9z7w26pfk9mvna',
        DRAFT_ADSETS: 'mwk0gn0l3fmfxsh',
        DRAFT_ADS: 'me44i3pifma3m2i',
    }
};

const getNocoDBHeaders = () => ({
    'xc-token': NOCODB_CONFIG.API_TOKEN,
    'Content-Type': 'application/json',
});

const getNocoDBUrl = (tableId: string) =>
    `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${tableId}/records`;

// --- Service Functions ---

async function createCategory(name: string) {
    const response = await fetch(getNocoDBUrl(NOCODB_CONFIG.TABLES.DRAFT_CATEGORIES), {
        method: 'POST',
        headers: getNocoDBHeaders(),
        body: JSON.stringify({ Name: name, Description: 'Created via Test Script' }),
    });
    return response.json();
}

async function createCampaign(name: string, categoryId: string) {
    const response = await fetch(getNocoDBUrl(NOCODB_CONFIG.TABLES.DRAFT_CAMPAIGNS), {
        method: 'POST',
        headers: getNocoDBHeaders(),
        body: JSON.stringify({
            Name: name,
            Objective: 'OUTCOME_SALES',
            BuyingType: 'AUCTION',
            Status: 'DRAFT',
            CategoryId: categoryId
        }),
    });
    return response.json();
}

async function createAdSet(name: string, campaignId: string, budget: number, targeting: any) {
    const response = await fetch(getNocoDBUrl(NOCODB_CONFIG.TABLES.DRAFT_ADSETS), {
        method: 'POST',
        headers: getNocoDBHeaders(),
        body: JSON.stringify({
            Name: name,
            DailyBudget: budget,
            BidStrategy: 'LOWEST_COST_WITHOUT_CAP',
            Targeting: targeting,
            Status: 'DRAFT',
            CampaignId: campaignId
        }),
    });
    return response.json();
}

async function createAd(name: string, adSetId: string, postId: string) {
    const response = await fetch(getNocoDBUrl(NOCODB_CONFIG.TABLES.DRAFT_ADS), {
        method: 'POST',
        headers: getNocoDBHeaders(),
        body: JSON.stringify({
            Name: name,
            CreativeType: 'EXISTING_POST',
            PostId: postId,
            Status: 'DRAFT',
            AdSetId: adSetId
        }),
    });
    return response.json();
}

// --- Main Execution ---

async function main() {
    console.log("🚀 Starting Test Campaign Creation...");

    try {
        // 1. Create Category
        const categoryName = "Test Hifu 21/11";
        console.log(`Creating Category: ${categoryName}...`);
        const category = await createCategory(categoryName);
        console.log(`✅ Category Created: ${category.Id}`);

        // 2. Create Campaign
        const campaignName = "hifu 21/11";
        console.log(`Creating Campaign: ${campaignName}...`);
        const campaign = await createCampaign(campaignName, category.Id);
        console.log(`✅ Campaign Created: ${campaign.Id}`);

        // 3. Create AdSet
        const adSetName = "20 55t - Nữ - 200k";
        const targeting = {
            age_min: 20,
            age_max: 55,
            genders: [2], // Female
            geo_locations: {
                custom_locations: [
                    {
                        latitude: 21.85582150580036,
                        longitude: 106.76063541534162,
                        radius: 3,
                        distance_unit: "kilometer"
                    }
                ]
            },
            interests: [
                { name: 'Làm đẹp' },
                { name: 'Spa' },
                { name: 'Thẩm mỹ viện' }
            ]
        };

        console.log(`Creating AdSet: ${adSetName}...`);
        const adSet = await createAdSet(adSetName, campaign.Id, 200000, targeting);
        console.log(`✅ AdSet Created: ${adSet.Id}`);

        // 4. Create Ad
        const adName = "Existing Post Ad";
        const postLink = "https://www.facebook.com/reel/840276678740046";
        // Extract ID from link if possible, or just use link if API supports it. 
        // FB API usually needs Post ID (PageID_PostID). 
        // For now, we store the link as PostId, assuming the Push logic handles it or user will fix it.
        // Actually, the user said "Tự thêm vào...". 
        // If I can extract ID, great. 
        // Reel URL: /reel/840276678740046 -> ID is 840276678740046.
        // But usually it's PageID_PostID. 
        // Let's use the ID found in URL.
        const postId = "840276678740046";

        console.log(`Creating Ad: ${adName} with Post ID ${postId}...`);
        const ad = await createAd(adName, adSet.Id, postId);
        console.log(`✅ Ad Created: ${ad.Id}`);

        console.log("🎉 Test Campaign Created Successfully!");

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main();
