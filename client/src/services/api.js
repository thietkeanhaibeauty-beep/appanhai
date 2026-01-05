// NocoDB Configuration
// Use environment variables for security
const NOCODB_URL = import.meta.env.VITE_NOCODB_URL || 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = import.meta.env.VITE_NOCODB_TOKEN;
const PROJECT_ID = import.meta.env.VITE_NOCODB_PROJECT_ID || 'p8xfd6fzun2guxg';

// Table IDs - will be populated on init
export let TABLE_IDS = {
    Categories: null,
    Templates: null,
    Designs: null,
    ApiKeys: null,
    UserRoles: 'm0bix8eqprite24', // Hardcoded ID for user_roles table
    "User Roles": 'm0bix8eqprite24',
    user_roles: 'm0bix8eqprite24', // snake_case variant
    Subscriptions: 'myjov622ntt3j73', // Correct ID for [user_subscriptions]
    subscriptions: 'myjov622ntt3j73',
    Wallets: 'm16m58ti6kjlax0',      // Correct ID for [user_balances]
    wallets: 'm16m58ti6kjlax0',
    Users: 'm16m58ti6kjlax0',
    Vouchers: 'mhgqm56k0lobsgn',     // Correct ID for [Vouchers]
    vouchers: 'mhgqm56k0lobsgn',
    VoucherRedemptions: 'mgzw8dqt69tp478', // Table to track who redeemed
    voucherRedemptions: 'mgzw8dqt69tp478',
    PromptUnlocks: 'm5amf5e7wwqngfw',     // Table to track prompt unlocks
    prompt_unlocks: 'm5amf5e7wwqngfw',
    Packages: 'm9fazh5nc6dt1a3',           // payment_packages table
    payment_packages: 'm9fazh5nc6dt1a3'
};

// Export configuration
export { NOCODB_URL, NOCODB_TOKEN, PROJECT_ID };

let isInitialized = false;

/**
 * Make API request to NocoDB
 */
async function nocoApiCall(endpoint, options = {}) {
    const url = `${NOCODB_URL}/api/v1${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'xc-token': NOCODB_TOKEN,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`NocoDB API Error ${response.status}: ${errorText}`);
    }

    return response.json();
}

/**
 * Initialize - Get table IDs from NocoDB
 */
export async function initNocoDB() {
    if (isInitialized) return TABLE_IDS;

    try {
        const tables = await nocoApiCall(`/db/meta/projects/${PROJECT_ID}/tables`);

        for (const table of tables.list || []) {
            if (TABLE_IDS.hasOwnProperty(table.title)) {
                TABLE_IDS[table.title] = table.id;
            }
        }

        console.log('✅ NocoDB initialized. Table IDs:', TABLE_IDS);
        isInitialized = true;
        return TABLE_IDS;
    } catch (error) {
        console.error('❌ NocoDB init error:', error.message);
        throw error;
    }
}

// ============== CATEGORIES API ==============

export const categoriesApi = {
    getAll: async () => {
        await initNocoDB();
        if (!TABLE_IDS.Categories) return [];
        const result = await nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Categories}`);
        // Transform to expected format - use RecordId as primary ID
        return (result.list || []).map(cat => ({
            id: cat.RecordId || cat.Id || cat.id,
            name: cat.Name || cat.name,
            icon: cat.Icon || cat.icon || '📁'
        }));
    },

    create: async (data) => {
        await initNocoDB();
        // Generate RecordId from name (slug format)
        const recordId = data.name.toLowerCase().trim()
            .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
            .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
            .replace(/[ìíịỉĩ]/g, 'i')
            .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
            .replace(/[ùúụủũưừứựửữ]/g, 'u')
            .replace(/[ỳýỵỷỹ]/g, 'y')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_');

        const result = await nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Categories}`, {
            method: 'POST',
            body: JSON.stringify({
                RecordId: recordId,
                Name: data.name,
                Icon: data.icon || '📁'
            })
        });

        return { id: recordId, name: data.name, icon: data.icon || '📁', ...result };
    },

    update: async (id, data) => {
        await initNocoDB();
        return nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Categories}/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                Name: data.name,
                Icon: data.icon
            })
        });
    },

    delete: async (id) => {
        await initNocoDB();
        return nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Categories}/${id}`, {
            method: 'DELETE'
        });
    },

    // Find category by name (case-insensitive)
    findByName: async (name) => {
        const all = await categoriesApi.getAll();
        return all.find(c => c.name.toLowerCase().trim() === name.toLowerCase().trim());
    },

    // Find existing category or create new one
    findOrCreate: async (name) => {
        const existing = await categoriesApi.findByName(name);
        if (existing) {
            return existing;
        }
        // Create new category (create now returns proper id)
        return await categoriesApi.create({ name: name.trim(), icon: '📁' });
    }
};

// ============== TEMPLATES API ==============

export const templatesApi = {
    getAll: async (category = null) => {
        await initNocoDB();
        if (!TABLE_IDS.Templates) return [];

        // NocoDB defaults to 25 records, set limit=1000 to get all templates
        let endpoint = `/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Templates}?limit=1000`;
        if (category && category !== 'all') {
            endpoint += `&where=(Category,eq,${category})`;
        }

        const result = await nocoApiCall(endpoint);

        // Transform to expected format
        return (result.list || []).map(t => ({
            id: t.RecordId || t.Id,
            title: t.Title,
            description: t.Description || '',
            category: t.Category,
            image: t.Image,
            isStarred: t.IsStarred || false,
            textSlots: safeJsonParse(t.TextSlots),
            imageSlots: safeJsonParse(t.ImageSlots),
            colorSlots: safeJsonParse(t.ColorSlots),
            textZones: safeJsonParse(t.TextZones),
            stylePrompt: t.StylePrompt || ''
        }));
    },

    getById: async (id) => {
        await initNocoDB();
        const result = await nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Templates}?where=(RecordId,eq,${id})`);
        const t = result.list?.[0];
        if (!t) return null;

        return {
            id: t.RecordId || t.Id,
            title: t.Title,
            description: t.Description || '',
            category: t.Category,
            image: t.Image,
            textSlots: safeJsonParse(t.TextSlots),
            imageSlots: safeJsonParse(t.ImageSlots),
            colorSlots: safeJsonParse(t.ColorSlots),
            textZones: safeJsonParse(t.TextZones),
            stylePrompt: t.StylePrompt || ''
        };
    },

    create: async (data) => {
        await initNocoDB();
        const recordId = `tpl_${Date.now()}`;

        const result = await nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Templates}`, {
            method: 'POST',
            body: JSON.stringify({
                RecordId: recordId,
                Title: data.title,
                Description: data.description || '',
                Category: data.category || 'banner',
                Image: data.image, // URL directly (Google Drive URL)
                TextSlots: JSON.stringify(data.textSlots || []),
                ImageSlots: JSON.stringify(data.imageSlots || []),
                ColorSlots: JSON.stringify(data.colorSlots || []),
                TextZones: JSON.stringify(data.textZones || []),
                StylePrompt: data.stylePrompt || ''
            })
        });

        return { id: recordId, ...data, ...result };
    },

    update: async (id, data) => {
        await initNocoDB();
        // Find the row by RecordId
        const existing = await nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Templates}?where=(RecordId,eq,${id})`);
        const row = existing.list?.[0];
        if (!row) throw new Error('Template not found');

        return nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Templates}/${row.Id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                Title: data.title,
                Description: data.description || '',
                Category: data.category,
                Image: data.image,
                TextSlots: JSON.stringify(data.textSlots || []),
                ImageSlots: JSON.stringify(data.imageSlots || []),
                ColorSlots: JSON.stringify(data.colorSlots || []),
                StylePrompt: data.stylePrompt || ''
            })
        });
    },

    delete: async (id) => {
        await initNocoDB();
        // Find the row by RecordId
        const existing = await nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Templates}?where=(RecordId,eq,${id})`);
        const row = existing.list?.[0];
        if (!row) throw new Error('Template not found');

        return nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Templates}/${row.Id}`, {
            method: 'DELETE'
        });
    },

    // Toggle star status for a template (superadmin only)
    toggleStar: async (id, isStarred) => {
        await initNocoDB();
        const existing = await nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Templates}?where=(RecordId,eq,${id})`);
        const row = existing.list?.[0];
        if (!row) throw new Error('Template not found');

        return nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Templates}/${row.Id}`, {
            method: 'PATCH',
            body: JSON.stringify({ IsStarred: isStarred })
        });
    },

    // Update template category
    updateCategory: async (id, categoryId) => {
        await initNocoDB();
        const existing = await nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Templates}?where=(RecordId,eq,${id})`);
        const row = existing.list?.[0];
        if (!row) throw new Error('Template not found');

        return nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Templates}/${row.Id}`, {
            method: 'PATCH',
            body: JSON.stringify({ Category: categoryId })
        });
    }
};

// ============== DESIGNS API ==============

export const designsApi = {
    getAll: async () => {
        await initNocoDB();
        if (!TABLE_IDS.Designs) return [];
        const result = await nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Designs}`);
        return (result.list || []).map(d => ({
            id: d.RecordId || d.Id,
            templateId: d.TemplateId,
            templateName: d.TemplateName,
            previewImage: d.PreviewImage,
            formData: safeJsonParse(d.FormData),
            createdAt: d.CreatedAt
        }));
    },

    save: async (data) => {
        await initNocoDB();
        const recordId = `design_${Date.now()}`;

        return nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Designs}`, {
            method: 'POST',
            body: JSON.stringify({
                RecordId: recordId,
                TemplateId: data.templateId,
                TemplateName: data.templateName,
                PreviewImage: data.previewImage,
                FormData: JSON.stringify(data.formData || {}),
                CreatedAt: new Date().toISOString()
            })
        });
    },

    delete: async (id) => {
        await initNocoDB();
        const existing = await nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Designs}?where=(RecordId,eq,${id})`);
        const row = existing.list?.[0];
        if (!row) throw new Error('Design not found');

        return nocoApiCall(`/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Designs}/${row.Id}`, {
            method: 'DELETE'
        });
    }
};

// ============== HELPER FUNCTIONS ==============

function safeJsonParse(val) {
    if (!val) return [];
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { return []; }
    }
    return val;
}

// Convert URLs to displayable format, especially Google Drive links
export function getImageUrl(path) {
    if (!path) return path;

    // If it's already a full URL
    if (path.startsWith('http://') || path.startsWith('https://')) {
        // Check if it's a Google Drive link that needs conversion
        if (path.includes('drive.google.com')) {
            // Extract file ID from various Google Drive URL formats
            let fileId = null;

            // Format: https://drive.google.com/file/d/FILE_ID/view
            const fileMatch = path.match(/\/file\/d\/([^\/]+)/);
            if (fileMatch) {
                fileId = fileMatch[1];
            }

            // Format: https://drive.google.com/open?id=FILE_ID or uc?export=view&id=FILE_ID
            const openMatch = path.match(/[?&]id=([^&]+)/);
            if (openMatch) {
                fileId = openMatch[1];
            }

            // If we found a file ID, use lh3.googleusercontent which bypasses CORS and rate-limiting
            if (fileId) {
                return `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
            }
        }

        // Handle existing uc?export=view links that might be stored in database
        if (path.includes('drive.google.com/uc')) {
            const ucMatch = path.match(/[?&]id=([^&]+)/);
            if (ucMatch) {
                return `https://lh3.googleusercontent.com/d/${ucMatch[1]}=w1000`;
            }
        }

        // Return other URLs as-is
        return path;
    }

    // Fallback for legacy paths
    return path;
}

// Health check - just check if NocoDB is reachable
export async function healthCheck() {
    try {
        await initNocoDB();
        return { status: 'ok', message: 'NocoDB connected' };
    } catch (error) {
        throw new Error('NocoDB not reachable');
    }
}

// ==========================================
// PROMPT UNLOCKS API
// ==========================================

/**
 * Check if user has unlocked a template (within 30 days)
 */
export async function checkPromptUnlock(userId, templateId) {
    const tableId = TABLE_IDS.PromptUnlocks;
    const now = new Date().toISOString();

    try {
        const response = await fetch(
            `${NOCODB_URL}/api/v2/tables/${tableId}/records?where=(user_id,eq,${userId})~and(template_id,eq,${templateId})~and(expires_at,gt,${now})&limit=1`,
            { headers: { 'xc-token': NOCODB_TOKEN } }
        );
        const data = await response.json();
        return data.list?.length > 0 ? data.list[0] : null;
    } catch (error) {
        console.error('Error checking unlock:', error);
        return null;
    }
}

/**
 * Get user's unlock count in last 30 days
 */
export async function getUserUnlockCount(userId) {
    const tableId = TABLE_IDS.PromptUnlocks;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
        const response = await fetch(
            `${NOCODB_URL}/api/v2/tables/${tableId}/records?where=(user_id,eq,${userId})~and(unlocked_at,gt,${thirtyDaysAgo.toISOString()})`,
            { headers: { 'xc-token': NOCODB_TOKEN } }
        );
        const data = await response.json();
        return data.list?.length || 0;
    } catch (error) {
        console.error('Error getting unlock count:', error);
        return 0;
    }
}

/**
 * Unlock a prompt template for user
 */
export async function unlockPrompt(userId, templateId) {
    const tableId = TABLE_IDS.PromptUnlocks;
    const now = new Date();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    try {
        const response = await fetch(
            `${NOCODB_URL}/api/v2/tables/${tableId}/records`,
            {
                method: 'POST',
                headers: {
                    'xc-token': NOCODB_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    template_id: templateId,
                    unlocked_at: now.toISOString(),
                    expires_at: expires.toISOString()
                })
            }
        );
        return await response.json();
    } catch (error) {
        console.error('Error unlocking prompt:', error);
        throw error;
    }
}

/**
 * Get package unlock limit by package name
 */
export async function getPackageUnlockLimit(packageName) {
    const tableId = TABLE_IDS.Packages;

    try {
        const response = await fetch(
            `${NOCODB_URL}/api/v2/tables/${tableId}/records?where=(name,eq,${packageName})&limit=1`,
            { headers: { 'xc-token': NOCODB_TOKEN } }
        );
        const data = await response.json();
        return data.list?.[0]?.prompt_unlocks || 0;
    } catch (error) {
        console.error('Error getting package limit:', error);
        return 0;
    }
}

/**
 * Get user's unlock history
 */
export async function getUserUnlockHistory(userId, limit = 50) {
    const tableId = TABLE_IDS.PromptUnlocks;

    try {
        const response = await fetch(
            `${NOCODB_URL}/api/v2/tables/${tableId}/records?where=(user_id,eq,${userId})&sort=-unlocked_at&limit=${limit}`,
            { headers: { 'xc-token': NOCODB_TOKEN } }
        );
        const data = await response.json();
        return data.list || [];
    } catch (error) {
        console.error('Error getting unlock history:', error);
        return [];
    }
}

// ==========================================
// COIN SYSTEM API
// ==========================================

// Giá coin
export const COIN_PRICES = {
    UNLOCK_PROMPT: 2,  // 2 coin = 1 lần mở khóa prompt
    GENERATE_IMAGE: 5, // 5 coin = 1 lần tạo ảnh
    VND_PER_COIN: 1000 // 1 coin = 1000 VNĐ
};

/**
 * Get user's coin balance
 */
export async function getUserCoinBalance(userId) {
    const tableId = TABLE_IDS.Wallets || 'm16m58ti6kjlax0';

    try {
        const response = await fetch(
            `${NOCODB_URL}/api/v2/tables/${tableId}/records?where=(user_id,eq,${userId})&limit=1`,
            { headers: { 'xc-token': NOCODB_TOKEN } }
        );
        const data = await response.json();
        return data.list?.[0]?.balance || 0;
    } catch (error) {
        console.error('Error getting coin balance:', error);
        return 0;
    }
}

/**
 * Deduct coins from user balance
 * @param {string} userId 
 * @param {number} amount - số coin cần trừ
 * @param {string} reason - lý do: 'unlock_prompt' | 'generate_image'
 */
export async function deductCoins(userId, amount, reason) {
    const tableId = TABLE_IDS.Wallets || 'm16m58ti6kjlax0';

    try {
        // Get current balance
        const response = await fetch(
            `${NOCODB_URL}/api/v2/tables/${tableId}/records?where=(user_id,eq,${userId})&limit=1`,
            { headers: { 'xc-token': NOCODB_TOKEN } }
        );
        const data = await response.json();
        const record = data.list?.[0];

        if (!record) {
            return { success: false, error: 'Không tìm thấy ví người dùng' };
        }

        const currentBalance = record.balance || 0;
        if (currentBalance < amount) {
            return {
                success: false,
                error: `Không đủ coin. Bạn có ${currentBalance} coin, cần ${amount} coin.`,
                balance: currentBalance,
                required: amount
            };
        }

        // Deduct coins
        const newBalance = currentBalance - amount;
        const updateResponse = await fetch(
            `${NOCODB_URL}/api/v2/tables/${tableId}/records`,
            {
                method: 'PATCH',
                headers: {
                    'xc-token': NOCODB_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Id: record.Id,
                    balance: newBalance
                })
            }
        );

        if (!updateResponse.ok) {
            throw new Error('Không thể cập nhật số dư');
        }

        console.log(`✅ Đã trừ ${amount} coin cho ${reason}. Số dư mới: ${newBalance}`);
        return {
            success: true,
            balance: newBalance,
            deducted: amount,
            reason
        };
    } catch (error) {
        console.error('Error deducting coins:', error);
        return { success: false, error: error.message };
    }
}

// Migration API - not needed since we're going directly to NocoDB
// Kept for backward compatibility
export const migrationApi = {
    migrateFromLocalStorage: async () => {
        // No migration needed - data is already in NocoDB
        return { success: true, stats: { categories: 0, templates: 0, designs: 0 } };
    },
    clearLocalStorage: () => {
        localStorage.removeItem('custom_categories');
        localStorage.removeItem('custom_templates');
        localStorage.removeItem('my_designs');
    }
};

// Default export for backward compatibility
const api = {
    categories: categoriesApi,
    templates: templatesApi,
    designs: designsApi
};

export default api;


