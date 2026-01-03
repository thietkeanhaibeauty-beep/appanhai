/**
 * flow.ts - Tầng 3: Interface chung cho các Flow
 * 
 * Định nghĩa IFlow interface để chuẩn hóa tất cả flows.
 * Các flow hiện tại sẽ được wrap để implement interface này.
 * 
 * @author AI Assistant Refactoring
 * @date 2024-12-17
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Stage chung cho tất cả flows
 * Mỗi flow có thể extend thêm các stage riêng
 */
export type BaseFlowStage =
    | 'idle'        // Chưa bắt đầu
    | 'active'      // Đang xử lý
    | 'confirming'  // Đợi user xác nhận
    | 'creating'    // Đang tạo (gọi API)
    | 'done'        // Hoàn thành
    | 'error';      // Lỗi

/**
 * Kết quả trả về từ các method của flow
 */
export interface FlowResponse {
    success: boolean;
    message: string;

    // Optional fields
    requiresConfirmation?: boolean;
    data?: any;
    error?: string;
    nextStage?: string;
}

/**
 * Interface chung cho tất cả flows
 * 
 * Mục đích:
 * - Chuẩn hóa API cho tất cả flows
 * - Router có thể gọi bất kỳ flow nào theo cùng một cách
 * - Dễ test và maintain
 */
export interface IFlow {
    /** ID định danh flow */
    id: string;

    /** Stage hiện tại */
    stage: string;

    /** Flow có đang active không (stage !== 'idle') */
    isActive: boolean;

    /**
     * Bắt đầu flow với input đầu tiên
     * @param input - Tin nhắn người dùng
     * @param context - Context bổ sung (tokens, userId, etc.)
     */
    start(input: string, context?: any): Promise<FlowResponse>;

    /**
     * Xử lý input tiếp theo (khi flow đang active)
     * @param input - Tin nhắn người dùng
     */
    handleInput(input: string): Promise<FlowResponse>;

    /**
     * User xác nhận để thực hiện action cuối
     */
    confirm(): Promise<FlowResponse>;

    /**
     * User hủy flow
     */
    cancel(): void;

    /**
     * Reset flow về trạng thái idle
     */
    reset(): void;
}

// =============================================================================
// WRAPPER HELPER
// =============================================================================

/**
 * Wrapper để biến một hook hiện tại thành IFlow
 * Dùng trong quá trình migration từng bước
 * 
 * @example
 * const ruleFlowWrapper = createFlowWrapper('rule', ruleFlow, {
 *   mapStart: (input) => ruleFlow.start(input, messages),
 *   mapHandleInput: (input) => ruleFlow.handleInput(input),
 *   mapConfirm: () => ruleFlow.confirmAndCreate(),
 * });
 */
export interface FlowWrapperConfig<T> {
    /** Lấy stage hiện tại từ hook */
    getStage: (hook: T) => string;

    /** Map hàm start của hook */
    mapStart?: (hook: T, input: string, context?: any) => Promise<FlowResponse>;

    /** Map hàm handleInput của hook */
    mapHandleInput?: (hook: T, input: string) => Promise<FlowResponse>;

    /** Map hàm confirm của hook */
    mapConfirm?: (hook: T) => Promise<FlowResponse>;

    /** Map hàm reset của hook */
    mapReset?: (hook: T) => void;
}

/**
 * Tạo một IFlow wrapper từ hook hiện tại
 */
export function createFlowWrapper<T>(
    id: string,
    hook: T,
    config: FlowWrapperConfig<T>
): IFlow {
    return {
        id,

        get stage() {
            return config.getStage(hook);
        },

        get isActive() {
            return config.getStage(hook) !== 'idle';
        },

        async start(input: string, context?: any): Promise<FlowResponse> {
            if (config.mapStart) {
                return config.mapStart(hook, input, context);
            }
            return { success: false, message: 'start() not implemented' };
        },

        async handleInput(input: string): Promise<FlowResponse> {
            if (config.mapHandleInput) {
                return config.mapHandleInput(hook, input);
            }
            return { success: false, message: 'handleInput() not implemented' };
        },

        async confirm(): Promise<FlowResponse> {
            if (config.mapConfirm) {
                return config.mapConfirm(hook);
            }
            return { success: false, message: 'confirm() not implemented' };
        },

        cancel(): void {
            if (config.mapReset) {
                config.mapReset(hook);
            }
        },

        reset(): void {
            if (config.mapReset) {
                config.mapReset(hook);
            }
        },
    };
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isFlowActive(flow: IFlow): boolean {
    return flow.isActive;
}

export function isFlowConfirming(flow: IFlow): boolean {
    return flow.stage === 'confirming';
}

export function isFlowIdle(flow: IFlow): boolean {
    return flow.stage === 'idle';
}
