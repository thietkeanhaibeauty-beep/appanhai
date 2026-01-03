import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { AutomationRule, GoldenRuleSet, BasicRule, METRIC_LABELS, OPERATOR_LABELS } from '@/types/automationRules';
import { generateRuleFromInput } from '../services/ruleControl.service';
import { parseRuleInput, validateParsedRule, formatParsedRuleForDisplay, type ParsedRule } from '../services/ruleParser.service';
import { createRule } from '@/services/nocodb/automatedRulesService';
import { createLabel } from '@/services/nocodb/campaignLabelsService';
import { assignLabel } from '@/services/nocodb/campaignLabelAssignmentsService';

export type RuleFlowStage =
    | 'idle'
    | 'choosing_type'       // NEW: Choose Basic or Advanced
    | 'naming'
    | 'naming_label'        // New: Name the label
    | 'defining_logic'
    | 'defining_scope'
    | 'confirming'
    | 'creating'
    | 'post_create_options'
    | 'selecting_items'
    | 'applying_label'
    | 'done'
    | 'error';

// Type for rule creation result
type RuleType = 'single' | 'golden_set';

interface UseRuleFlowReturn {
    stage: RuleFlowStage;
    proposedRule: Partial<AutomationRule> | null;
    proposedGoldenRuleSet: Partial<GoldenRuleSet> | null;
    ruleType: RuleType;
    lastMessage: string;
    isLoading: boolean;
    createdLabelId: number | null;

    // Methods
    start: (input: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>) => Promise<{ message: string; stage: RuleFlowStage }>;
    selectBasicMode: () => void;      // NEW: Open manual dialog
    selectAdvancedMode: () => void;   // NEW: Placeholder for future
    handleInput: (input: string) => Promise<{ message: string; stage: RuleFlowStage }>;
    confirmAndCreate: () => Promise<boolean>;
    handlePostCreateOption: (option: 'continue' | 'cancel') => void;
    handleApplyLabel: (selectedIds: string[]) => Promise<string>;
    reset: () => void;
    setStage: (stage: RuleFlowStage) => void;
    setData: (data: Partial<AutomationRule>) => void;
    showBasicDialog: boolean;         // NEW: Flag to open dialog
    closeBasicDialog: () => void;     // NEW: Close dialog
}

export function useRuleFlow(): UseRuleFlowReturn {
    const { user } = useAuth();
    const [stage, setStage] = useState<RuleFlowStage>('idle');
    const [proposedRule, setProposedRule] = useState<Partial<AutomationRule> | null>(null);
    const [proposedGoldenRuleSet, setProposedGoldenRuleSet] = useState<Partial<GoldenRuleSet> | null>(null);
    const [ruleType, setRuleType] = useState<RuleType>('single');
    const [labelName, setLabelName] = useState<string>(''); // Store label name
    const [lastMessage, setLastMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [createdLabelId, setCreatedLabelId] = useState<number | null>(null);


    // Helper to update rule data
    const setData = useCallback((data: Partial<AutomationRule>) => {
        setProposedRule(prev => ({ ...prev, ...data }));
    }, []);

    // NEW: Flag to control dialog visibility
    const [showBasicDialog, setShowBasicDialog] = useState(false);

    // Step 1: Start Flow - Show Basic/Advanced options
    const start = useCallback(async (input: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []) => {
        if (!user?.id) throw new Error('Bạn chưa đăng nhập.');

        setIsLoading(true);
        setProposedRule({ user_id: user.id }); // Reset rule
        setProposedGoldenRuleSet(null);
        setRuleType('single');
        setLabelName('');
        setCreatedLabelId(null);
        setShowBasicDialog(false);

        // Show choosing_type stage with 2 options
        setStage('choosing_type');
        const msg = `Bạn hãy chọn 1 trong 2 loại sau:`;

        setLastMessage(msg);
        setIsLoading(false);

        return { message: msg, stage: 'choosing_type' as RuleFlowStage };
    }, [user]);

    // NEW: Select Basic Mode - Open manual dialog
    const selectBasicMode = useCallback(() => {
        setShowBasicDialog(true);
        setStage('idle'); // Reset stage
        setLastMessage('');
    }, []);

    // NEW: Select Advanced Mode - Placeholder
    const selectAdvancedMode = useCallback(() => {
        setStage('defining_logic');
        const msg = `🚀 **Chế độ Nâng cao**\n\n🔧 Tính năng đang phát triển...\n\nHiện tại bạn có thể sử dụng **Quy tắc Cơ bản** để tạo quy tắc thủ công.`;
        setLastMessage(msg);
    }, []);

    // NEW: Close Basic Dialog
    const closeBasicDialog = useCallback(() => {
        setShowBasicDialog(false);
    }, []);

    // Handle input based on current stage
    const handleInput = useCallback(async (input: string): Promise<{ message: string; stage: RuleFlowStage }> => {
        setIsLoading(true);

        try {
            // Step 2: Naming -> Naming Label
            if (stage === 'naming') {
                const name = input.trim();
                if (name.length < 3) {
                    const msg = "Tên quy tắc quá ngắn. Vui lòng đặt tên dài hơn (ít nhất 3 ký tự).";
                    setLastMessage(msg);
                    setIsLoading(false);
                    return { message: msg, stage: 'naming' };
                }

                setData({ rule_name: name });
                setStage('naming_label');
                const msg = `Tên quy tắc là "**${name}**".\n\nBạn muốn đặt tên cho **Nhãn** (Label) là gì?\n(Gõ tên nhãn hoặc gõ "Giống tên quy tắc" để dùng luôn tên quy tắc)`;
                setLastMessage(msg);
                setIsLoading(false);
                return { message: msg, stage: 'naming_label' };
            }

            // Step 3: Naming Label -> Scope
            if (stage === 'naming_label') {
                let lName = input.trim();
                if (lName.toLowerCase().includes('giống') || lName.toLowerCase() === 'ok' || lName === '') {
                    lName = proposedRule?.rule_name || "Quy tắc mới";
                }

                setLabelName(lName);
                setStage('defining_scope');
                const msg = `Đã đặt tên nhãn là "**${lName}**".\n\nBạn muốn áp dụng quy tắc này cho cấp độ nào?\n(Chiến dịch, Nhóm quảng cáo, hay Quảng cáo?)`;
                setLastMessage(msg);
                setIsLoading(false);
                return { message: msg, stage: 'defining_scope' };
            }

            // Step 4: Scope -> Logic
            if (stage === 'defining_scope') {
                let scope = 'adset';
                const lowerInput = input.toLowerCase();

                if (lowerInput.includes('chiến dịch') || lowerInput.includes('campaign')) scope = 'campaign';
                else if (lowerInput.includes('nhóm') || lowerInput.includes('adset')) scope = 'adset';
                else if (lowerInput.includes('quảng cáo') || lowerInput.includes('ad') || lowerInput.includes('bài viết')) scope = 'ad';
                else {
                    // Default to adset if unclear
                }

                setData({ scope: scope as any });
                setStage('defining_logic');

                const msg = `Đã chọn phạm vi: **${scope === 'campaign' ? 'Chiến dịch' : scope === 'adset' ? 'Nhóm quảng cáo' : 'Quảng cáo'}**.\n\n` +
                    `Quy tắc này hoạt động như thế nào? Bạn muốn điều kiện là gì và hành động ra sao?\n` +
                    `(Ví dụ: Nếu chi phí > 100k mà không ra đơn thì tắt)`;

                setLastMessage(msg);
                setIsLoading(false);
                return { message: msg, stage: 'defining_logic' };
            }

            // Step 5: Logic -> Confirm (USES FRONTEND PARSER FIRST)
            if (stage === 'defining_logic') {
                // 🚀 Try frontend parser first (faster, deterministic)
                console.log('[useRuleFlow] Parsing with frontend parser...');
                const parsed = parseRuleInput(input);
                const validation = validateParsedRule(parsed);

                console.log('[useRuleFlow] Parsed result:', parsed);
                console.log('[useRuleFlow] Validation:', validation);

                // If parser found valid steps
                if (validation.isValid && parsed.steps.length > 0) {
                    // Single step = single rule
                    if (parsed.steps.length === 1) {
                        setRuleType('single');
                        const step = parsed.steps[0];
                        const newRuleData = {
                            rule_name: parsed.ruleName || proposedRule?.rule_name,
                            scope: (parsed.scope || proposedRule?.scope || 'adset') as any,
                            time_range: (parsed.timeRange || 'today') as any,
                            conditions: step.conditions as any,
                            condition_logic: step.conditionLogic as any,
                            actions: [step.action] as any,
                        };

                        // Update label name if provided in input
                        if (parsed.labelName) {
                            setLabelName(parsed.labelName);
                        }

                        setData(newRuleData);
                        setStage('confirming');

                        const displayMsg = formatParsedRuleForDisplay(parsed);
                        const msg = `✅ Đã phân tích quy tắc thành công!\n\n${displayMsg}\n\nBạn có muốn lưu quy tắc này không? (Gõ "Ok" hoặc "Xác nhận")`;

                        setLastMessage(msg);
                        setIsLoading(false);
                        return { message: msg, stage: 'confirming' };
                    }

                    // Multiple steps = golden rule set
                    setRuleType('golden_set');

                    // Convert parsed steps to BasicRule format
                    const basicRules = parsed.steps.map((step, i) => ({
                        id: step.id,
                        name: `Bước ${i + 1}`,
                        priority: i + 1,
                        conditions: step.conditions as any,
                        condition_logic: step.conditionLogic,
                        action: step.action as any,
                    })) as BasicRule[];

                    const ruleSet: Partial<GoldenRuleSet> = {
                        name: parsed.ruleName || proposedRule?.rule_name,
                        scope: (parsed.scope || proposedRule?.scope || 'adset') as any,
                        time_range: (parsed.timeRange || 'today') as any,
                        user_id: user!.id,
                        basic_rules: basicRules,
                    };

                    // Update label name if provided
                    if (parsed.labelName) {
                        setLabelName(parsed.labelName);
                    }

                    setProposedGoldenRuleSet(ruleSet);
                    setStage('confirming');

                    const displayMsg = formatParsedRuleForDisplay(parsed);
                    const msg = `🥇 **Bộ quy tắc vàng** - ${parsed.steps.length} bước\n\n${displayMsg}\n\nBạn có muốn lưu bộ quy tắc này không? (Gõ "Ok" hoặc "Xác nhận")`;

                    setLastMessage(msg);
                    setIsLoading(false);
                    return { message: msg, stage: 'confirming' };
                }

                // If parser failed, show validation errors
                if (!validation.isValid) {
                    const errorMsg = validation.errors.join('\n- ');
                    const warningMsg = validation.warnings.length > 0
                        ? `\n\n⚠️ Lưu ý:\n- ${validation.warnings.join('\n- ')}`
                        : '';

                    const msg = `❌ Không thể phân tích quy tắc:\n- ${errorMsg}${warningMsg}\n\nVui lòng nhập đúng cấu trúc:\n\`\`\`\nNẾU: Chi tiêu > 100.000 VÀ Kết quả = 0\nHành động: Tắt\n\`\`\``;

                    setLastMessage(msg);
                    setIsLoading(false);
                    return { message: msg, stage: 'defining_logic' };
                }

                // Fallback: if parser didn't find anything, try AI
                console.log('[useRuleFlow] Parser found nothing, trying AI...');
                const result = await generateRuleFromInput(user!.id, input, []);

                if (result.error) {
                    const msg = `Tôi chưa hiểu rõ logic. ${result.error}. Vui lòng mô tả lại.`;
                    setLastMessage(msg);
                    setIsLoading(false);
                    return { message: msg, stage: 'defining_logic' };
                }

                // Handle SINGLE RULE from AI
                if (result.type === 'single_rule' && result.rule) {
                    setRuleType('single');
                    const newRuleData = {
                        ...result.rule,
                        rule_name: proposedRule?.rule_name || result.rule.rule_name,
                        scope: proposedRule?.scope || result.rule.scope,
                    };

                    setData(newRuleData);
                    setStage('confirming');

                    const conditionsStr = newRuleData.conditions?.map(c => {
                        const metricLabel = METRIC_LABELS[c.metric] || c.metric;
                        const opLabel = OPERATOR_LABELS[c.operator] || c.operator;
                        return `- ${metricLabel} ${opLabel} ${c.value.toLocaleString()}`;
                    }).join('\n') || '';

                    const actionsStr = newRuleData.actions?.map(a => {
                        const typeLabel = a.type === 'turn_off' ? 'Tắt' :
                            a.type === 'turn_on' ? 'Bật' :
                                a.type === 'increase_budget' ? 'Tăng ngân sách' :
                                    a.type === 'decrease_budget' ? 'Giảm ngân sách' : a.type;
                        const valueStr = a.value ? ` ${a.value}%` : '';
                        return `- ${typeLabel}${valueStr}`;
                    }).join('\n') || '';

                    const msg = `Tôi đã thiết lập quy tắc:\n\n` +
                        `📌 **Tên quy tắc**: ${newRuleData.rule_name}\n` +
                        `🏷️ **Tên nhãn**: ${labelName}\n` +
                        `🎯 **Phạm vi**: ${newRuleData.scope === 'campaign' ? 'Chiến dịch' : newRuleData.scope === 'adset' ? 'Nhóm quảng cáo' : 'Quảng cáo'}\n` +
                        `   ➤ Điều kiện:\n${conditionsStr}\n` +
                        `   ➤ Hành động:\n${actionsStr}\n\n` +
                        `Bạn có muốn lưu quy tắc này không? (Gõ "Ok" hoặc "Xác nhận")`;

                    setLastMessage(msg);
                    setIsLoading(false);
                    return { message: msg, stage: 'confirming' };
                }

                // Handle GOLDEN RULE SET from AI
                if (result.type === 'golden_rule_set' && result.goldenRuleSet) {
                    setRuleType('golden_set');
                    const ruleSet: Partial<GoldenRuleSet> = {
                        ...result.goldenRuleSet,
                        name: proposedRule?.rule_name || result.goldenRuleSet.name,
                        scope: proposedRule?.scope || result.goldenRuleSet.scope || 'adset',
                        user_id: user!.id,
                    };

                    setProposedGoldenRuleSet(ruleSet);
                    setStage('confirming');

                    let stepsStr = '';
                    const basicRules = ruleSet.basic_rules || [];

                    basicRules.forEach((rule: BasicRule, i: number) => {
                        const prefix = i === 0 ? '📋' : '📋 HOẶC';
                        stepsStr += `${prefix} **Bước ${i + 1}: ${rule.name}**\n`;
                        const condStr = rule.conditions?.map(c => {
                            const metricLabel = METRIC_LABELS[c.metric] || c.metric;
                            const opLabel = OPERATOR_LABELS[c.operator] || c.operator;
                            return `${metricLabel} ${opLabel} ${Number(c.value).toLocaleString()}`;
                        }).join(` ${rule.condition_logic === 'all' ? 'VÀ' : 'HOẶC'} `) || '';
                        stepsStr += `   ► Điều kiện: ${condStr}\n`;
                        const actionLabel = rule.action?.type === 'turn_off' ? 'Tắt' :
                            rule.action?.type === 'turn_on' ? 'Bật' :
                                rule.action?.type === 'increase_budget' ? `Tăng ${rule.action.value}%` :
                                    rule.action?.type === 'decrease_budget' ? `Giảm ${rule.action.value}%` :
                                        rule.action?.type || 'N/A';
                        stepsStr += `   ► Hành động: ${actionLabel}\n\n`;
                    });

                    const msg = `🥇 **Bộ quy tắc vàng**: ${ruleSet.name}\n\n` +
                        `🏷️ **Tên nhãn**: ${labelName}\n` +
                        `🎯 **Phạm vi**: ${ruleSet.scope === 'campaign' ? 'Chiến dịch' : ruleSet.scope === 'adset' ? 'Nhóm quảng cáo' : 'Quảng cáo'}\n\n` +
                        `${stepsStr}` +
                        `Bạn có muốn lưu bộ quy tắc này không? (Gõ "Ok" hoặc "Xác nhận")`;

                    setLastMessage(msg);
                    setIsLoading(false);
                    return { message: msg, stage: 'confirming' };
                }

                // Fallback
                const msg = result.message || 'Không thể phân tích quy tắc. Vui lòng thử lại.';
                setLastMessage(msg);
                setIsLoading(false);
                return { message: msg, stage: 'defining_logic' };
            }


            return { message: "Tôi không hiểu. Vui lòng thử lại.", stage };


        } catch (error: any) {
            console.error('Rule Flow Error:', error);
            setLastMessage(`❌ Lỗi: ${error.message}`);
            setIsLoading(false);
            return { message: error.message, stage: 'error' };
        }
    }, [stage, proposedRule, labelName, user, setData]);

    const confirmAndCreate = useCallback(async () => {
        // Check if we have something to create
        if (ruleType === 'single' && !proposedRule) return false;
        if (ruleType === 'golden_set' && !proposedGoldenRuleSet) return false;
        if (!user?.id) return false;

        setIsLoading(true);
        setStage('creating');

        try {
            // 1. Create Label first
            const ruleName = ruleType === 'golden_set'
                ? proposedGoldenRuleSet?.name
                : proposedRule?.rule_name;
            let finalLabelName = labelName || ruleName || "Quy tắc mới";

            // Check for duplicate label name
            const { getLabelsByUserId } = await import('@/services/nocodb/campaignLabelsService');
            const existingLabels = await getLabelsByUserId(user.id);

            // Auto-rename if duplicate
            let suffix = 1;
            const originalName = finalLabelName;
            while (existingLabels.some(l => l.label_name.toLowerCase() === finalLabelName.toLowerCase())) {
                finalLabelName = `${originalName} (${suffix})`;
                suffix++;
            }

            const newLabel = await createLabel({
                label_name: finalLabelName,
                label_color: ruleType === 'golden_set' ? '#f59e0b' : '#3b82f6', // Gold for golden set
                user_id: user.id
            });

            if (!newLabel.Id) throw new Error("Không thể tạo nhãn");
            setCreatedLabelId(newLabel.Id);

            // 2. Create Rule or Golden Rule Set
            const scope = ruleType === 'golden_set'
                ? proposedGoldenRuleSet?.scope
                : proposedRule?.scope;

            if (ruleType === 'golden_set' && proposedGoldenRuleSet) {
                // Convert Golden Rule Set to AutomationRule with steps[]
                const basicRules = proposedGoldenRuleSet.basic_rules || [];

                // Convert BasicRule[] to RuleStep[]
                const steps: any[] = basicRules.map((rule: any, index: number) => ({
                    id: rule.id || crypto.randomUUID(),
                    order: index + 1,
                    logic: index === 0 ? 'OR' : 'OR', // First step is root, rest are OR
                    conditions: rule.conditions || [],
                    condition_logic: rule.condition_logic || 'all',
                    action: rule.action,
                }));

                // Create as AutomationRule with steps
                const ruleToCreate = {
                    rule_name: proposedGoldenRuleSet.name || proposedRule?.rule_name,
                    user_id: user.id,
                    scope: (proposedGoldenRuleSet.scope || proposedRule?.scope || 'adset') as any,
                    time_range: (proposedGoldenRuleSet.time_range || 'today') as any,
                    conditions: basicRules[0]?.conditions || [], // First step conditions as main
                    condition_logic: 'all' as any,
                    actions: basicRules[0]?.action ? [basicRules[0].action] : [],
                    steps: steps, // Multi-step rules
                    apply_to: 'specific' as any,
                    target_labels: [newLabel.Id],
                    is_active: true,
                    advanced_settings: {},
                };

                await createRule(ruleToCreate);

                setStage('post_create_options');
                let msg = `✅ Đã tạo xong **Bộ quy tắc vàng** "${ruleName}" với nhãn "**${finalLabelName}**".\n\n`;

                if (finalLabelName !== originalName) {
                    msg = `⚠️ Tên nhãn đã được đổi thành "**${finalLabelName}**" để tránh trùng.\n\n` + msg;
                }

                msg += `Bộ quy tắc có ${steps.length} bước.\n\n`;
                msg += `Bạn có muốn áp dụng nhãn này vào các ${scope === 'campaign' ? 'chiến dịch' : 'nhóm quảng cáo'} ngay không?`;

                setLastMessage(msg);
                toast.success("Đã tạo bộ quy tắc vàng thành công!");
            } else if (proposedRule) {
                // Create single rule (existing logic)
                const ruleToCreate = {
                    ...proposedRule,
                    user_id: user.id,
                    time_range: (proposedRule.time_range || 'today') as any,
                    apply_to: 'specific' as any,
                    target_labels: [newLabel.Id],
                    is_active: true
                };

                await createRule(ruleToCreate);

                setStage('post_create_options');
                let msg = `✅ Đã tạo xong nhãn "**${finalLabelName}**" và gắn quy tắc.\n\n`;

                if (finalLabelName !== originalName) {
                    msg = `⚠️ Tên nhãn đã được đổi thành "**${finalLabelName}**" để tránh trùng.\n\n` + msg;
                }

                msg += `Bạn có muốn áp dụng nhãn này vào các ${scope === 'campaign' ? 'chiến dịch' : scope === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo'} ngay không?`;

                setLastMessage(msg);
                toast.success("Đã tạo quy tắc và nhãn thành công!");
            }

            return true;
        } catch (error: any) {
            console.error('Create Rule Error:', error);
            setStage('error');
            setLastMessage(`❌ Lỗi khi lưu quy tắc: ${error.message}`);
            toast.error("Lỗi khi lưu quy tắc");
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [proposedRule, proposedGoldenRuleSet, ruleType, labelName, user]);


    const handlePostCreateOption = useCallback((option: 'continue' | 'cancel') => {
        if (option === 'cancel') {
            setStage('done');
            setLastMessage("✅ Đã hoàn tất! Bạn có thể xem quy tắc trong tab Báo cáo.");
        } else {
            setStage('selecting_items');
            setLastMessage(`Vui lòng chọn các ${proposedRule?.scope === 'campaign' ? 'chiến dịch' : 'nhóm quảng cáo'} để gắn nhãn.`);
        }
    }, [proposedRule]);

    const handleApplyLabel = useCallback(async (selectedIds: string[]): Promise<string> => {
        if (!createdLabelId || !user?.id || !proposedRule?.scope) return 'Thiếu thông tin để gắn nhãn';

        setIsLoading(true);
        setStage('applying_label');

        try {
            const entityType = proposedRule.scope === 'campaign' ? 'campaign' : proposedRule.scope === 'adset' ? 'adset' : 'ad';

            // Assign label to each selected item
            for (const id of selectedIds) {
                await assignLabel(id, entityType, createdLabelId, user.id);
            }

            setStage('done');
            const msg = `✅ Đã gắn nhãn thành công cho ${selectedIds.length} mục! Quy tắc sẽ bắt đầu hoạt động.`;
            setLastMessage(msg);
            toast.success("Đã gắn nhãn thành công!");
            return msg; // Return message for immediate use
        } catch (error: any) {
            console.error('Apply Label Error:', error);
            const errorMsg = `❌ Lỗi khi gắn nhãn: ${error.message}`;
            setLastMessage(errorMsg);
            toast.error("Lỗi khi gắn nhãn");
            setStage('done');
            return errorMsg; // Return error message
        } finally {
            setIsLoading(false);
        }
    }, [createdLabelId, user, proposedRule]);

    const reset = useCallback(() => {
        setStage('idle');
        setProposedRule(null);
        setProposedGoldenRuleSet(null);
        setRuleType('single');
        setLastMessage('');
        setIsLoading(false);
        setCreatedLabelId(null);
        setLabelName('');
        setShowBasicDialog(false); // ADDED
    }, []);

    return {
        stage,
        proposedRule,
        proposedGoldenRuleSet,
        ruleType,
        lastMessage,
        isLoading,
        createdLabelId,
        showBasicDialog, // NEW
        start,
        selectBasicMode, // NEW
        selectAdvancedMode, // NEW
        closeBasicDialog, // NEW
        handleInput,
        confirmAndCreate,
        handlePostCreateOption,
        handleApplyLabel,
        reset,
        setStage,
        setData
    };
}

