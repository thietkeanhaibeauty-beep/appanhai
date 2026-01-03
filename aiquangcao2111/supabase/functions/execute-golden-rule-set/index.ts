/**
 * execute-golden-rule-set - Edge Function
 * Thực thi Bộ Quy tắc Vàng với logic: Override trước, Basic sau
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOCODB_API_URL = "https://db.hpb.edu.vn";
const NOCODB_API_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";

const TABLES = {
    GOLDEN_RULE_SETS: "mw5q8k3h7g2l1p9", // TODO: Create this table
    CAMPAIGN_LABEL_ASSIGNMENTS: "myjgw4ial5s6zrw",
    FACEBOOK_INSIGHTS: "m17gyigy8jqlaoz",
    SALES_REPORTS: "me14lqzoxj5xwar",
    AUTOMATION_RULE_EXECUTION_LOGS: "masstbinn3h8hkr",
};

// =============================================================================
// TYPES
// =============================================================================

interface RuleCondition {
    id: string;
    metric: string;
    operator: string;
    value: number;
}

interface RuleAction {
    id: string;
    type: string;
    value?: number | string;
    budgetMode?: "percentage" | "absolute";
    autoRevert?: boolean;
    revertAtTime?: string;
    revertAfterHours?: number;
}

interface BasicRule {
    id: string;
    name: string;
    conditions: RuleCondition[];
    condition_logic: "all" | "any";
    action: RuleAction;
}

interface AdvancedOverride {
    id: string;
    name: string;
    conditions: RuleCondition[];
    condition_logic: "all" | "any";
    blocks_actions: string[];
    reason?: string;
}

interface GoldenRuleSet {
    Id: number;
    id: string;
    user_id: string;
    name: string;
    scope: string;
    time_range: string;
    target_labels: (string | number)[];
    basic_rules: BasicRule[];
    advanced_overrides: AdvancedOverride[];
    is_active: boolean;
}

interface ExecutionResult {
    objectId: string;
    objectName: string;
    level: string;
    matchedBasicRule?: { id: string; name: string; action: string };
    blockedBy?: { id: string; name: string; reason?: string };
    result: "executed" | "blocked" | "skipped";
    finalAction?: string;
    details?: string;
    timestamp: string;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { ruleSetId, userId, accessToken } = await req.json();

        if (!ruleSetId || !userId || !accessToken) {
            return new Response(
                JSON.stringify({ error: "Missing required parameters" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
        }

        console.log(`🥇 Executing Golden Rule Set: ${ruleSetId}`);

        // 1. Fetch the rule set
        const ruleSet = await fetchGoldenRuleSet(ruleSetId);
        if (!ruleSet) {
            return new Response(
                JSON.stringify({ error: "Rule set not found" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
            );
        }

        if (!ruleSet.is_active) {
            return new Response(
                JSON.stringify({ message: "Rule set is inactive", skipped: true }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 2. Get date range
        const { dateStart, dateEnd } = getDateRange(ruleSet.time_range);

        // 3. Fetch objects with target labels
        const objects = await fetchObjectsWithLabels(
            ruleSet.scope,
            ruleSet.target_labels,
            userId,
            dateStart,
            dateEnd
        );

        console.log(`📊 Found ${objects.length} objects with target labels`);

        if (objects.length === 0) {
            return new Response(
                JSON.stringify({ message: "No objects matched target labels", executed: 0 }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 4. Enrich with sales metrics (for advanced overrides)
        const enrichedObjects = await enrichWithSalesMetrics(
            objects,
            ruleSet.scope,
            dateStart,
            dateEnd
        );

        // 5. Execute golden rule logic
        const results: ExecutionResult[] = [];

        for (const obj of enrichedObjects) {
            const result = await executeGoldenRuleForObject(
                ruleSet,
                obj,
                accessToken
            );
            if (result) {
                results.push(result);
            }
        }

        // 6. Log execution
        await logExecution(ruleSet, results, userId);

        // 7. Update last run timestamp
        await updateLastRun(ruleSet.Id);

        const executedCount = results.filter((r) => r.result === "executed").length;
        const blockedCount = results.filter((r) => r.result === "blocked").length;

        console.log(`✅ Execution complete: ${executedCount} executed, ${blockedCount} blocked`);

        return new Response(
            JSON.stringify({
                success: true,
                ruleSetName: ruleSet.name,
                totalObjects: objects.length,
                executed: executedCount,
                blocked: blockedCount,
                skipped: results.filter((r) => r.result === "skipped").length,
                results,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("❌ Error executing golden rule set:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
    }
});

// =============================================================================
// CORE LOGIC: Execute Golden Rule for a single object
// =============================================================================

async function executeGoldenRuleForObject(
    ruleSet: GoldenRuleSet,
    obj: any,
    accessToken: string
): Promise<ExecutionResult | null> {
    const result: ExecutionResult = {
        objectId: obj.id,
        objectName: obj.name,
        level: ruleSet.scope,
        result: "skipped",
        timestamp: new Date().toISOString(),
    };

    // STEP 1: Check ALL advanced overrides first
    const blockedActions = new Set<string>();
    const activeOverrides: { override: AdvancedOverride; matched: boolean }[] = [];

    for (const override of ruleSet.advanced_overrides || []) {
        const matched = evaluateConditions(obj, override.conditions, override.condition_logic);
        activeOverrides.push({ override, matched });

        if (matched) {
            console.log(`🛡️ Override "${override.name}" matched for ${obj.name}`);
            override.blocks_actions.forEach((action) => blockedActions.add(action));
        }
    }

    // STEP 2: Check basic rules and execute (respecting blocked actions)
    for (const rule of ruleSet.basic_rules || []) {
        const matched = evaluateConditions(obj, rule.conditions, rule.condition_logic);

        if (!matched) continue;

        result.matchedBasicRule = {
            id: rule.id,
            name: rule.name,
            action: rule.action.type,
        };

        // Check if action is blocked
        if (blockedActions.has(rule.action.type)) {
            const blockingOverrides = activeOverrides
                .filter((ao) => ao.matched && ao.override.blocks_actions.includes(rule.action.type))
                .map((ao) => ao.override);

            result.result = "blocked";
            result.blockedBy = {
                id: blockingOverrides[0]?.id || "unknown",
                name: blockingOverrides[0]?.name || "Unknown Override",
                reason: blockingOverrides[0]?.reason,
            };
            result.details = `Action "${rule.action.type}" blocked by override: ${result.blockedBy.name}`;

            console.log(`🚫 ${obj.name}: ${result.details}`);
            return result;
        }

        // Execute the action
        try {
            await executeAction(rule.action, obj.id, accessToken, ruleSet.scope);
            result.result = "executed";
            result.finalAction = rule.action.type;
            result.details = `Executed "${rule.action.type}" from rule "${rule.name}"`;

            console.log(`✅ ${obj.name}: ${result.details}`);
        } catch (error) {
            result.result = "skipped";
            result.details = `Failed to execute: ${error.message}`;
            console.error(`❌ ${obj.name}: ${result.details}`);
        }

        return result; // Only execute first matching rule
    }

    // No rule matched
    result.details = "No basic rule conditions matched";
    return result;
}

// =============================================================================
// HELPERS
// =============================================================================

function getNocoDBHeaders() {
    return {
        "xc-token": NOCODB_API_TOKEN,
        "Content-Type": "application/json",
    };
}

async function fetchGoldenRuleSet(ruleSetId: string | number): Promise<GoldenRuleSet | null> {
    try {
        const url = `${NOCODB_API_URL}/api/v2/tables/${TABLES.GOLDEN_RULE_SETS}/records/${ruleSetId}`;
        const response = await fetch(url, { headers: getNocoDBHeaders() });

        if (!response.ok) return null;

        const record = await response.json();
        return parseGoldenRuleSet(record);
    } catch (error) {
        console.error("Error fetching rule set:", error);
        return null;
    }
}

function parseGoldenRuleSet(record: any): GoldenRuleSet {
    const parseJSON = (val: any, fallback: any) => {
        if (!val) return fallback;
        if (typeof val === "object") return val;
        try {
            return JSON.parse(val);
        } catch {
            return fallback;
        }
    };

    return {
        Id: record.Id,
        id: record.id || String(record.Id),
        user_id: record.user_id,
        name: record.name,
        scope: record.scope || "adset",
        time_range: record.time_range || "today",
        target_labels: parseJSON(record.target_labels, []),
        basic_rules: parseJSON(record.basic_rules, []),
        advanced_overrides: parseJSON(record.advanced_overrides, []),
        is_active: record.is_active ?? true,
    };
}

function getDateRange(timeRange: string): { dateStart: string; dateEnd: string } {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const dateMap: Record<string, () => { dateStart: string; dateEnd: string }> = {
        today: () => ({ dateStart: today, dateEnd: today }),
        yesterday: () => {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            return { dateStart: yesterday.toISOString().split("T")[0], dateEnd: yesterday.toISOString().split("T")[0] };
        },
        "7_days": () => {
            const start = new Date(now);
            start.setDate(start.getDate() - 6);
            return { dateStart: start.toISOString().split("T")[0], dateEnd: today };
        },
        "14_days": () => {
            const start = new Date(now);
            start.setDate(start.getDate() - 13);
            return { dateStart: start.toISOString().split("T")[0], dateEnd: today };
        },
        "30_days": () => {
            const start = new Date(now);
            start.setDate(start.getDate() - 29);
            return { dateStart: start.toISOString().split("T")[0], dateEnd: today };
        },
    };

    return (dateMap[timeRange] || dateMap.today)();
}

async function fetchObjectsWithLabels(
    scope: string,
    targetLabels: (string | number)[],
    userId: string,
    dateStart: string,
    dateEnd: string
): Promise<any[]> {
    // Fetch label assignments
    const labelIds = targetLabels.map(String).join(",");
    const assignUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLES.CAMPAIGN_LABEL_ASSIGNMENTS}/records?where=(label_id,in,${labelIds})~and(user_id,eq,${userId})`;

    const assignResponse = await fetch(assignUrl, { headers: getNocoDBHeaders() });
    if (!assignResponse.ok) return [];

    const assignData = await assignResponse.json();
    const assignments = assignData.list || [];

    // Get unique object IDs based on scope
    const objectIdField = scope === "campaign" ? "campaign_id" : scope === "adset" ? "adset_id" : "ad_id";
    const objectIds = [...new Set(assignments.map((a: any) => a[objectIdField]).filter(Boolean))];

    if (objectIds.length === 0) return [];

    // Fetch insights for those objects
    const idsFilter = objectIds.map((id) => `(${objectIdField},eq,${id})`).join("~or");
    const insightsUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLES.FACEBOOK_INSIGHTS}/records?where=(${idsFilter})~and(date_start,gte,${dateStart})~and(date_start,lte,${dateEnd})`;

    const insightsResponse = await fetch(insightsUrl, { headers: getNocoDBHeaders() });
    if (!insightsResponse.ok) return [];

    const insightsData = await insightsResponse.json();
    return aggregateByScope(insightsData.list || [], scope, objectIdField);
}

function aggregateByScope(insights: any[], scope: string, idField: string): any[] {
    const grouped = new Map<string, any>();

    for (const row of insights) {
        const id = row[idField];
        if (!id) continue;

        if (!grouped.has(id)) {
            grouped.set(id, {
                id,
                name: row[`${scope}_name`] || id,
                spend: 0,
                results: 0,
                impressions: 0,
                clicks: 0,
                reach: 0,
            });
        }

        const agg = grouped.get(id)!;
        // NocoDB stores spend in cents, divide by 100
        agg.spend += (parseFloat(row.spend) || 0) / 100;
        agg.results += parseInt(row.results) || 0;
        agg.impressions += parseInt(row.impressions) || 0;
        agg.clicks += parseInt(row.clicks) || 0;
        agg.reach += parseInt(row.reach) || 0;
    }

    // Calculate derived metrics
    return Array.from(grouped.values()).map((obj) => ({
        ...obj,
        cost_per_result: obj.results > 0 ? obj.spend / obj.results : 0,
        cpm: obj.impressions > 0 ? (obj.spend / obj.impressions) * 1000 : 0,
        ctr: obj.impressions > 0 ? (obj.clicks / obj.impressions) * 100 : 0,
        frequency: obj.reach > 0 ? obj.impressions / obj.reach : 0,
    }));
}

async function enrichWithSalesMetrics(
    objects: any[],
    scope: string,
    dateStart: string,
    dateEnd: string
): Promise<any[]> {
    // Fetch sales data
    const salesUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLES.SALES_REPORTS}/records?where=(report_date,gte,${dateStart})~and(report_date,lte,${dateEnd})`;

    const salesResponse = await fetch(salesUrl, { headers: getNocoDBHeaders() });
    if (!salesResponse.ok) return objects;

    const salesData = await salesResponse.json();
    const salesRecords = salesData.list || [];

    // Group sales by object ID
    const idField = scope === "campaign" ? "campaign_id" : scope === "adset" ? "adset_id" : "ad_id";
    const salesByObject = new Map<string, { phone_count: number; booking_count: number; revenue: number }>();

    for (const sale of salesRecords) {
        const objectId = sale[idField];
        if (!objectId) continue;

        if (!salesByObject.has(objectId)) {
            salesByObject.set(objectId, { phone_count: 0, booking_count: 0, revenue: 0 });
        }

        const agg = salesByObject.get(objectId)!;
        if (sale.phone_number) agg.phone_count++;
        if (sale.appointment_status === "Đã đặt lịch" || sale.appointment_status === "Đã hoàn thành") {
            agg.booking_count++;
        }
        agg.revenue += parseFloat(sale.total_revenue) || parseFloat(sale.service_revenue) || 0;
    }

    // Enrich objects with sales metrics
    return objects.map((obj) => {
        const sales = salesByObject.get(obj.id) || { phone_count: 0, booking_count: 0, revenue: 0 };
        const results = obj.results || 1; // Avoid division by zero

        return {
            ...obj,
            // Count metrics
            phone_count: sales.phone_count,
            booking_count: sales.booking_count,
            revenue: sales.revenue,
            // Rate metrics
            sdt_rate: results > 0 ? (sales.phone_count / results) * 100 : 0,
            booking_rate: sales.phone_count > 0 ? (sales.booking_count / sales.phone_count) * 100 : 0,
            roas: obj.spend > 0 ? sales.revenue / obj.spend : 0,
            roi: obj.spend > 0 ? ((sales.revenue - obj.spend) / obj.spend) * 100 : 0,
        };
    });
}

function evaluateConditions(
    obj: any,
    conditions: RuleCondition[],
    logic: "all" | "any"
): boolean {
    if (!conditions || conditions.length === 0) return false;

    const results = conditions.map((cond) => {
        const actualValue = obj[cond.metric] ?? 0;
        return evaluateSingleCondition(actualValue, cond.operator, cond.value);
    });

    return logic === "all" ? results.every(Boolean) : results.some(Boolean);
}

function evaluateSingleCondition(
    actual: number,
    operator: string,
    threshold: number
): boolean {
    switch (operator) {
        case "greater_than":
            return actual > threshold;
        case "less_than":
            return actual < threshold;
        case "equals":
            return actual === threshold;
        case "greater_than_or_equal":
            return actual >= threshold;
        case "less_than_or_equal":
            return actual <= threshold;
        case "not_equals":
            return actual !== threshold;
        default:
            return false;
    }
}

async function executeAction(
    action: RuleAction,
    objectId: string,
    accessToken: string,
    scope: string
): Promise<void> {
    const graphUrl = `https://graph.facebook.com/v21.0/${objectId}`;

    let payload: any = {};

    switch (action.type) {
        case "turn_off":
            payload = { status: "PAUSED" };
            break;
        case "turn_on":
            payload = { status: "ACTIVE" };
            break;
        case "increase_budget":
        case "decrease_budget":
            // Would need to fetch current budget first
            // For now, skip budget changes in this basic implementation
            console.log(`Budget change action "${action.type}" - needs implementation`);
            return;
        default:
            console.log(`Action "${action.type}" not implemented`);
            return;
    }

    const response = await fetch(`${graphUrl}?access_token=${accessToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Facebook API error: ${error}`);
    }
}

async function logExecution(
    ruleSet: GoldenRuleSet,
    results: ExecutionResult[],
    userId: string
): Promise<void> {
    try {
        const logEntry = {
            rule_id: ruleSet.Id,
            rule_name: `🥇 ${ruleSet.name}`,
            user_id: userId,
            execution_type: "golden_rule_set",
            total_objects: results.length,
            executed_count: results.filter((r) => r.result === "executed").length,
            blocked_count: results.filter((r) => r.result === "blocked").length,
            status: "success",
            details: JSON.stringify(results.slice(0, 20)), // Limit to first 20 results
            executed_at: new Date().toISOString(),
        };

        await fetch(`${NOCODB_API_URL}/api/v2/tables/${TABLES.AUTOMATION_RULE_EXECUTION_LOGS}/records`, {
            method: "POST",
            headers: getNocoDBHeaders(),
            body: JSON.stringify(logEntry),
        });
    } catch (error) {
        console.error("Error logging execution:", error);
    }
}

async function updateLastRun(ruleSetId: number): Promise<void> {
    try {
        await fetch(`${NOCODB_API_URL}/api/v2/tables/${TABLES.GOLDEN_RULE_SETS}/records`, {
            method: "PATCH",
            headers: getNocoDBHeaders(),
            body: JSON.stringify({
                Id: ruleSetId,
                last_run_at: new Date().toISOString(),
            }),
        });
    } catch (error) {
        console.error("Error updating last run:", error);
    }
}
