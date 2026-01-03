/**
 * Golden Rule Sets Service - NocoDB CRUD operations
 * Dành cho Bộ Quy tắc Vàng (v2)
 * 
 * REFACTORED: Now uses centralized NOCODB_CONFIG and secure proxy
 */

import { GoldenRuleSet, BasicRule, AdvancedOverride } from "@/types/automationRules";
import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

// Helper for generating UUIDs that works in non-secure contexts (HTTP)
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for HTTP/Mobile where crypto.randomUUID is missing
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const TABLE_ID = NOCODB_CONFIG.TABLES.GOLDEN_RULE_SETS;

/**
 * Fetch all Golden Rule Sets for a user
 */
export async function fetchGoldenRuleSets(userId: string): Promise<GoldenRuleSet[]> {
    try {
        const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
        const url = `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=100`;

        const response = await fetch(url, {
            method: "GET",
            headers: await getNocoDBHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch golden rule sets: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return (data.list || []).map(parseRuleSetFromDB);
    } catch (error) {
        console.error("Error fetching golden rule sets:", error);
        throw error;
    }
}

/**
 * Fetch a single Golden Rule Set by ID
 */
export async function fetchGoldenRuleSetById(ruleSetId: string): Promise<GoldenRuleSet | null> {
    try {
        const whereClause = encodeURIComponent(`(rule_set_id,eq,${ruleSetId})`);
        const url = `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`;

        const response = await fetch(url, {
            method: "GET",
            headers: await getNocoDBHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch golden rule set: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (data.list && data.list.length > 0) {
            return parseRuleSetFromDB(data.list[0]);
        }
        return null;
    } catch (error) {
        console.error("Error fetching golden rule set by ID:", error);
        throw error;
    }
}

/**
 * Save (create or update) a Golden Rule Set
 */
export async function saveGoldenRuleSet(ruleset: GoldenRuleSet, userId: string): Promise<GoldenRuleSet> {
    try {
        const url = getNocoDBUrl(TABLE_ID);

        // Prepare data for NocoDB
        const dbRecord = {
            rule_set_id: ruleset.id,
            user_id: userId,
            name: ruleset.name,
            description: ruleset.description || "",
            is_active: ruleset.is_active ? 1 : 0,
            basic_rules: JSON.stringify(ruleset.basic_rules || []),
            advanced_overrides: JSON.stringify(ruleset.advanced_overrides || []),
            priority: ruleset.priority || 0,
            updated_at: new Date().toISOString(),
        };

        // Check if exists
        const existing = await fetchGoldenRuleSetById(ruleset.id);

        if (existing) {
            // Update
            const response = await fetch(url, {
                method: "PATCH",
                headers: await getNocoDBHeaders(),
                body: JSON.stringify(dbRecord),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update golden rule set: ${response.status} - ${errorText}`);
            }

            return ruleset;
        } else {
            // Create
            const newId = generateUUID();
            const newRecord = {
                ...dbRecord,
                rule_set_id: newId,
                created_at: new Date().toISOString(),
            };

            const response = await fetch(url, {
                method: "POST",
                headers: await getNocoDBHeaders(),
                body: JSON.stringify(newRecord),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create golden rule set: ${response.status} - ${errorText}`);
            }

            return { ...ruleset, id: newId };
        }
    } catch (error) {
        console.error("Error saving golden rule set:", error);
        throw error;
    }
}

/**
 * Delete a Golden Rule Set
 */
export async function deleteGoldenRuleSet(ruleSetId: string): Promise<void> {
    try {
        // First find the record to get the NocoDB Id
        const existing = await fetchGoldenRuleSetById(ruleSetId);
        if (!existing) {
            throw new Error("Rule set not found");
        }

        // Construct Proxy Command
        const fullUrl = getNocoDBUrl(TABLE_ID);
        const proxyBaseUrl = fullUrl.split('/api/v2')[0];
        const path = `/api/v2/tables/${TABLE_ID}/records`;

        const response = await fetch(proxyBaseUrl, {
            method: "POST",
            headers: await getNocoDBHeaders(),
            body: JSON.stringify({
                path: path,
                method: "DELETE",
                data: [{ Id: (existing as any).Id }]
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to delete golden rule set: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error("Error deleting golden rule set:", error);
        throw error;
    }
}

/**
 * Parse a rule set from NocoDB format to frontend format
 */
function parseRuleSetFromDB(record: any): GoldenRuleSet {
    let basicRules: BasicRule[] = [];
    let advancedOverrides: AdvancedOverride[] = [];

    try {
        basicRules = typeof record.basic_rules === "string"
            ? JSON.parse(record.basic_rules)
            : (record.basic_rules || []);
    } catch (e) {
        console.warn("Failed to parse basic_rules:", e);
    }

    try {
        advancedOverrides = typeof record.advanced_overrides === "string"
            ? JSON.parse(record.advanced_overrides)
            : (record.advanced_overrides || []);
    } catch (e) {
        console.warn("Failed to parse advanced_overrides:", e);
    }

    return {
        id: record.rule_set_id || record.id,
        name: record.name || "",
        description: record.description || "",
        is_active: record.is_active === 1 || record.is_active === true,
        basic_rules: basicRules,
        advanced_overrides: advancedOverrides,
        priority: record.priority || 0,
        created_at: record.created_at,
        updated_at: record.updated_at,
        Id: record.Id, // Keep NocoDB Id for updates/deletes
    };
}
