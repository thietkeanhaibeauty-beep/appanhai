import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export interface DraftCategory {
    Id: string;
    Name: string;
    Description?: string;
}

export interface DraftCampaign {
    Id: string;
    Name: string;
    Objective: string;
    BuyingType: string;
    Status: 'DRAFT' | 'PUBLISHED';
    CategoryId: string;
}

export interface DraftAdSet {
    Id: string;
    Name: string;
    DailyBudget: number;
    BidStrategy: string;
    Targeting: any; // JSON
    Status: string;
    CampaignId: string;
}

// export interface DraftAd {
//     Id: string;
//     Name: string;
//     CreativeType: 'EXISTING_POST' | 'NEW_CREATIVE';
//     PostId?: string;
//     CreativeData?: any; // JSON
//     Status: string;
//     AdSetId: string;
// }

export const draftService = {
    // --- Categories ---
    async getCategories(): Promise<DraftCategory[]> {
        try {
            const response = await fetch(getNocoDBUrl(NOCODB_CONFIG.TABLES.DRAFT_CATEGORIES), {
                headers: await getNocoDBHeaders(),
            });
            const data = await response.json();
            return data.list || [];
        } catch (error) {
            console.error('Error fetching draft categories:', error);
            return [];
        }
    },

    async createCategory(category: Omit<DraftCategory, 'Id'>): Promise<DraftCategory | null> {
        try {
            const response = await fetch(getNocoDBUrl(NOCODB_CONFIG.TABLES.DRAFT_CATEGORIES), {
                method: 'POST',
                headers: await getNocoDBHeaders(),
                body: JSON.stringify(category),
            });
            const data = await response.json();
            return { ...category, ...data };
        } catch (error) {
            console.error('Error creating draft category:', error);
            return null;
        }
    },

    // --- Campaigns ---
    async getCampaignsByCategory(categoryId: string): Promise<DraftCampaign[]> {
        try {
            const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.DRAFT_CAMPAIGNS)}?where=(CategoryId,eq,${categoryId})`;
            const response = await fetch(url, {
                headers: await getNocoDBHeaders(),
            });
            const data = await response.json();
            return data.list || [];
        } catch (error) {
            console.error('Error fetching draft campaigns:', error);
            return [];
        }
    },

    async createCampaign(campaign: Omit<DraftCampaign, 'Id'>): Promise<DraftCampaign | null> {
        try {
            const response = await fetch(getNocoDBUrl(NOCODB_CONFIG.TABLES.DRAFT_CAMPAIGNS), {
                method: 'POST',
                headers: await getNocoDBHeaders(),
                body: JSON.stringify(campaign),
            });
            const data = await response.json();
            return { ...campaign, ...data };
        } catch (error) {
            console.error('Error creating draft campaign:', error);
            return null;
        }
    },

    // --- AdSets ---
    async getAdSetsByCampaign(campaignId: string): Promise<DraftAdSet[]> {
        try {
            const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.DRAFT_ADSETS)}?where=(CampaignId,eq,${campaignId})`;
            const response = await fetch(url, {
                headers: await getNocoDBHeaders(),
            });
            const data = await response.json();
            return data.list || [];
        } catch (error) {
            console.error('Error fetching draft adsets:', error);
            return [];
        }
    },

    async createAdSet(adSet: Omit<DraftAdSet, 'Id'>): Promise<DraftAdSet | null> {
        try {
            const response = await fetch(getNocoDBUrl(NOCODB_CONFIG.TABLES.DRAFT_ADSETS), {
                method: 'POST',
                headers: await getNocoDBHeaders(),
                body: JSON.stringify(adSet),
            });
            const data = await response.json();
            return { ...adSet, ...data };
        } catch (error) {
            console.error('Error creating draft adset:', error);
            return null;
        }
    },

    // --- Ads (Removed) ---
    // async getAdsByAdSet(adSetId: string): Promise<DraftAd[]> { ... }
    // async createAd(ad: Omit<DraftAd, 'Id'>): Promise<DraftAd | null> { ... }

    // --- Full Structure Fetching ---
    async getFullCampaignStructure(campaignId: string) {
        const campaignResponse = await fetch(getNocoDBUrl(NOCODB_CONFIG.TABLES.DRAFT_CAMPAIGNS, campaignId), { headers: await getNocoDBHeaders() });
        const campaign = await campaignResponse.json();

        const adSets = await this.getAdSetsByCampaign(campaignId);

        const adSetsWithAds = await Promise.all(adSets.map(async (adSet) => {
            // const ads = await this.getAdsByAdSet(adSet.Id);
            return { ...adSet, ads: [] };
        }));

        return { ...campaign, adSets: adSetsWithAds };
    }
};
