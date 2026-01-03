/**
 * 🧠 Smart Rule Parser Service
 * 
 * Parses Vietnamese rule input into structured JSON.
 * Auto-detects conditions, actions, and steps from flexible input.
 */

// =============================================================================
// 📊 TYPES
// =============================================================================

export interface ParsedCondition {
    id: string;
    metric: string;
    operator: string;
    value: number;
}

export interface ParsedAction {
    id: string;
    type: 'turn_off' | 'turn_on' | 'increase_budget' | 'decrease_budget';
    value?: number;
}

export interface ParsedStep {
    id: string;
    order: number;
    logic: 'OR' | 'AND';
    conditions: ParsedCondition[];
    conditionLogic: 'all' | 'any';
    action: ParsedAction;
}

export interface ParsedRule {
    labelName?: string;
    ruleName?: string;
    scope?: 'campaign' | 'adset' | 'ad';
    timeRange?: string;
    conditions: ParsedCondition[];
    conditionLogic: 'all' | 'any';
    actions: ParsedAction[];
    steps: ParsedStep[];
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

// =============================================================================
// 🔍 METRIC PATTERNS
// =============================================================================

// =============================================================================
// 🔍 METRIC PATTERNS
// =============================================================================

// ⚠️ ORDER MATTERS: Specific metrics must come before generic ones
// e.g. "Chi phí/Kết quả" must be checked before "Kết quả"
const METRIC_MAP: Record<string, RegExp> = {
    // Specific Cost Metrics
    cost_per_result: /(?:chi phí\/kết quả|cpr|giá\/kết quả|chi phí mỗi kết quả)/i,
    cost_per_phone: /(?:chi phí\/sđt|chi phí mỗi sđt|giá\/sđt)/i,
    cost_per_appointment: /(?:chi phí\/lịch hẹn|chi phí mỗi lịch hẹn)/i,
    cost_per_service_revenue: /(?:chi phí\/doanh thu dịch vụ)/i,

    // Ratios
    marketing_revenue_ratio: /(?:chi phí mkt\/doanh thu|tỉ lệ chi phí mkt|% chi phí mkt)/i,
    marketing_service_ratio: /(?:chi phí mkt\/doanh thu dv)/i,
    sdt_rate: /(?:tỉ lệ sđt|phone rate|%.*sđt|tỉ lệ có sđt)/i, // Was phone_rate
    booking_rate: /(?:tỉ lệ đặt lịch|booking rate|%.*đặt lịch)/i,
    revenue_rate: /(?:% doanh thu|tỉ lệ doanh thu)/i,

    // Standard Metrics
    spend: /(?:chi tiêu|tiêu|spend|chi phí(?!\/))/i,
    results: /(?:kết quả|result(?!s)|chuyển đổi|đơn hàng)/i,
    phone_count: /(?:số sđt|số điện thoại|phone count)/i,

    // Facebook Metrics
    cpm: /(?:cpm|chi phí 1000)/i,
    cpc: /(?:cpc|chi phí mỗi click)/i,
    ctr: /(?:ctr|tỉ lệ click)/i,
    frequency: /(?:tần suất|frequency)/i,
    reach: /(?:tiếp cận|reach)/i,
    impressions: /(?:hiển thị|impressions)/i,
    clicks: /(?:lượt click|clicks)/i,

    // Other
    roi: /(?:roi)/i,
    roas: /(?:roas)/i,
};

// =============================================================================
// 🔀 OPERATOR PATTERNS
// =============================================================================

const OPERATOR_MAP: Record<string, RegExp> = {
    greater_than_or_equal: /(?:>=|≥|từ.*trở lên|lớn hơn hoặc bằng)/,
    less_than_or_equal: /(?:<=|≤|từ.*trở xuống|nhỏ hơn hoặc bằng)/,
    greater_than: /(?:>(?!=)|lớn hơn(?! hoặc))/,
    less_than: /(?:<(?!=)|nhỏ hơn(?! hoặc))/,
    equals: /(?:=(?![>=<])|bằng(?! hoặc)|==|là)/,
};

// =============================================================================
// 🎬 ACTION PATTERNS
// =============================================================================

const ACTION_MAP: Record<string, RegExp> = {
    turn_off: /(?:tắt|off|dừng|stop)/i,
    turn_on: /(?:bật|on|mở|start)/i,
    increase_budget: /(?:tăng.*?(\d+)%|tăng ngân sách.*?(\d+)|scale.*?(\d+))/i,
    decrease_budget: /(?:giảm.*?(\d+)%|giảm ngân sách.*?(\d+))/i,
};

// =============================================================================
// 🔢 VALUE PARSING
// =============================================================================

function parseValue(text: string): number | null {
    // Remove spaces and normalize
    const cleaned = text.replace(/\s/g, '').replace(/,/g, '.');

    // Match patterns like: 100k, 100.000, 100000, 30%, 1tr, 1triệu
    const match = cleaned.match(/([\d.]+)\s*(k|tr|triệu|%)?/i);
    if (!match) return null;

    let value = parseFloat(match[1]);
    const unit = match[2]?.toLowerCase();

    if (unit === 'k') value *= 1000;
    else if (unit === 'tr' || unit === 'triệu') value *= 1000000;
    // % stays as-is (30% = 30)

    return value;
}

// =============================================================================
// 📝 LINE TYPE DETECTION
// =============================================================================

type LineType = 'label' | 'rule_name' | 'scope' | 'time_range' | 'condition' | 'action' | 'separator' | 'unknown';

interface DetectedLine {
    type: LineType;
    raw: string;
    data?: any;
}

function detectLineType(line: string): DetectedLine {
    let trimmed = line.trim();
    if (!trimmed) return { type: 'unknown', raw: line };

    // Remove numbering (1., 2:, 7 )
    // Supports: "1.", "1:", "1 " at start of line
    trimmed = trimmed.replace(/^\d+[:.)]?\s+/, '').trim();

    // Check for separators
    if (/^hoặc$/i.test(trimmed)) {
        return { type: 'separator', raw: line, data: 'OR' };
    }

    // Check for label name
    if (/^(?:tên nhãn|nhãn)\s*:/i.test(trimmed)) {
        const value = trimmed.replace(/^(?:tên nhãn|nhãn)\s*:\s*/i, '').trim();
        return { type: 'label', raw: line, data: value };
    }

    // Check for rule name
    if (/^(?:tên quy tắc|quy tắc)\s*:/i.test(trimmed)) {
        const value = trimmed.replace(/^(?:tên quy tắc|quy tắc)\s*:\s*/i, '').trim();
        return { type: 'rule_name', raw: line, data: value };
    }

    // Check for scope
    if (/^(?:phạm vi|cấp|scope)\s*:/i.test(trimmed)) {
        const value = trimmed.replace(/^(?:phạm vi|cấp|scope)\s*:\s*/i, '').trim().toLowerCase();
        let scope: 'campaign' | 'adset' | 'ad' = 'adset';
        if (/chiến dịch|campaign/i.test(value)) scope = 'campaign';
        else if (/nhóm quảng cáo|adset|ad set/i.test(value)) scope = 'adset';
        else if (/quảng cáo|ad/i.test(value)) scope = 'ad';
        return { type: 'scope', raw: line, data: scope };
    }

    // Check for time range
    if (/^(?:khung thời gian|thời gian|time)\s*:/i.test(trimmed)) {
        const value = trimmed.replace(/^(?:khung thời gian|thời gian|time)\s*:\s*/i, '').trim().toLowerCase();
        let timeRange = 'today';
        if (/hôm nay|today/i.test(value)) timeRange = 'today';
        else if (/hôm qua|yesterday/i.test(value)) timeRange = 'yesterday';
        else if (/7 ngày|7_days/i.test(value)) timeRange = '7_days';
        else if (/14 ngày|14_days/i.test(value)) timeRange = '14_days';
        else if (/30 ngày|30_days/i.test(value)) timeRange = '30_days';
        return { type: 'time_range', raw: line, data: timeRange };
    }

    // Check for action
    if (/^hành động\s*:/i.test(trimmed) || /^→/i.test(trimmed)) {
        const actionText = trimmed.replace(/^(?:hành động\s*:|→)\s*/i, '').trim();
        const action = parseActionText(actionText);
        if (action) {
            return { type: 'action', raw: line, data: action };
        }
    }

    // Check for condition (has metric + operator + value)
    const condition = parseConditionText(trimmed);
    if (condition) {
        return { type: 'condition', raw: line, data: condition };
    }

    return { type: 'unknown', raw: line };
}

// =============================================================================
// 🔧 PARSE CONDITION TEXT
// =============================================================================

function parseConditionText(text: string): ParsedCondition | null {
    // Remove "NẾU:", "Điều kiện:" prefixes if present
    let cleaned = text.replace(/^(?:nếu|điều kiện)\s*:?\s*/i, '').trim();

    // Skip if this is a number prefix like "1:" or "2:"
    if (/^\d+\s*[:.]/.test(cleaned)) {
        cleaned = cleaned.replace(/^\d+\s*[:.]?\s*/, '');
    }

    // Find metric
    let foundMetric: string | null = null;
    for (const [metric, pattern] of Object.entries(METRIC_MAP)) {
        if (pattern.test(cleaned)) {
            foundMetric = metric;
            break;
        }
    }
    if (!foundMetric) return null;

    // Find operator
    let foundOperator: string | null = null;
    let operatorMatch: RegExpMatchArray | null = null;
    for (const [operator, pattern] of Object.entries(OPERATOR_MAP)) {
        operatorMatch = cleaned.match(pattern);
        if (operatorMatch) {
            foundOperator = operator;
            break;
        }
    }
    if (!foundOperator || !operatorMatch) return null;

    // Extract value AFTER the operator
    const operatorIndex = cleaned.indexOf(operatorMatch[0]);
    const afterOperator = cleaned.slice(operatorIndex + operatorMatch[0].length).trim();

    // Match value with unit: 100k, 100.000, 30%, etc
    const valueMatch = afterOperator.match(/^([\d.,]+)\s*(k|tr|triệu|%)?/i);
    if (!valueMatch) return null;

    // Parse value
    let valueStr = valueMatch[1].replace(/\./g, '').replace(/,/g, '.');
    let value = parseFloat(valueStr);

    const unit = valueMatch[2]?.toLowerCase();
    if (unit === 'k') value *= 1000;
    else if (unit === 'tr' || unit === 'triệu') value *= 1000000;
    // % stays as-is

    if (isNaN(value)) return null;

    return {
        id: crypto.randomUUID(),
        metric: foundMetric,
        operator: foundOperator,
        value,
    };
}

// =============================================================================
// 🎬 PARSE ACTION TEXT
// =============================================================================

function parseActionText(text: string): ParsedAction | null {
    const cleaned = text.toLowerCase().trim();

    // Turn off
    if (/tắt|off|dừng|stop/i.test(cleaned)) {
        return { id: crypto.randomUUID(), type: 'turn_off' };
    }

    // Turn on
    if (/bật|on|mở|start/i.test(cleaned)) {
        return { id: crypto.randomUUID(), type: 'turn_on' };
    }

    // Increase budget
    const increaseMatch = cleaned.match(/tăng.*?(\d+)/);
    if (increaseMatch) {
        return {
            id: crypto.randomUUID(),
            type: 'increase_budget',
            value: parseInt(increaseMatch[1])
        };
    }

    // Decrease budget
    const decreaseMatch = cleaned.match(/giảm.*?(\d+)/);
    if (decreaseMatch) {
        return {
            id: crypto.randomUUID(),
            type: 'decrease_budget',
            value: parseInt(decreaseMatch[1])
        };
    }

    return null;
}

// =============================================================================
// 🚀 MAIN PARSE FUNCTION
// =============================================================================

// =============================================================================
// 🚀 MAIN PARSE FUNCTION
// =============================================================================

export function parseRuleInput(input: string): ParsedRule {
    // Pre-process: Split by newline
    let rawLines = input.split('\n');

    // Process lines: clean numbering (1:, 2.) and split by "VÀ"
    let processedLines: string[] = [];
    for (let line of rawLines) {
        line = line.trim();
        if (!line) continue;

        // Remove numbering prefixes like "1.", "2:", "1 "
        line = line.replace(/^\d+[:.)]\s*/, '');

        // Skip splitting if it looks like a name, label, action, or scope
        // These usually don't contain "VÀ" as a separator for multiple items we care about splitting in this way
        if (/^(?:tên|nhãn|hành động|phạm vi|action|name|label|scope)/i.test(line)) {
            processedLines.push(line);
            continue;
        }

        // Check for "HOẶC" line - simplify it
        if (/^hoặc$/i.test(line) || /^or$/i.test(line)) {
            processedLines.push('HOẶC');
            continue;
        }

        // Split by "VÀ" or "AND" inside the line (careful not to split inside a name if possible, but for conditions it's safe)
        // Only split if we see operators or metrics on both sides? No, simple split is safer for now for "Cond1 VÀ Cond2"
        if (/\s+(?:và|and)\s+/i.test(line)) {
            const parts = line.split(/\s+(?:và|and)\s+/i);
            processedLines.push(...parts);
        } else {
            processedLines.push(line);
        }
    }

    const detectedLines = processedLines.map(detectLineType);

    const result: ParsedRule = {
        conditions: [],
        conditionLogic: 'all',
        actions: [],
        steps: [],
    };

    let currentConditions: ParsedCondition[] = [];
    let currentAction: ParsedAction | null = null;
    let stepOrder = 0;

    // Helper to finalize a step
    const finalizeStep = (isOrSeparator: boolean) => {
        if (currentConditions.length > 0 && currentAction) {
            // Check if this is the very first step found
            if (result.conditions.length === 0 && result.actions.length === 0) {
                // First step - set as main conditions/actions ONLY
                result.conditions = [...currentConditions];
                result.actions = [currentAction];
            } else {
                // Subsequent steps - add to steps array
                result.steps.push({
                    id: crypto.randomUUID(),
                    order: stepOrder + 1, // This will be 2, 3... or just sequential ID
                    logic: 'OR',
                    conditions: [...currentConditions],
                    conditionLogic: 'all',
                    action: currentAction,
                });
            }
            stepOrder++;
            currentConditions = [];
            currentAction = null;
        }
    };

    for (const detected of detectedLines) {
        switch (detected.type) {
            case 'label':
                result.labelName = detected.data;
                break;

            case 'rule_name':
                result.ruleName = detected.data;
                break;

            case 'scope':
                result.scope = detected.data;
                break;

            case 'time_range':
                result.timeRange = detected.data;
                break;

            case 'condition':
                currentConditions.push(detected.data);
                break;

            case 'action':
                // multiple actions in one step? Currently logic assumes 1 action per step usually.
                // If we already have an action, maybe overwrite or support multiple?
                // For simplified flow, let's assume valid rule sequence is Conditions -> Action
                if (currentAction) {
                    // We already had an action, maybe the previous step ended implicitly?
                    // Or maybe multiple actions. usageRuleFlow only supports 1 action per step widely.
                    // Let's assume implied step end if new action appears
                    if (currentConditions.length > 0) {
                        finalizeStep(false);
                    }
                }
                currentAction = detected.data;
                break;

            case 'separator':
                // HOẶC detected explicitly
                finalizeStep(true);
                break;
        }
    }

    // Handle any remaining content as the last step
    finalizeStep(false);

    // Fallback: If no steps created but we have conditions (maybe missing action?), put them in main
    if (result.steps.length === 0 && currentConditions.length > 0) {
        result.conditions = [...currentConditions];
    }

    return result;
}

// =============================================================================
// ✅ VALIDATION
// =============================================================================

export function validateParsedRule(rule: ParsedRule): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (rule.steps.length === 0) {
        errors.push('Không tìm thấy bước nào. Cần có ít nhất 1 điều kiện và 1 hành động.');
    }

    for (let i = 0; i < rule.steps.length; i++) {
        const step = rule.steps[i];

        if (step.conditions.length === 0) {
            errors.push(`Bước ${i + 1}: Thiếu điều kiện`);
        }

        if (!step.action) {
            errors.push(`Bước ${i + 1}: Thiếu hành động`);
        }

        // Validate budget actions have value
        if (step.action &&
            (step.action.type === 'increase_budget' || step.action.type === 'decrease_budget') &&
            !step.action.value) {
            errors.push(`Bước ${i + 1}: Hành động ${step.action.type} cần có giá trị %`);
        }
    }

    // Warnings
    if (!rule.labelName) {
        warnings.push('Chưa có tên nhãn - sẽ tạo nhãn mới');
    }

    if (!rule.ruleName) {
        warnings.push('Chưa có tên quy tắc - sẽ tự động đặt tên');
    }

    if (!rule.scope) {
        warnings.push('Chưa chọn phạm vi - mặc định là Nhóm quảng cáo');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

// =============================================================================
// 📊 FORMAT FOR DISPLAY
// =============================================================================

const METRIC_LABELS: Record<string, string> = {
    spend: 'Chi tiêu',
    results: 'Kết quả',
    cost_per_result: 'Chi phí/Kết quả',
    phone_count: 'Số SĐT',
    phone_rate: 'Tỉ lệ SĐT',
    booking_rate: 'Tỉ lệ Đặt lịch',
    cpm: 'CPM',
    cpc: 'CPC',
    ctr: 'CTR',
    frequency: 'Tần suất',
};

const OPERATOR_LABELS: Record<string, string> = {
    greater_than: '>',
    less_than: '<',
    equals: '=',
    greater_than_or_equal: '>=',
    less_than_or_equal: '<=',
};

const ACTION_LABELS: Record<string, string> = {
    turn_off: 'Tắt',
    turn_on: 'Bật',
    increase_budget: 'Tăng ngân sách',
    decrease_budget: 'Giảm ngân sách',
};

export function formatParsedRuleForDisplay(rule: ParsedRule): string {
    let output = '';

    if (rule.labelName) output += `🏷️ **Tên nhãn**: ${rule.labelName}\n`;
    if (rule.ruleName) output += `📌 **Tên quy tắc**: ${rule.ruleName}\n`;
    const scopeName = rule.scope === 'campaign' ? 'Chiến dịch' : rule.scope === 'adset' ? 'Nhóm QC' : 'Quảng cáo';
    if (rule.scope) output += `🎯 **Phạm vi**: ${scopeName}\n`;
    output += '\n';

    // ✅ Display Step 1 (Main Conditions/Actions)
    if (rule.conditions.length > 0) {
        output += `**Bước 1**:\n`;
        output += `➤ Điều kiện:\n`;
        rule.conditions.forEach(c => {
            const metricLabel = METRIC_LABELS[c.metric] || c.metric;
            const opLabel = OPERATOR_LABELS[c.operator] || c.operator;
            output += `  - ${metricLabel} ${opLabel} ${c.value.toLocaleString()}\n`;
        });

        if (rule.actions.length > 0) {
            const action = rule.actions[0];
            const actionLabel = ACTION_LABELS[action.type] || action.type;
            const valueStr = action.value ? ` ${action.value}%` : '';
            output += `➤ Hành động: ${actionLabel}${valueStr}\n`;
        }
    }

    // ✅ Display Subsequent Steps
    rule.steps.forEach((step, index) => {
        output += `\n**HOẶC**\n\n`;
        // Index is 0-based in array, but physically it's Step 2, 3...
        // So Step ID should be index + 2
        output += `**Bước ${index + 2}**:\n`;
        output += `➤ Điều kiện:\n`;

        step.conditions.forEach(c => {
            const metricLabel = METRIC_LABELS[c.metric] || c.metric;
            const opLabel = OPERATOR_LABELS[c.operator] || c.operator;
            output += `  - ${metricLabel} ${opLabel} ${c.value.toLocaleString()}\n`;
        });

        if (step.action) {
            const actionLabel = ACTION_LABELS[step.action.type] || step.action.type;
            const valueStr = step.action.value ? ` ${step.action.value}%` : '';
            output += `➤ Hành động: ${actionLabel}${valueStr}\n`;
        }
    });

    return output;
}
