/**
 * ruleFlowHandler.ts - Xử lý Rule Flow đơn giản
 * 
 * Chỉ hiển thị lựa chọn Cơ bản / Nâng cao:
 * - Cơ bản: Mở popup dialog tạo quy tắc
 * - Nâng cao: Placeholder (chưa phát triển)
 * 
 * @author AI Assistant Refactoring  
 * @date 2024-12-17
 */

import { detectIntent, DetectedIntent } from './intentDetector';

// Types
export interface RuleFlowContext {
    userMessage: string;
    ruleFlow: {
        stage: string;
        start: (input: string, history: any[]) => Promise<{ message: string; stage: string }>;
        handleInput: (input: string) => Promise<{ message: string; stage: string }>;
        confirmAndCreate: () => Promise<boolean>;
        reset: () => void;
        setStage: (stage: string) => void;
        selectBasicMode: () => void;  // Mở popup dialog
        selectAdvancedMode: () => void;
    };
}

export interface RuleFlowResult {
    handled: boolean;
    message?: string;
    showOptions?: boolean; // Hiển thị nút Cơ bản / Nâng cao
}

/**
 * Xử lý Rule Flow - Phiên bản đơn giản
 * Chỉ detect "tạo quy tắc" và hiển thị lựa chọn
 */
export async function handleRuleFlow(
    ctx: RuleFlowContext,
    addMessage: (role: 'assistant', content: string) => void
): Promise<RuleFlowResult> {
    const { userMessage, ruleFlow } = ctx;

    // =========================================================================
    // Nếu đang ở stage choosing_type → xử lý lựa chọn
    // =========================================================================
    if (ruleFlow.stage === 'choosing_type') {
        const lowerMsg = userMessage.toLowerCase();

        if (lowerMsg.includes('cơ bản') || lowerMsg.includes('basic') || lowerMsg === '1') {
            ruleFlow.selectBasicMode(); // Mở popup dialog
            addMessage('assistant', '📝 Đang mở form tạo quy tắc...');
            return { handled: true };
        }

        if (lowerMsg.includes('nâng cao') || lowerMsg.includes('advanced') || lowerMsg === '2') {
            ruleFlow.selectAdvancedMode();
            addMessage('assistant', '🚀 **Chế độ Nâng cao**\n\n🔧 Tính năng đang phát triển...\n\nHiện tại bạn có thể sử dụng **Quy tắc Cơ bản** để tạo quy tắc thủ công.');
            return { handled: true };
        }

        // Chưa chọn → nhắc lại
        addMessage('assistant', 'Vui lòng chọn:\n• **Cơ bản** - Tạo quy tắc bằng form\n• **Nâng cao** - Tạo quy tắc bằng AI (đang phát triển)');
        return { handled: true };
    }

    // =========================================================================
    // Detect "tạo quy tắc" intent
    // =========================================================================
    const intent = detectIntent(userMessage);

    if (intent.type !== 'RULE' && intent.type !== 'GOLDEN_RULE_SET') {
        return { handled: false }; // Không phải Rule intent
    }

    // Hiển thị lựa chọn Cơ bản / Nâng cao
    ruleFlow.setStage('choosing_type');
    addMessage('assistant', `Bạn hãy chọn 1 trong 2 loại sau:`);
    return { handled: true, showOptions: true };
}

/**
 * Check nhanh xem message có phải Rule intent không
 */
export function isRuleRelatedIntent(userMessage: string): boolean {
    const intent = detectIntent(userMessage);
    return intent.type === 'RULE' || intent.type === 'GOLDEN_RULE_SET';
}
