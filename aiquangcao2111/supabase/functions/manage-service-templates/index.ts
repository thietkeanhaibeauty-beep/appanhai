import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NocoDB Config - Using shared config
const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const SERVICE_TEMPLATES_TABLE_ID = 'mojkp7krw9jjdjc';

// Get authenticated user from request
const getUserFromRequest = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
        throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        throw new Error('Invalid or expired token');
    }

    return user;
};

// Fetch helper with timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 15000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(id);
    }
};

// Safe parse helper - handles both string JSON and already-parsed arrays
const safeParse = (val: any, fallback: any[] = []): any[] => {
    if (!val) return fallback;
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try { return JSON.parse(val); }
        catch (e) { return fallback; }
    }
    return fallback;
};

// Helper to parse template JSON fields
const parseTemplateFields = (t: any) => ({
    ...t,
    interest_keywords: safeParse(t.interest_keywords, []),
    interest_ids: safeParse(t.interest_ids, []),
    headline: safeParse(t.headline, []),
    frequent_questions: safeParse(t.frequent_questions, []),
});

// ============================================================================
// CRUD Operations
// ============================================================================

// CREATE - Tạo template mới
async function createTemplate(userId: string, templateData: any) {
    const url = `${NOCODB_API_URL}/api/v2/tables/${SERVICE_TEMPLATES_TABLE_ID}/records`;

    const record = {
        user_id: userId,
        name: templateData.name,
        template_type: templateData.template_type || 'link',
        age_min: templateData.age_min || 18,
        age_max: templateData.age_max || 65,
        gender: templateData.gender || 'all',
        budget: templateData.budget || 200000,
        budget_type: templateData.budget_type || 'daily',
        location_type: templateData.location_type || 'country',
        location_name: templateData.location_name || 'Việt Nam',
        location_key: templateData.location_key || null,
        latitude: templateData.latitude || null,
        longitude: templateData.longitude || null,
        radius_km: templateData.radius_km || null,
        interest_keywords: templateData.interest_keywords ? JSON.stringify(templateData.interest_keywords) : null,
        interest_ids: templateData.interest_ids ? JSON.stringify(templateData.interest_ids) : null,
        headline: templateData.headline ? JSON.stringify(templateData.headline) : null,
        greeting_template: templateData.greeting_template || null,
        frequent_questions: templateData.frequent_questions ? JSON.stringify(templateData.frequent_questions) : null,
        is_default: templateData.is_default || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create template: ${errorText}`);
    }

    return await response.json();
}

// READ - Lấy danh sách templates của user
async function listTemplates(userId: string) {
    const url = `${NOCODB_API_URL}/api/v2/tables/${SERVICE_TEMPLATES_TABLE_ID}/records?where=(user_id,eq,${userId})&sort=-created_at`;

    const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch templates');
    }

    const data = await response.json();

    // Parse JSON fields safely
    return (data.list || []).map(parseTemplateFields);
}

// READ - Lấy template theo tên (fuzzy match)
async function getTemplateByName(userId: string, name: string) {
    // First try exact match
    let url = `${NOCODB_API_URL}/api/v2/tables/${SERVICE_TEMPLATES_TABLE_ID}/records?where=(user_id,eq,${userId})~and(name,eq,${encodeURIComponent(name)})&limit=1`;

    let response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json',
        },
    });

    let data = await response.json();

    if (data.list && data.list.length > 0) {
        return parseTemplateFields(data.list[0]);
    }

    // Try case-insensitive contains match
    url = `${NOCODB_API_URL}/api/v2/tables/${SERVICE_TEMPLATES_TABLE_ID}/records?where=(user_id,eq,${userId})~and(name,like,${encodeURIComponent(name)})&limit=5`;

    response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json',
        },
    });

    data = await response.json();

    if (data.list && data.list.length > 0) {
        return parseTemplateFields(data.list[0]);
    }

    return null;
}

// UPDATE - Cập nhật template
async function updateTemplate(userId: string, templateId: number, templateData: any) {
    // Verify ownership first
    const checkUrl = `${NOCODB_API_URL}/api/v2/tables/${SERVICE_TEMPLATES_TABLE_ID}/records/${templateId}`;
    const checkResponse = await fetchWithTimeout(checkUrl, {
        method: 'GET',
        headers: { 'xc-token': NOCODB_API_TOKEN },
    });

    const existing = await checkResponse.json();
    if (existing.user_id !== userId) {
        throw new Error('Not authorized to update this template');
    }

    const url = `${NOCODB_API_URL}/api/v2/tables/${SERVICE_TEMPLATES_TABLE_ID}/records`;

    const updateData: any = {
        Id: templateId,
        updated_at: new Date().toISOString(),
    };

    // Only update provided fields
    if (templateData.name !== undefined) updateData.name = templateData.name;
    if (templateData.template_type !== undefined) updateData.template_type = templateData.template_type;
    if (templateData.age_min !== undefined) updateData.age_min = templateData.age_min;
    if (templateData.age_max !== undefined) updateData.age_max = templateData.age_max;
    if (templateData.gender !== undefined) updateData.gender = templateData.gender;
    if (templateData.budget !== undefined) updateData.budget = templateData.budget;
    if (templateData.budget_type !== undefined) updateData.budget_type = templateData.budget_type;
    if (templateData.location_type !== undefined) updateData.location_type = templateData.location_type;
    if (templateData.location_name !== undefined) updateData.location_name = templateData.location_name;
    if (templateData.location_key !== undefined) updateData.location_key = templateData.location_key;
    if (templateData.latitude !== undefined) updateData.latitude = templateData.latitude;
    if (templateData.longitude !== undefined) updateData.longitude = templateData.longitude;
    if (templateData.radius_km !== undefined) updateData.radius_km = templateData.radius_km;
    if (templateData.interest_keywords !== undefined) updateData.interest_keywords = JSON.stringify(templateData.interest_keywords);
    if (templateData.interest_ids !== undefined) updateData.interest_ids = JSON.stringify(templateData.interest_ids);
    if (templateData.headline !== undefined) updateData.headline = JSON.stringify(templateData.headline);
    if (templateData.greeting_template !== undefined) updateData.greeting_template = templateData.greeting_template;
    if (templateData.frequent_questions !== undefined) updateData.frequent_questions = JSON.stringify(templateData.frequent_questions);
    if (templateData.is_default !== undefined) updateData.is_default = templateData.is_default;

    const response = await fetchWithTimeout(url, {
        method: 'PATCH',
        headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
    });

    if (!response.ok) {
        throw new Error('Failed to update template');
    }

    return await response.json();
}

// DELETE - Xóa template
async function deleteTemplate(userId: string, templateId: number) {
    // Verify ownership first
    const checkUrl = `${NOCODB_API_URL}/api/v2/tables/${SERVICE_TEMPLATES_TABLE_ID}/records/${templateId}`;
    const checkResponse = await fetchWithTimeout(checkUrl, {
        method: 'GET',
        headers: { 'xc-token': NOCODB_API_TOKEN },
    });

    const existing = await checkResponse.json();
    if (existing.user_id !== userId) {
        throw new Error('Not authorized to delete this template');
    }

    const url = `${NOCODB_API_URL}/api/v2/tables/${SERVICE_TEMPLATES_TABLE_ID}/records`;

    const response = await fetchWithTimeout(url, {
        method: 'DELETE',
        headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ Id: templateId }),
    });

    if (!response.ok) {
        throw new Error('Failed to delete template');
    }

    return { success: true, message: 'Template deleted' };
}

// DELETE by name - Xóa template theo tên
async function deleteTemplateByName(userId: string, templateName: string) {
    const template = await getTemplateByName(userId, templateName);
    if (!template) {
        throw new Error(`Template "${templateName}" không tồn tại`);
    }
    return await deleteTemplate(userId, template.Id);
}

// ============================================================================
// Main Handler
// ============================================================================
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const user = await getUserFromRequest(req);
        const userId = user.id;

        const { action, ...params } = await req.json();

        console.log(`📋 Service Templates: action=${action}, userId=${userId}`);

        let result;

        switch (action) {
            case 'create':
                if (!params.name) throw new Error('Template name is required');
                result = await createTemplate(userId, params);
                break;

            case 'list':
                result = await listTemplates(userId);
                break;

            case 'get':
                if (!params.name) throw new Error('Template name is required');
                result = await getTemplateByName(userId, params.name);
                if (!result) {
                    return new Response(
                        JSON.stringify({ success: false, error: `Template "${params.name}" không tồn tại` }),
                        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }
                break;

            case 'update':
                if (!params.id) throw new Error('Template ID is required');
                result = await updateTemplate(userId, params.id, params);
                break;

            case 'delete':
                if (params.id) {
                    result = await deleteTemplate(userId, params.id);
                } else if (params.name) {
                    result = await deleteTemplateByName(userId, params.name);
                } else {
                    throw new Error('Template ID or name is required');
                }
                break;

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        return new Response(
            JSON.stringify({ success: true, data: result }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('❌ Error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
