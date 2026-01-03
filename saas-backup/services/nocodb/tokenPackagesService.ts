import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export interface TokenPackage {
    Id?: number;
    tokens: number;
    price: number;
    is_active: boolean;
    CreatedAt?: string;
    UpdatedAt?: string;
}

const TABLE_ID = NOCODB_CONFIG.TABLES.TOKEN_PACKAGES;

/**
 * Get all active token packages for purchase
 */
export const getTokenPackages = async (): Promise<TokenPackage[]> => {
    try {
        // Fetch all packages and filter in code (checkbox format varies)
        const response = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?sort=tokens&limit=20`,
            {
                method: 'GET',
                headers: await getNocoDBHeaders()
            }
        );

        if (!response.ok) {
            console.error('❌ getTokenPackages HTTP error:', response.status);
            return [];
        }

        const result = await response.json();

        // Filter active packages (checkbox can be true, 1, or "1")
        const allPackages = result.list || [];
        return allPackages.filter((pkg: TokenPackage) =>
            Boolean(pkg.is_active)
        );
    } catch (error) {
        console.error('❌ getTokenPackages error:', error);
        return [];
    }
};
