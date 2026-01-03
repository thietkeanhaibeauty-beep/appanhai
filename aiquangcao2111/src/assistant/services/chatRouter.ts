/**
 * chatRouter.ts - Tầng 2: Router điều hướng
 * 
 * Pure function routeIntent() - quyết định gọi flow nào dựa trên:
 * 1. Flow nào đang active? → Tiếp tục flow đó
 * 2. Không có flow active → Route theo priority order
 * 
 * Priority order (đã chốt):
 * 1. CAMPAIGN_CONTROL
 * 2. RULE / GOLDEN_RULE_SET
 * 3. CUSTOM_AUDIENCE
 * 4. QUICK_POST
 * 5. CREATIVE
 * 6. AUDIENCE
 * 7. CLONE
 * 8. GENERAL_CHAT
 * 
 * @author AI Assistant Refactoring
 * @date 2024-12-17
 */

import { DetectedIntent, IntentType } from './intentDetector';

// =============================================================================
// TYPES
// =============================================================================

export type FlowType =
    | 'campaign_control'
    | 'rule'
    | 'custom_audience'
    | 'quick_post'
    | 'creative'
    | 'audience'
    | 'clone'
    | 'schedule'  // Xem lịch hẹn, dữ liệu sales
    | 'report'    // Báo cáo thống kê
    | 'chat';

export type RouteAction = 'START' | 'CONTINUE' | 'CONFIRM' | 'CANCEL';

export interface RouteResult {
    targetFlow: FlowType;
    action: RouteAction;
    intent: DetectedIntent;
    params?: Record<string, any>;
}

/**
 * Registry chứa stage hiện tại của từng flow
 * Dùng để kiểm tra flow nào đang active
 */
export interface FlowRegistry {
    ruleFlow: { stage: string };
    campaignControl: { stage: string };
    creative: { stage: string };
    quickPost: { stage: string };
    audience: { stage: string };
    customAudienceFlow: { isActive: boolean; stage?: string };
    clone: { stage: string };
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Route intent to appropriate flow
 * 
 * @param intent - DetectedIntent từ intentDetector
 * @param flows - Registry chứa stage hiện tại của các flows
 * @returns RouteResult chỉ định flow nào sẽ xử lý
 */
export function routeIntent(
    intent: DetectedIntent,
    flows: FlowRegistry
): RouteResult {

    // =========================================================================
    // PRIORITY 0: Nếu có flow đang active → CONTINUE flow đó
    // =========================================================================

    const activeFlow = getActiveFlow(flows);
    if (activeFlow) {
        // =====================================================================
        // CONTEXT SWITCHING LOGIC (GLOBAL INTERRUPT)
        // Nếu intent mới rõ ràng (confidence >= 0.85) và khác với active flow
        // → Cho phép switch sang flow mới ngay lập tức
        // =====================================================================

        const intentToFlowMap: Partial<Record<IntentType, FlowType>> = {
            'AUDIENCE': 'audience',
            'CUSTOM_AUDIENCE': 'custom_audience',
            'CAMPAIGN_CONTROL': 'campaign_control',
            'RULE': 'rule',
            'GOLDEN_RULE_SET': 'rule',
            'QUICK_POST': 'quick_post',
            'CREATIVE': 'creative',
            'CLONE': 'clone',
            'SCHEDULE': 'schedule',
            'REPORT': 'report'
        };

        const potentialNewFlow = intentToFlowMap[intent.type];

        // Only switch if:
        // 1. Intent maps to a valid flow
        // 2. That flow is different from current active flow
        // 3. Confidence is high enough (>= 0.85) to be a command, not just data entry
        if (potentialNewFlow && potentialNewFlow !== activeFlow && intent.confidence >= 0.85) {

            // Re-use logic from bottom switch case to construct return object
            // Or simpler: recursive call? No, pure function.
            // Just return START action for the new flow.

            // Separate handling for specific intents that need params
            switch (intent.type) {
                case 'CAMPAIGN_CONTROL':
                    return {
                        targetFlow: 'campaign_control',
                        action: 'START',
                        intent,
                        params: {
                            controlAction: intent.controlAction,
                            controlScope: intent.controlScope,
                            toggleAction: intent.toggleAction,
                            targetName: intent.targetName,
                            statusFilter: intent.statusFilter,
                        }
                    };
                case 'RULE':
                case 'GOLDEN_RULE_SET':
                    return {
                        targetFlow: 'rule',
                        action: 'START',
                        intent,
                        params: { ruleType: intent.ruleType }
                    };
                case 'SCHEDULE':
                    return {
                        targetFlow: 'schedule',
                        action: 'START',
                        intent,
                        params: {
                            scheduleType: intent.scheduleType,
                            scheduleDateField: intent.scheduleDateField
                        }
                    };
                default:
                    // For flows without complex params (AUDIENCE, CUSTOM_AUDIENCE, etc.)
                    return {
                        targetFlow: potentialNewFlow,
                        action: 'START',
                        intent
                    };
            }
        }

        // Kiểm tra nếu user muốn cancel
        const isCancel = isCancelIntent(intent.rawInput);
        if (isCancel) {
            return {
                targetFlow: activeFlow,
                action: 'CANCEL',
                intent,
            };
        }

        // Kiểm tra nếu user muốn confirm
        const isConfirm = isConfirmIntent(intent.rawInput);
        if (isConfirm) {
            return {
                targetFlow: activeFlow,
                action: 'CONFIRM',
                intent,
            };
        }

        // Tiếp tục flow hiện tại
        return {
            targetFlow: activeFlow,
            action: 'CONTINUE',
            intent,
        };
    }

    // =========================================================================
    // Không có flow active → Route theo intent type và priority order
    // =========================================================================
    switch (intent.type) {
        case 'CAMPAIGN_CONTROL':
            return {
                targetFlow: 'campaign_control',
                action: 'START',
                intent,
                params: {
                    controlAction: intent.controlAction,
                    controlScope: intent.controlScope,
                    toggleAction: intent.toggleAction,
                    targetName: intent.targetName,
                    statusFilter: intent.statusFilter,
                },
            };

        case 'RULE':
        case 'GOLDEN_RULE_SET':
            return {
                targetFlow: 'rule',
                action: 'START',
                intent,
                params: {
                    ruleType: intent.ruleType,
                },
            };

        case 'CUSTOM_AUDIENCE':
            return {
                targetFlow: 'custom_audience',
                action: 'START',
                intent,
            };

        case 'QUICK_POST':
            return {
                targetFlow: 'quick_post',
                action: 'START',
                intent,
                params: {
                    fbLinkUrl: intent.fbLinkUrl,
                },
            };

        case 'CREATIVE':
            return {
                targetFlow: 'creative',
                action: 'START',
                intent,
                params: {
                    hasMedia: intent.hasMedia,
                },
            };

        case 'AUDIENCE':
            return {
                targetFlow: 'audience',
                action: 'START',
                intent,
            };

        case 'CLONE':
            return {
                targetFlow: 'clone',
                action: 'START',
                intent,
            };

        case 'SCHEDULE':
            return {
                targetFlow: 'schedule',
                action: 'START',
                intent,
                params: {
                    scheduleType: intent.scheduleType,
                    scheduleDateField: intent.scheduleDateField,
                },
            };

        case 'REPORT':
            return {
                targetFlow: 'report',
                action: 'START',
                intent,
            };

        case 'GENERAL_CHAT':
        case 'UNKNOWN':
        default:
            return {
                targetFlow: 'chat',
                action: 'START',
                intent,
            };
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Kiểm tra flow nào đang active (không ở stage 'idle')
 * Trả về flow đầu tiên đang active, null nếu không có
 */
function getActiveFlow(flows: FlowRegistry): FlowType | null {
    // Thứ tự kiểm tra theo priority

    if (flows.ruleFlow.stage !== 'idle') {
        return 'rule';
    }

    if (flows.campaignControl.stage !== 'idle') {
        return 'campaign_control';
    }

    if (flows.customAudienceFlow.isActive ||
        (flows.customAudienceFlow.stage && flows.customAudienceFlow.stage !== 'idle')) {
        return 'custom_audience';
    }

    if (flows.quickPost.stage !== 'idle') {
        return 'quick_post';
    }

    if (flows.creative.stage !== 'idle') {
        return 'creative';
    }

    if (flows.audience.stage !== 'idle') {
        return 'audience';
    }

    if (flows.clone.stage !== 'idle') {
        return 'clone';
    }

    return null;
}

/**
 * Kiểm tra user có đang muốn cancel không
 */
function isCancelIntent(input: string): boolean {
    const lower = input.toLowerCase().trim();
    const cancelKeywords = ['hủy', 'cancel', 'thôi', 'bỏ', 'không', 'dừng lại'];
    return cancelKeywords.some(k => lower === k || lower.startsWith(k + ' '));
}

/**
 * Kiểm tra user có đang muốn confirm không
 */
function isConfirmIntent(input: string): boolean {
    const lower = input.toLowerCase().trim();
    const confirmKeywords = ['ok', 'có', 'yes', 'xác nhận', 'đồng ý', 'được', 'confirm'];
    return confirmKeywords.some(k => lower === k || lower.startsWith(k + ' ') || lower.includes(k));
}

// =============================================================================
// EXPORT FOR TESTING & DEBUG
// =============================================================================

export { getActiveFlow, isCancelIntent, isConfirmIntent };
