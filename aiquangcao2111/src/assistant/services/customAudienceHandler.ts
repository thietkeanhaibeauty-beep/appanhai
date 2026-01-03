/**
 * customAudienceHandler.ts - Xử lý Custom Audience Flow tập trung
 * 
 * Gom logic từ AIChatPanel.tsx (dòng 519-576):
 * - isCustomAudienceIntent: Detect intent từ keywords
 * - Handle confirming stage
 * - Start flow khi detect intent
 * 
 * @author AI Assistant Refactoring
 * @date 2024-12-17
 */

// Keywords để detect Custom Audience intent
const CUSTOM_AUDIENCE_KEYWORDS = [
    'tệp đối tượng', 'quảng cáo tệp', 'custom audience', 'lookalike audience', 'retargeting audience',
    'qc tệp', 'qc tep', 'chạy tệp', 'chay tep', 'ads tệp', 'quảng cáo đối tượng',
    'chạy quảng cáo tệp', 'target tệp'  // ← THÊM keywords mới
];

/**
 * Kiểm tra message có phải intent Custom Audience không
 * NOTE: Phải loại trừ "tạo tệp" vì đó là intent AUDIENCE (tạo mới), không phải chạy QC với tệp có sẵn
 */
export function isCustomAudienceIntent(text: string): boolean {
    const lower = text.toLowerCase();

    // EXCLUDE: Nếu user muốn TẠO tệp đối tượng mới → không phải CUSTOM_AUDIENCE intent
    const createKeywords = ['tạo tệp', 'tạo đối tượng', 'tạo audience', 'create audience', 'tạo lookalike'];
    if (createKeywords.some(k => lower.includes(k))) {
        return false; // Let AUDIENCE intent handle this  
    }

    return CUSTOM_AUDIENCE_KEYWORDS.some(k => lower.includes(k));
}

// Types
export interface CustomAudienceContext {
    userMessage: string;
    customAudienceFlow: {
        isActive: boolean;
        stage: string;
        error?: string;
        startFlow: (adAccountId: string, adsToken: string) => Promise<{ success: boolean; audiences?: any[]; error?: string }>;
        confirmAndCreate: (tokens: any) => Promise<{ campaignId: string; adSetId: string; adId: string } | null>;
        reset: () => void;
    };
    getTokens: () => { adsToken: string; adAccountId: string };
}

export interface CustomAudienceResult {
    handled: boolean;
    message?: string;
}

/**
 * Xử lý Custom Audience Flow - Phiên bản tập trung
 */
export async function handleCustomAudienceFlow(
    ctx: CustomAudienceContext,
    addMessage: (role: 'assistant', content: string) => void
): Promise<CustomAudienceResult> {
    const { userMessage, customAudienceFlow, getTokens } = ctx;
    const lowerMsg = userMessage.toLowerCase();

    // =========================================================================
    // Nếu Custom Audience Flow đang active
    // =========================================================================
    if (customAudienceFlow.isActive) {
        // Stage: confirming
        if (customAudienceFlow.stage === 'confirming') {
            if (lowerMsg.includes('ok') || lowerMsg.includes('xác nhận')) {
                const tokens = getTokens();
                addMessage('assistant', '⏳ Đang tạo chiến dịch với tệp đối tượng...');

                const result = await customAudienceFlow.confirmAndCreate(tokens);
                if (result) {
                    addMessage('assistant',
                        `✅ Tạo thành công!\n\n` +
                        `📊 Campaign ID: ${result.campaignId}\n` +
                        `🎯 Ad Set ID: ${result.adSetId}\n` +
                        `📢 Ad ID: ${result.adId}\n\n` +
                        `Kiểm tra trong Facebook Ads Manager nhé!`
                    );
                } else {
                    addMessage('assistant', `❌ ${customAudienceFlow.error || 'Lỗi tạo chiến dịch'}`);
                }
                return { handled: true };
            } else if (lowerMsg.includes('hủy')) {
                customAudienceFlow.reset();
                addMessage('assistant', '✅ Đã hủy tạo chiến dịch tệp đối tượng.');
                return { handled: true };
            }
        }
        // NOTE: Other stages like 'awaiting_campaign_info' are handled elsewhere
        return { handled: false };
    }

    // =========================================================================
    // Start flow nếu detect intent
    // =========================================================================
    if (isCustomAudienceIntent(userMessage)) {
        const { adsToken, adAccountId } = getTokens();
        addMessage('assistant', '🔍 Đang tải danh sách tệp đối tượng...');

        const result = await customAudienceFlow.startFlow(adAccountId, adsToken);
        if (result.success) {
            addMessage('assistant', `📋 Tìm thấy ${result.audiences?.length || 0} tệp đối tượng. Vui lòng chọn tệp bạn muốn target.`);
        } else {
            addMessage('assistant', `❌ ${result.error}`);
            customAudienceFlow.reset();
        }
        return { handled: true };
    }

    // Không phải Custom Audience intent
    return { handled: false };
}
