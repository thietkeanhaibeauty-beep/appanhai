// NocoDB Configuration
// Use environment variables for security
const NOCODB_URL = import.meta.env.VITE_NOCODB_URL || 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = import.meta.env.VITE_NOCODB_TOKEN;
const PROJECT_ID = import.meta.env.VITE_NOCODB_PROJECT_ID || 'p8xfd6fzun2guxg';

// Table IDs - will be populated on init
let TABLE_IDS = {
    Categories: null,
    Templates: null,
    Designs: null,
    ApiKeys: null
};

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
async function initNocoDB() {
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

        let endpoint = `/db/data/noco/${PROJECT_ID}/${TABLE_IDS.Templates}`;
        if (category && category !== 'all') {
            endpoint += `?where=(Category,eq,${category})`;
        }

        const result = await nocoApiCall(endpoint);

        // Transform to expected format
        return (result.list || []).map(t => ({
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

// Legacy function - no longer needed since images are stored as URLs
export function getImageUrl(path) {
    // If it's already a full URL, return as-is
    if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
        return path;
    }
    // Fallback - shouldn't happen with new system
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

// Export init function for manual initialization
export { initNocoDB };
