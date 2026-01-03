/**
 * quickPostHandler.ts - Xử lý Quick Post Flow tập trung
 * 
 * Gom 3 blocks từ AIChatPanel.tsx:
 * - Block 1 (713-743): Handle active flow (confirming stage)
 * - Block 2 (1244-1288): Detect Facebook link, start flow
 * - Block 3 (1455-1494): Intent-based start
 * 
 * @author AI Assistant Refactoring
 * @date 2024-12-17
 */

// Types
export interface QuickPostContext {
    userMessage: string;
    quickPost: {
        stage: string;
        start: (input: string, tokens: any) => Promise<{ message: string; stage: string }>;
        handleInput: (input: string) => Promise<{ message: string; stage: string }>;
        confirmAndCreate: (tokens: any) => Promise<{ campaignId: string; adSetId: string; adId: string } | null>;
        reset: () => void;
    };
    getTokens: () => { adsToken: string; pageToken: string; adAccountId: string; pageId: string };
    canUseQuickPost: boolean;
}

export interface QuickPostResult {
    handled: boolean;
    message?: string;
    replaceLoading?: boolean;  // Thay thế message "Đang xử lý" bằng kết quả
    error?: string;
}

// Facebook link regex - comprehensive
const FB_LINK_REGEX = /https?:\/\/(?:www\.)?(?:m\.)?(?:business\.)?(?:l\.)?(?:lm\.)?(?:facebook\.com|fb\.com|fb\.watch)\/(?:(?:share\/[pvr]\/)|(?:watch\/\?v=)|(?:story\.php)|(?:permalink\.php)|(?:photo\.php)|(?:[^\/]+\/posts\/)|(?:[^\/]+\/videos\/)|(?:posts\/)|(?:videos\/)|(?:reel\/)|(?:.*?(?:pfbid|fbid)=))[^\s)]+/i;

/**
 * Kiểm tra message có chứa Facebook link không
 */
export function hasFacebookLink(message: string): boolean {
    return FB_LINK_REGEX.test(message);
}

/**
 * Xử lý Quick Post Flow - Phiên bản tập trung
 */
export async function handleQuickPostFlow(
    ctx: QuickPostContext,
    addMessage: (role: 'assistant', content: string) => void,
    setMessages?: (fn: (prev: any[]) => any[]) => void
): Promise<QuickPostResult> {
    const { userMessage, quickPost, getTokens, canUseQuickPost } = ctx;
    const lowerMsg = userMessage.toLowerCase();

    // =========================================================================
    // BLOCK 1: Nếu quickPost đang active (không phải idle)
    // =========================================================================
    if (quickPost.stage !== 'idle') {

        // Stage: confirming
        if (quickPost.stage === 'confirming') {
            if (lowerMsg.includes('ok') || lowerMsg.includes('xác nhận')) {
                const tokens = getTokens();
                addMessage('assistant', '⏳ Đang tạo quick post campaign...');

                const result = await quickPost.confirmAndCreate(tokens);
                if (result) {
                    addMessage('assistant',
                        `✅ Tạo thành công!\n\n` +
                        `📊 Campaign ID: ${result.campaignId}\n` +
                        `🎯 Ad Set ID: ${result.adSetId}\n` +
                        `📢 Ad ID: ${result.adId}\n\n` +
                        `Kiểm tra trong Facebook Ads Manager nhé!`
                    );
                }
                return { handled: true };
            } else {
                addMessage('assistant', '⚠️ Vui lòng nhập "ok" hoặc "xác nhận" để tạo campaign.');
                return { handled: true };
            }
        }

        // Other stages: delegate to hook
        const { message: nextMsg } = await quickPost.handleInput(userMessage);
        addMessage('assistant', nextMsg);
        return { handled: true };
    }

    // =========================================================================
    // BLOCK 2 & 3: Detect Facebook link để start flow
    // =========================================================================
    const hasLink = hasFacebookLink(userMessage);

    if (!hasLink) {
        // Không có Facebook link → không phải Quick Post
        return { handled: false };
    }

    // Kiểm tra permission
    if (!canUseQuickPost) {
        addMessage('assistant',
            '⚠️ Tính năng "Quick Post" chưa được kích hoạt cho tài khoản của anh.\n\n' +
            'Vui lòng liên hệ quản trị viên để được hỗ trợ kích hoạt tính năng này.'
        );
        return { handled: true };
    }

    // Start flow
    const tokens = getTokens();

    try {
        addMessage('assistant',
            'Em đang xử lý bài viết, anh đợi xử lý ạ.\n\n' +
            '⏱️ Vui lòng đợi 5-10 giây...'
        );

        const { message: resultMsg } = await quickPost.start(userMessage, tokens);

        // Thay thế loading message bằng kết quả
        if (resultMsg !== '__SHOW_CONFIRM_CARD__' && setMessages) {
            setMessages(prev => {
                const filtered = prev.filter(m => !m.content.includes('⏳ **Đang xử lý') && !m.content.includes('Em đang xử lý'));
                return [...filtered, { role: 'assistant', content: resultMsg }];
            });
        }

        return { handled: true };
    } catch (error) {
        const rawError = error instanceof Error ? error.message : 'Lỗi không xác định';

        // ✅ Check if it's a balance error - show simple message
        const isBalanceError = rawError.includes('Số dư') || rawError.includes('nạp tiền');

        const errorMsg = isBalanceError
            ? `❌ **Lỗi xử lý bài viết:**\n\n${rawError}`
            : `❌ **Lỗi xử lý bài viết:**\n\n${rawError}\n\n**Vui lòng kiểm tra:**\n• Link bài viết có công khai không?\n• Tokens Facebook còn hợp lệ không?\n• NocoDB API có hoạt động không?`;

        if (setMessages) {
            setMessages(prev => {
                const filtered = prev.filter(m => !m.content.includes('⏳ **Đang xử lý') && !m.content.includes('Em đang xử lý'));
                return [...filtered, { role: 'assistant', content: errorMsg }];
            });
        } else {
            addMessage('assistant', errorMsg);
        }

        return { handled: true, error: rawError };
    }
}
