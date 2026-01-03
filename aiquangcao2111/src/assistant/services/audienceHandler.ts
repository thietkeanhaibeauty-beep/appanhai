/**
 * Audience Flow Handler
 * Extracted from AIChatPanel.tsx to reduce inline complexity
 * 
 * Handles:
 * - Type selection (phone_numbers, page_messenger, lookalike)
 * - Messenger audience creation flow
 * - Lookalike audience creation flow
 * - Confirming and creating
 */

import { getAllPages } from '@/services/nocodb/facebookPagesService';
import { getCustomAudiences, parseAudienceInput, validateAudienceData } from '@/services/aiChatAudienceOrchestratorService';

// Types
export interface AudienceHandlerContext {
    userMessage: string;
    audience: {
        stage: string;
        data?: any;
        selectedType?: string;
        selectType: (type: string) => void;
        setData: (data: any) => void;
        setStage: (stage: string) => void;
        createAudience: (adAccountId: string, adsToken: string) => Promise<{ success: boolean; message: string }>;
        reset: () => void;
    };
    getTokens: () => { adsToken: string; adAccountId: string; pageToken: string; pageId: string };
    userId?: string;
}

export interface AudienceHandlerResult {
    handled: boolean;
    message?: string;
}

/**
 * Handle Audience Flow
 */
export async function handleAudienceFlow(
    ctx: AudienceHandlerContext,
    addMessage: (role: 'assistant', content: string) => void
): Promise<AudienceHandlerResult> {
    const { userMessage, audience, getTokens, userId } = ctx;

    // Only handle if audience flow is active
    if (audience.stage === 'idle') {
        return { handled: false };
    }

    // ===== SELECTING_TYPE =====
    if (audience.stage === 'selecting_type') {
        const lowerMsg = userMessage.toLowerCase();
        if (lowerMsg.includes('file') || lowerMsg.includes('danh sách')) {
            audience.selectType('phone_numbers');
            addMessage('assistant', '📋 Vui lòng cung cấp tên đối tượng:');
        } else if (lowerMsg.includes('messenger') || lowerMsg.includes('tin nhắn')) {
            audience.selectType('page_messenger');
            addMessage('assistant', '📋 Vui lòng cung cấp tên đối tượng:');
        } else if (lowerMsg.includes('lookalike') || lowerMsg.includes('tương tự')) {
            audience.selectType('lookalike');
            addMessage('assistant', '📋 Vui lòng cung cấp tên đối tượng:');
        } else {
            addMessage('assistant', '⚠️ Vui lòng chọn loại audience bằng nút bên dưới.');
        }
        return { handled: true };
    }

    // ===== PHONE NUMBERS FLOW: Name -> Method -> Input/File =====

    // 1. Collecting Method (New Stage)
    if (audience.stage === 'collecting_file' && !audience.data?.audienceName) {
        // Backward compatibility: if stage is collecting_file but no name yet
        // This happens right after selectType('phone_numbers') in previous step
        audience.setData({ audienceName: userMessage });
        audience.setStage('select_phone_method'); // Switch to method selection
        addMessage('assistant', '📱 Anh muốn tải lên danh sách bằng cách nào?');
        return { handled: true };
    }

    // 2. Handle Method Selection
    if (audience.stage === 'select_phone_method') {
        const lower = userMessage.toLowerCase();
        if (lower.includes('nhập') || lower.includes('trực tiếp') || lower.includes('paste')) {
            audience.setStage('collecting_phone_input');
            addMessage('assistant',
                '📝 Vui lòng nhập danh sách số điện thoại vào đây.\n\n' +
                '💡 **Lưu ý:**\n' +
                '- Mỗi số một dòng hoặc cách nhau dấu phẩy\n' +
                '- Hệ thống sẽ tự động thêm `+84` nếu thiếu'
            );
        } else {
            audience.setStage('collecting_file');
            addMessage('assistant', '📄 Vui lòng upload file CSV chứa số điện thoại.');
        }
        return { handled: true };
    }

    // 3A. Handle File Upload (Existing)
    if (audience.stage === 'collecting_file') {
        // User sent message instead of file
        addMessage('assistant', '⚠️ Vui lòng upload file CSV, hoặc gõ "nhập trực tiếp" để chuyển sang chế độ nhập tay ạ.');
        return { handled: true };
    }

    // 3B. Handle Direct Input (New)
    if (audience.stage === 'collecting_phone_input') {
        // Parse phone numbers
        // Supports: newline, comma, space, semicolon
        const rawNumbers = userMessage.split(/[\n,;\s]+/);

        const validPhones: string[] = [];
        const invalidInputs: string[] = [];

        rawNumbers.forEach(num => {
            let clean = num.replace(/[^0-9+]/g, '');
            if (clean.length < 9) return; // Ignore too short

            // Auto add +84
            if (clean.startsWith('0')) {
                clean = '+84' + clean.substring(1);
            } else if (!clean.startsWith('+')) {
                clean = '+84' + clean;
            }

            // Simple validation
            if (/^\+84[0-9]{9,10}$/.test(clean)) {
                validPhones.push(clean);
            } else {
                invalidInputs.push(num);
            }
        });

        if (validPhones.length === 0) {
            addMessage('assistant', '❌ Không tìm thấy số điện thoại hợp lệ nào. Vui lòng nhập lại đúng định dạng.');
            return { handled: true };
        }

        audience.setData({ phoneNumbers: validPhones });
        audience.setStage('creating'); // Skip confirming for quick input, or go to confirming?

        // Let's go to confirm for safety
        // Actually, existing flow uses 'creating' immediately in createAudience()
        // But better to confirm count first
        // Let's override createAudience behavior for phone input to REQUIRE confirmation?
        // For now, let's create immediately as per "Quick" nature, OR show summary.

        // Show summary and ask to confirm
        // We need a 'confirming_phone' stage? Or reuse 'confirming'?
        // Let's reuse 'confirming' but we need to handle the Create trigger.
        // Current 'confirming' is only for Messenger/Lookalike.

        // Let's create immediately for now to keep flow simple, but show count.
        addMessage('assistant', `✅ Đã tìm thấy ${validPhones.length} số điện thoại hợp lệ. Đang tạo đối tượng...`);

        const { adsToken, adAccountId } = getTokens();
        const result = await audience.createAudience(adAccountId, adsToken);
        addMessage('assistant', result.message);

        return { handled: true };
    }

    // ===== MESSENGER FLOW =====
    if (audience.stage === 'collecting_messenger_name') {
        audience.setData({ audienceName: userMessage });
        try {
            const pages = await getAllPages(userId!);
            const activePages = pages.filter((p: any) => p.is_active);
            if (activePages.length === 0) {
                addMessage('assistant', '⚠️ Không tìm thấy Page nào. Vui lòng kết nối Page trong Settings trước ạ.');
                audience.reset();
            } else {
                audience.setData({ availablePages: activePages });
                audience.setStage('collecting_messenger_page');
                addMessage('assistant', '📄 Vui lòng chọn Page muốn lấy người nhắn tin:');
            }
        } catch (error) {
            addMessage('assistant', '❌ Lỗi khi tải danh sách Page. Vui lòng thử lại.');
            audience.reset();
        }
        return { handled: true };
    }

    if (audience.stage === 'collecting_messenger_days') {
        const days = parseInt(userMessage.trim());
        if (isNaN(days) || days < 1 || days > 365) {
            addMessage('assistant', '⚠️ Vui lòng nhập số ngày hợp lệ từ 1 đến 365 ạ.\n\nVí dụ: 30, 90, hoặc 365');
            return { handled: true };
        }
        audience.setData({ retentionDays: days });
        audience.setStage('confirming');
        addMessage('assistant',
            `✅ Đã đủ thông tin!\n\n` +
            `📋 Tên: ${audience.data?.audienceName}\n` +
            `📄 Page: ${audience.data?.pageName}\n` +
            `📅 Số ngày: ${days} ngày\n\n` +
            `Anh xác nhận tạo đối tượng này không?`
        );
        return { handled: true };
    }

    // ===== CONFIRMING (Messenger) =====
    if (audience.stage === 'confirming') {
        if (userMessage.toLowerCase().includes('ok') || userMessage.toLowerCase().includes('xác nhận')) {
            const { adsToken, adAccountId } = getTokens();
            addMessage('assistant', '⏳ Đang tạo audience...');
            const result = await audience.createAudience(adAccountId, adsToken);
            addMessage('assistant', result.message);
        } else if (userMessage.toLowerCase().includes('hủy')) {
            audience.reset();
            addMessage('assistant', '✅ Đã hủy tạo đối tượng.');
        } else {
            addMessage('assistant', '⚠️ Vui lòng trả lời "Xác nhận" hoặc "Hủy" ạ.');
        }
        return { handled: true };
    }

    // ===== LOOKALIKE FLOW =====
    if (audience.stage === 'collecting_lookalike') {
        // If no name yet, use input as name
        if (!audience.data?.audienceName && userMessage.trim().length > 0) {
            audience.setData({ audienceName: userMessage.trim() });
            const validation = validateAudienceData('lookalike', { ...audience.data, audienceName: userMessage.trim() });

            if (validation.needsMoreInfo) {
                if (validation.missingField === 'sourceId') {
                    const { adsToken, adAccountId } = getTokens();
                    try {
                        const audiences = await getCustomAudiences(adAccountId, adsToken);
                        if (audiences.length === 0) {
                            addMessage('assistant', '⚠️ Không tìm thấy đối tượng nguồn nào. Vui lòng tạo Custom Audience trước ạ.');
                            audience.reset();
                        } else {
                            audience.setData({ availableAudiences: audiences });
                            addMessage('assistant', validation.missingFieldPrompt!);
                        }
                    } catch (error) {
                        addMessage('assistant', '❌ Lỗi khi tải danh sách đối tượng. Vui lòng thử lại.');
                        audience.reset();
                    }
                } else if (validation.missingField === 'country') {
                    audience.setData({ showCountryButtons: true });
                    addMessage('assistant', validation.missingFieldPrompt!);
                } else if (validation.missingField === 'ratio') {
                    audience.setData({ showRatioButtons: true });
                    addMessage('assistant', validation.missingFieldPrompt!);
                } else {
                    addMessage('assistant', validation.missingFieldPrompt!);
                }
            }
            return { handled: true };
        }

        // Parse user input for other fields
        const parsed = await parseAudienceInput(userMessage, audience.stage, audience.data);

        // Fallback: parse ratio manually
        if (!parsed.ratio && audience.data?.country && audience.data?.sourceId) {
            const ratioMatch = userMessage.match(/(\d+)\s*%/);
            if (ratioMatch) {
                parsed.ratio = parseInt(ratioMatch[1]);
            }
        }

        const updatedData = { ...audience.data, ...parsed };
        audience.setData(updatedData);

        const validation = validateAudienceData('lookalike', updatedData);
        if (validation.needsMoreInfo) {
            if (validation.missingField === 'sourceId') {
                const { adsToken, adAccountId } = getTokens();
                try {
                    const audiences = await getCustomAudiences(adAccountId, adsToken);
                    if (audiences.length === 0) {
                        addMessage('assistant', '⚠️ Không tìm thấy đối tượng nguồn nào.');
                        audience.reset();
                    } else {
                        audience.setData({ availableAudiences: audiences });
                        addMessage('assistant', validation.missingFieldPrompt!);
                    }
                } catch (error) {
                    addMessage('assistant', '❌ Lỗi khi tải danh sách đối tượng.');
                    audience.reset();
                }
            } else if (validation.missingField === 'country') {
                audience.setData({ showCountryButtons: true });
                addMessage('assistant', validation.missingFieldPrompt!);
            } else if (validation.missingField === 'ratio') {
                audience.setData({ showRatioButtons: true });
                addMessage('assistant', validation.missingFieldPrompt!);
            } else {
                addMessage('assistant', validation.missingFieldPrompt!);
            }
        } else {
            // All data collected
            addMessage('assistant',
                `✅ Đã đủ thông tin!\n\n` +
                `📋 Tên: ${updatedData.audienceName}\n` +
                `🎯 Nguồn: ${updatedData.sourceName}\n` +
                `🌍 Quốc gia: ${updatedData.countryName}\n` +
                `📊 Tỷ lệ: ${updatedData.ratio}%\n\n` +
                `Anh xác nhận tạo đối tượng Lookalike này không?`
            );
            audience.setData({ showConfirmButtons: true });
        }
        return { handled: true };
    }

    // ===== CREATING =====
    if (audience.stage === 'creating') {
        const { adsToken, adAccountId } = getTokens();
        addMessage('assistant', '⏳ Đang tạo audience...');
        const result = await audience.createAudience(adAccountId, adsToken);
        addMessage('assistant', result.message);
        return { handled: true };
    }

    return { handled: false };
}
