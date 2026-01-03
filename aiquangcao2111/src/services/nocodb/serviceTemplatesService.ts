/**
 * Service Templates Service - NocoDB CRUD operations
 * 
 * REFACTORED: Now uses centralized NOCODB_CONFIG and secure proxy
 */

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

const TABLE_ID = NOCODB_CONFIG.TABLES.SERVICE_TEMPLATES;

export interface ServiceTemplate {
    Id?: number;
    user_id: string;
    name: string;
    campaign_name?: string;
    template_type: string;
    age_min: number;
    age_max: number;
    gender: string;
    budget: number;
    budget_type: string;
    location_type: string;
    location_name: string;
    location_key?: string;
    latitude?: string;
    longitude?: string;
    radius_km?: number;
    interest_keywords: string[];
    interest_ids: any[];
    headline: string[];
    greeting_template?: string;
    frequent_questions: string[];
    is_default: boolean;
    created_at?: string;
    updated_at?: string;
}

interface NocoDBListResponse {
    list: any[];
    pageInfo: {
        totalRows: number;
        page: number;
        pageSize: number;
        isFirstPage: boolean;
        isLastPage: boolean;
    };
}

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

// Parse template fields from NocoDB response
const parseTemplateFields = (t: any): ServiceTemplate => ({
    ...t,
    interest_keywords: safeParse(t.interest_keywords, []),
    interest_ids: safeParse(t.interest_ids, []),
    headline: safeParse(t.headline, []),
    frequent_questions: safeParse(t.frequent_questions, []),
});

/**
 * Get all service templates for a user
 */
export const getServiceTemplates = async (userId: string): Promise<ServiceTemplate[]> => {
    try {
        const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
        const url = `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=100&sort=-CreatedAt`;

        const response = await fetch(url, {
            method: 'GET',
            headers: await getNocoDBHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`NocoDB API error: ${response.status} - ${errorText}`);
        }

        const data: NocoDBListResponse = await response.json();
        return (data.list || []).map(parseTemplateFields);
    } catch (error) {
        console.error('Error fetching service templates from NocoDB:', error);
        throw error;
    }
};

/**
 * Create a new service template
 */
export const createServiceTemplate = async (template: Partial<ServiceTemplate>): Promise<ServiceTemplate> => {
    try {
        const url = getNocoDBUrl(TABLE_ID);

        // Stringify JSON fields
        const record = {
            ...template,
            interest_keywords: template.interest_keywords ? JSON.stringify(template.interest_keywords) : null,
            interest_ids: template.interest_ids ? JSON.stringify(template.interest_ids) : null,
            headline: template.headline ? JSON.stringify(template.headline) : null,
            frequent_questions: template.frequent_questions ? JSON.stringify(template.frequent_questions) : null,
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: await getNocoDBHeaders(),
            body: JSON.stringify(record),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ NocoDB Error (${response.status}):`, errorText);
            throw new Error(`NocoDB API error: ${response.status} - ${errorText}`);
        }

        return parseTemplateFields(await response.json());
    } catch (error) {
        console.error('Error creating service template:', error);
        throw error;
    }
};

/**
 * Update a service template
 */
export const updateServiceTemplate = async (id: number, template: Partial<ServiceTemplate>): Promise<ServiceTemplate> => {
    try {
        const url = getNocoDBUrl(TABLE_ID);

        // Build update record with Id
        const record: any = {
            Id: id,
        };

        if (template.name !== undefined) record.name = template.name;
        if (template.campaign_name !== undefined) record.campaign_name = template.campaign_name;
        if (template.template_type !== undefined) record.template_type = template.template_type;
        if (template.age_min !== undefined) record.age_min = template.age_min;
        if (template.age_max !== undefined) record.age_max = template.age_max;
        if (template.gender !== undefined) record.gender = template.gender;
        if (template.budget !== undefined) record.budget = template.budget;
        if (template.budget_type !== undefined) record.budget_type = template.budget_type;
        if (template.location_type !== undefined) record.location_type = template.location_type;
        if (template.location_name !== undefined) record.location_name = template.location_name;
        if (template.latitude !== undefined) record.latitude = template.latitude;
        if (template.longitude !== undefined) record.longitude = template.longitude;
        if (template.radius_km !== undefined) record.radius_km = template.radius_km;
        if (template.interest_keywords !== undefined) record.interest_keywords = JSON.stringify(template.interest_keywords);
        if (template.interest_ids !== undefined) record.interest_ids = JSON.stringify(template.interest_ids);
        if (template.headline !== undefined) record.headline = JSON.stringify(template.headline);
        if (template.greeting_template !== undefined) record.greeting_template = template.greeting_template;
        if (template.frequent_questions !== undefined) record.frequent_questions = JSON.stringify(template.frequent_questions);
        if (template.is_default !== undefined) record.is_default = template.is_default;

        // Construct Proxy Command
        const fullUrl = getNocoDBUrl(TABLE_ID);
        const proxyBaseUrl = fullUrl.split('/api/v2')[0];
        const path = `/api/v2/tables/${TABLE_ID}/records`;

        const response = await fetch(proxyBaseUrl, {
            method: 'POST',
            headers: await getNocoDBHeaders(),
            body: JSON.stringify({
                path: path,
                method: 'PATCH',
                data: record
            }),
        });

        const responseText = await response.text();

        if (!response.ok) {
            throw new Error(`NocoDB API error: ${response.status} - ${responseText}`);
        }

        try {
            return parseTemplateFields(JSON.parse(responseText));
        } catch {
            // Sometimes NocoDB returns empty on success
            return { ...template, Id: id } as ServiceTemplate;
        }
    } catch (error) {
        console.error('Error updating service template:', error);
        throw error;
    }
};

/**
 * Delete a service template
 * ✅ FIX: Use Proxy Command Pattern
 */
export const deleteServiceTemplate = async (id: number): Promise<void> => {
    try {
        // Construct Proxy Command
        const fullUrl = getNocoDBUrl(TABLE_ID);
        const proxyBaseUrl = fullUrl.split('/api/v2')[0];
        const path = `/api/v2/tables/${TABLE_ID}/records`;

        const response = await fetch(proxyBaseUrl, {
            method: 'POST',
            headers: await getNocoDBHeaders(),
            body: JSON.stringify({
                path: path,
                method: 'DELETE',
                data: [{ Id: id }]
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`NocoDB API error: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error('Error deleting service template:', error);
        throw error;
    }
};
