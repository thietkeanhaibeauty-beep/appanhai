/**
 * ruleFlowAdapter.ts - Adapter để wrap useRuleFlow theo IFlow interface
 * 
 * Mục đích:
 * - Không thay đổi logic bên trong useRuleFlow
 * - Chỉ bọc lại để tuân theo IFlow interface
 * - Dễ dàng gọi từ Router
 * 
 * @author AI Assistant Refactoring
 * @date 2024-12-17
 */

import { IFlow, FlowResponse } from '../types/flow';
import { UseRuleFlowReturn, RuleFlowStage } from '../hooks/useRuleFlow';

/**
 * Adapter class để wrap useRuleFlow hook
 * 
 * Cách dùng:
 * ```tsx
 * const ruleFlow = useRuleFlow();
 * const ruleFlowAdapter = new RuleFlowAdapter(ruleFlow);
 * 
 * // Bây giờ có thể gọi qua IFlow interface:
 * const result = await ruleFlowAdapter.start("tạo quy tắc...");
 * ```
 */
export class RuleFlowAdapter implements IFlow {
    readonly id = 'rule';

    constructor(private hook: UseRuleFlowReturn) { }

    get stage(): string {
        return this.hook.stage;
    }

    get isActive(): boolean {
        return this.hook.stage !== 'idle';
    }

    /**
     * Bắt đầu flow tạo quy tắc
     * @param input - Tin nhắn người dùng (ví dụ: "tạo quy tắc tiêu 100k tắt")
     * @param context - { history: Message[] } - lịch sử chat
     */
    async start(input: string, context?: { history?: Array<{ role: 'user' | 'assistant'; content: string }> }): Promise<FlowResponse> {
        try {
            const result = await this.hook.start(input, context?.history || []);
            return {
                success: true,
                message: result.message,
                nextStage: result.stage,
                requiresConfirmation: result.stage === 'confirming',
            };
        } catch (error: any) {
            return {
                success: false,
                message: `❌ Lỗi: ${error.message}`,
                error: error.message,
            };
        }
    }

    /**
     * Xử lý input tiếp theo (khi flow đang active)
     */
    async handleInput(input: string): Promise<FlowResponse> {
        try {
            const result = await this.hook.handleInput(input);
            return {
                success: true,
                message: result.message,
                nextStage: result.stage,
                requiresConfirmation: result.stage === 'confirming',
            };
        } catch (error: any) {
            return {
                success: false,
                message: `❌ Lỗi: ${error.message}`,
                error: error.message,
            };
        }
    }

    /**
     * User xác nhận để tạo quy tắc
     */
    async confirm(): Promise<FlowResponse> {
        try {
            const success = await this.hook.confirmAndCreate();
            return {
                success,
                message: success
                    ? this.hook.lastMessage || '✅ Đã tạo quy tắc thành công!'
                    : this.hook.lastMessage || '❌ Không thể tạo quy tắc',
                nextStage: this.hook.stage,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `❌ Lỗi: ${error.message}`,
                error: error.message,
            };
        }
    }

    /**
     * User hủy flow
     */
    cancel(): void {
        this.hook.reset();
    }

    /**
     * Reset flow về trạng thái idle
     */
    reset(): void {
        this.hook.reset();
    }

    // =========================================================================
    // Helper getters để truy cập data từ hook gốc (nếu cần)
    // =========================================================================

    get proposedRule() {
        return this.hook.proposedRule;
    }

    get proposedGoldenRuleSet() {
        return this.hook.proposedGoldenRuleSet;
    }

    get ruleType() {
        return this.hook.ruleType;
    }

    get lastMessage() {
        return this.hook.lastMessage;
    }

    get isLoading() {
        return this.hook.isLoading;
    }

    get showBasicDialog() {
        return this.hook.showBasicDialog;
    }

    // Expose các method đặc biệt của RuleFlow
    selectBasicMode() {
        this.hook.selectBasicMode();
    }

    selectAdvancedMode() {
        this.hook.selectAdvancedMode();
    }

    closeBasicDialog() {
        this.hook.closeBasicDialog();
    }

    handlePostCreateOption(option: 'continue' | 'cancel') {
        this.hook.handlePostCreateOption(option);
    }

    async handleApplyLabel(selectedIds: string[]): Promise<string> {
        return this.hook.handleApplyLabel(selectedIds);
    }

    setStage(stage: RuleFlowStage) {
        this.hook.setStage(stage);
    }

    setData(data: any) {
        this.hook.setData(data);
    }
}

/**
 * Factory function để tạo adapter từ hook
 */
export function createRuleFlowAdapter(hook: UseRuleFlowReturn): RuleFlowAdapter {
    return new RuleFlowAdapter(hook);
}
