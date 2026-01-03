import { NOCODB_CONFIG, getNocoDBHeaders } from './config';

const LANDING_PAGE_SETTINGS_TABLE = 'mmfe2gx4pi4oonc';

export interface LandingPageSetting {
    Id?: number;
    key: string;
    value: string;
    meta?: string; // JSON string for colors, sizes, etc.
    CreatedAt?: string;
    UpdatedAt?: string;
}

export interface LandingPageSettings {
    logo_text: string;
    headline_prefix: string;
    headline_underline: string;
    headline_suffix: string;
    description: string;
    cta_primary_text: string;
    cta_secondary_text: string;
    hero_media_url: string;
    hero_media_type: 'image' | 'video';
    primary_color: string;
    underline_color: string;
    // New fields - stored as JSON strings
    product_features: string; // JSON array of product cards
    latest_updates: string;   // JSON array of update cards
    footer_company: string;   // JSON object for footer company info
    footer_links: string;     // JSON object for footer links
}

// Product feature item structure
export interface ProductFeatureItem {
    tag: string;
    title: string;
    description: string;
    buttonText: string;
    buttonVariant?: 'primary' | 'outline';
    dark?: boolean;
}

// Update item structure
export interface UpdateItem {
    tag: string;
    title: string;
    description: string;
    buttonText: string;
}

// Footer company structure
export interface FooterCompany {
    name: string;
    tagline: string;
    address: string;
    hotline: string;
    email: string;
}

export const DEFAULT_SETTINGS: LandingPageSettings = {
    logo_text: 'KJM GROUP',
    headline_prefix: 'Nền tảng',
    headline_underline: 'AI Quảng Cáo Tự Động 24/7',
    headline_suffix: 'cho Spa/Clinic',
    description: 'Tự tạo chiến dịch 1-click, viết content chuẩn dịch vụ/đối tượng, test A/B, tối ưu ngân sách theo hiệu quả và báo cáo hàng ngày – tất cả trong một.',
    cta_primary_text: 'Bắt đầu miễn phí',
    cta_secondary_text: 'Xem demo',
    hero_media_url: '',
    hero_media_type: 'image',
    primary_color: '#2563eb',
    underline_color: '#2563eb',
    product_features: '[]',
    latest_updates: '[]',
    footer_company: '{}',
    footer_links: '{}',
};

function getNocoDBUrl(tableId: string): string {
    return `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${tableId}/records`;
}

/**
 * Get all landing page settings
 */
export async function getLandingPageSettings(): Promise<LandingPageSettings> {
    try {
        const url = getNocoDBUrl(LANDING_PAGE_SETTINGS_TABLE);
        const response = await fetch(url, {
            method: 'GET',
            headers: await getNocoDBHeaders(),
        });

        if (!response.ok) {
            console.error('Failed to fetch landing page settings:', response.status);
            return DEFAULT_SETTINGS;
        }

        const data = await response.json();
        const records: LandingPageSetting[] = data.list || [];

        // Convert array of records to settings object
        const settings = { ...DEFAULT_SETTINGS };

        records.forEach((record) => {
            const key = record.key as keyof LandingPageSettings;
            if (key in settings) {
                (settings as any)[key] = record.value;
            }
        });

        return settings;
    } catch (error) {
        console.error('Error fetching landing page settings:', error);
        return DEFAULT_SETTINGS;
    }
}

/**
 * Update or create a landing page setting
 */
export async function upsertLandingPageSetting(
    key: string,
    value: string,
    meta?: object
): Promise<boolean> {
    try {
        const headers = await getNocoDBHeaders();

        // Check if setting exists - use proper URL encoding
        const whereClause = encodeURIComponent(`(key,eq,${key})`);
        const existingUrl = `${getNocoDBUrl(LANDING_PAGE_SETTINGS_TABLE)}?where=${whereClause}&limit=1`;

        const existingResponse = await fetch(existingUrl, {
            method: 'GET',
            headers,
        });

        if (!existingResponse.ok) {
            return false;
        }

        const existingData = await existingResponse.json();
        const existingRecord = existingData.list?.[0];

        if (existingRecord?.Id) {
            // Update existing - NocoDB API v2: use array with Id in body
            const response = await fetch(getNocoDBUrl(LANDING_PAGE_SETTINGS_TABLE), {
                method: 'PATCH',
                headers,
                body: JSON.stringify([{
                    Id: existingRecord.Id,
                    value,
                    meta: meta ? JSON.stringify(meta) : existingRecord.meta,
                }]),
            });
            return response.ok;
        } else {
            // Create new
            const response = await fetch(getNocoDBUrl(LANDING_PAGE_SETTINGS_TABLE), {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    key,
                    value,
                    meta: meta ? JSON.stringify(meta) : null,
                }),
            });
            return response.ok;
        }
    } catch (error) {
        console.error('Error upserting landing page setting:', error);
        return false;
    }
}

/**
 * Save all landing page settings at once
 */
export async function saveLandingPageSettings(
    settings: Partial<LandingPageSettings>
): Promise<boolean> {
    try {
        const promises = Object.entries(settings).map(([key, value]) =>
            upsertLandingPageSetting(key, value as string)
        );

        const results = await Promise.all(promises);
        return results.every((r) => r);
    } catch (error) {
        console.error('Error saving landing page settings:', error);
        return false;
    }
}
