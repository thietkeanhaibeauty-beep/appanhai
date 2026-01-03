/**
 * cloneHandler.ts - Xử lý Clone Flow tập trung
 * 
 * Gom logic từ AIChatPanel.tsx (dòng 1013-1133):
 * - Stage 2: awaiting_list_choice
 * - Stage 5: awaiting_child_selection
 * - Stage 6: awaiting_name
 * - Stage 7: awaiting_quantity
 * 
 * @author AI Assistant Refactoring
 * @date 2024-12-17
 */

// Types
export interface CloneContext {
    userMessage: string;
    userId: string;
    clone: {
        stage: string;
        selectedType: string;
        childItems: any[];
        chooseListOption: () => void;
        chooseSearchOption: () => void;
        fetchCampaignsForListing: (userId: string, adAccountId: string, adsToken: string) => Promise<{ success: boolean; items?: any[]; message?: string }>;
        selectChildByIndex: (index: number) => { success: boolean; item?: any };
        setNewName: (name: string) => void;
        proceedToAwaitingQuantity: () => void;
        setQuantities: (q: { campaigns: number; adsets: number; ads: number }) => void;
        proceedToConfirming: () => void;
        reset: () => void;
    };
    getTokens: () => { adsToken: string; adAccountId: string };
}

export interface CloneResult {
    handled: boolean;
    message?: string;
}

/**
 * Xử lý Clone Flow - Phiên bản tập trung
 */
export async function handleCloneFlow(
    ctx: CloneContext,
    addMessage: (role: 'assistant', content: string) => void
): Promise<CloneResult> {
    const { userMessage, userId, clone, getTokens } = ctx;
    const lowerMsg = userMessage.toLowerCase();

    // =========================================================================
    // Stage 2: awaiting_list_choice
    // =========================================================================
    if (clone.stage === 'awaiting_list_choice') {
        if (lowerMsg.includes('1') || lowerMsg.includes('danh sách') || lowerMsg.includes('hiển thị')) {
            clone.chooseListOption();
            const { adsToken, adAccountId } = getTokens();

            const result = await clone.fetchCampaignsForListing(userId, adAccountId, adsToken);

            if (result.success && result.items && result.items.length > 0) {
                addMessage('assistant', '📋 Vui lòng chọn chiến dịch từ danh sách bên dưới:');
            } else {
                addMessage('assistant', `⚠️ ${result.message || 'Không tìm thấy chiến dịch nào'} (Account: ${adAccountId})`);
                clone.reset();
            }
        } else if (lowerMsg.includes('2') || lowerMsg.includes('tìm') || lowerMsg.includes('search')) {
            clone.chooseSearchOption();
            addMessage('assistant', '🔍 Vui lòng nhập tên chiến dịch hoặc từ khóa để tìm kiếm:');
        } else {
            addMessage('assistant', '⚠️ Vui lòng chọn 1 hoặc 2');
        }
        return { handled: true };
    }

    // =========================================================================
    // Stage 5: awaiting_child_selection
    // =========================================================================
    if (clone.stage === 'awaiting_child_selection' && clone.childItems.length > 0) {
        const numberMatch = userMessage.match(/(\d+)/);

        if (numberMatch) {
            const index = parseInt(numberMatch[1]) - 1;
            const result = clone.selectChildByIndex(index);

            if (result.success) {
                const typeLabel = clone.selectedType === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo';
                addMessage('assistant',
                    `✅ Đã chọn ${typeLabel}: ${result.item.name}\n\n` +
                    `Anh điền thông tin và nhấn Xác nhận để nhân bản.`
                );
            } else {
                addMessage('assistant', '❌ Số thứ tự không hợp lệ. Vui lòng thử lại.');
            }
        } else {
            addMessage('assistant', '⚠️ Vui lòng nhập số thứ tự (VD: `1`, `2`)');
        }
        return { handled: true };
    }

    // =========================================================================
    // Stage 6: awaiting_name
    // =========================================================================
    if (clone.stage === 'awaiting_name') {
        const name = userMessage.trim();

        if (name.length === 0) {
            addMessage('assistant', '⚠️ Tên không được để trống. Vui lòng nhập lại:');
            return { handled: true };
        }

        if (name.length > 100) {
            addMessage('assistant', '⚠️ Tên quá dài (tối đa 100 ký tự). Vui lòng nhập lại:');
            return { handled: true };
        }

        clone.setNewName(name);
        clone.proceedToAwaitingQuantity();

        const typeLabel = clone.selectedType === 'campaign' ? 'chiến dịch' :
            clone.selectedType === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo';

        addMessage('assistant',
            `✅ Tên mới: ${name}\n\n` +
            `🔢 Bạn muốn nhân bản bao nhiêu ${typeLabel}? (Nhập số từ 1-50)`
        );
        return { handled: true };
    }

    // =========================================================================
    // Stage 7: awaiting_quantity
    // =========================================================================
    if (clone.stage === 'awaiting_quantity') {
        const quantityMatch = userMessage.match(/(\d+)/);

        if (!quantityMatch) {
            addMessage('assistant', '⚠️ Vui lòng nhập số lượng (VD: 3, 5, 10):');
            return { handled: true };
        }

        const quantity = parseInt(quantityMatch[1]);

        if (quantity < 1 || quantity > 50) {
            addMessage('assistant', '⚠️ Số lượng phải từ 1 đến 50. Vui lòng nhập lại:');
            return { handled: true };
        }

        clone.setQuantities({
            campaigns: clone.selectedType === 'campaign' ? quantity : 1,
            adsets: clone.selectedType === 'adset' ? quantity : 1,
            ads: clone.selectedType === 'ad' ? quantity : 1
        });

        clone.proceedToConfirming();
        return { handled: true };
    }

    // Không phải Clone stage nào cần xử lý text
    return { handled: false };
}
