/**
 * Creative Campaign Flow Handler
 * Extracted from AIChatPanel.tsx to reduce inline complexity
 * 
 * Handles:
 * - File + Text detection (New Message Ad)
 * - Media validation and upload
 * - Parse text with AI
 * - Custom Audience integration
 */

import { detectChatIntent } from '@/services/aiChatOrchestratorService';

// Types
export interface CreativeHandlerContext {
    userMessage: string;
    creative: {
        stage: string;
        uploadMedia: (file: File, adAccountId: string, adsToken: string) => Promise<{ success: boolean; hash?: string; videoId?: string; message: string }>;
        start: (rawInput: string, adsToken: string, hasMediaUploadedOrOptions?: any) => Promise<{ success: boolean; message: string; data?: any; missingField?: string }>;
        handleRadiusInput: (radiusText: string) => Promise<{ success: boolean; message: string; data?: any }>;
        continueToUpload: () => void;
        reset: () => void;
    };
    getTokens: () => { adsToken: string; adAccountId: string; pageToken: string; pageId: string };
    attachedFile?: File | null;
    removeAttachedFile: () => void;
    canUseCreativeCampaign: boolean;
    messages: any[];
    validateMediaFile: (file: File) => { valid: boolean; error?: string };
}

export interface CreativeHandlerResult {
    handled: boolean;
    message?: string;
    showConfirmCard?: boolean;
}

/**
 * Check if text has Facebook link
 */
export function hasFacebookLink(text: string): boolean {
    const FB_LINK_REGEX = /https?:\/\/(?:www\.)?(?:m\.)?(?:business\.)?(?:l\.)?(?:lm\.)?(?:facebook\.com|fb\.com|fb\.watch)\/.+/i;
    return FB_LINK_REGEX.test(text);
}

/**
 * Handle File + Text flow for Creative Campaign (New Message Ad)
 */
export async function handleCreativeWithFile(
    ctx: CreativeHandlerContext,
    addMessage: (role: 'assistant', content: string) => void,
    setMessages: React.Dispatch<React.SetStateAction<any[]>>
): Promise<CreativeHandlerResult> {
    const { userMessage, creative, getTokens, attachedFile, removeAttachedFile, canUseCreativeCampaign, messages, validateMediaFile } = ctx;

    const hasFile = !!attachedFile;
    const hasText = userMessage.trim().length > 0;

    // Only handle if both file and text are present
    if (!hasFile || !hasText) {
        return { handled: false };
    }

    const hasFBLink = hasFacebookLink(userMessage);

    // Check feature permission
    if (!canUseCreativeCampaign) {
        addMessage('assistant',
            '⚠️ Tính năng "Creative Campaign" chưa được kích hoạt cho tài khoản của anh.\n\n' +
            'Vui lòng liên hệ quản trị viên để được hỗ trợ kích hoạt tính năng này.'
        );
        removeAttachedFile();
        return { handled: true };
    }

    // Step 1: Detect intent - Skip if no Facebook link
    let intentResult: { intent: string; confidence: number };
    if (!hasFBLink) {
        // No link = New Message Ad = Creative Campaign
        intentResult = { intent: 'create_creative_campaign', confidence: 1.0 };
        addMessage('assistant', '📸 Đang phân tích thông tin quảng cáo tin nhắn mới...');
    } else {
        // Has Facebook link with file attached - unusual case
        addMessage('assistant', '🔍 Đang phát hiện ý định...');
        intentResult = await detectChatIntent(userMessage, messages);
    }

    if (intentResult.intent !== 'create_creative_campaign') {
        setMessages(prev => prev.filter(m => !m.content.includes('🔍 Đang phát hiện')));
        addMessage('assistant', '❌ Em không hiểu rõ ý định. Anh có muốn tạo chiến dịch quảng cáo không?\n\nVui lòng mô tả rõ hơn nhé!');
        return { handled: true };
    }

    // Step 2: Validate media
    setMessages(prev => prev.filter(m => !m.content.includes('🔍 Đang phát hiện')));
    addMessage('assistant', '✅ Đã phát hiện! Đang kiểm tra media...');

    const mediaValidation = validateMediaFile(attachedFile!);
    if (!mediaValidation.valid) {
        setMessages(prev => prev.filter(m => !m.content.includes('Đang kiểm tra media')));
        addMessage('assistant', mediaValidation.error!);
        removeAttachedFile();
        return { handled: true };
    }

    // Step 3: Upload media
    setMessages(prev => prev.filter(m => !m.content.includes('Đang kiểm tra media')));
    addMessage('assistant', '✅ Media hợp lệ! Đang upload lên Facebook...');

    const { adsToken, adAccountId } = getTokens();
    const uploadResult = await creative.uploadMedia(attachedFile!, adAccountId, adsToken);

    if (!uploadResult.success) {
        setMessages(prev => prev.filter(m => !m.content.includes('Đang upload')));
        addMessage('assistant', `❌ Upload thất bại: ${uploadResult.message}`);
        removeAttachedFile();
        return { handled: true };
    }

    // Step 4: Parse text (after media uploaded)
    setMessages(prev => prev.filter(m => !m.content.includes('Đang upload')));

    if (uploadResult.videoId) {
        addMessage('assistant', '✅ Upload video thành công! Đang phân tích thông tin chiến dịch...');
    } else {
        addMessage('assistant', '✅ Upload ảnh thành công! Đang phân tích thông tin chiến dịch...');
        removeAttachedFile(); // Images can be removed now
    }

    // Pass flag that media is already uploaded AND pass the hash/id explicitly
    const parseResult = await creative.start(
        userMessage,
        adsToken,
        {
            hasMediaUploaded: true,
            uploadedHash: uploadResult.hash,
            uploadedVideoId: uploadResult.videoId
        }
    );

    // Clean up loading messages
    setMessages(prev => prev.filter(m => !m.content.includes('Đang phân tích')));

    if (parseResult.success) {
        // Display confirm card (stage is now 'reviewing_data')
        if (parseResult.message !== '__SHOW_CREATIVE_CONFIRM_CARD__') {
            addMessage('assistant', parseResult.message);
        }
        return { handled: true, showConfirmCard: true };
    } else {
        addMessage('assistant', `❌ ${parseResult.message}`);
        if (uploadResult.videoId) {
            removeAttachedFile(); // Remove video on parse error
        }
        return { handled: true };
    }
}

/**
 * Handle Creative flow awaiting_radius stage
 */
export async function handleCreativeRadiusInput(
    ctx: CreativeHandlerContext,
    addMessage: (role: 'assistant', content: string) => void
): Promise<CreativeHandlerResult> {
    const { userMessage, creative } = ctx;

    if (creative.stage !== 'awaiting_radius') {
        return { handled: false };
    }

    const result = await creative.handleRadiusInput(userMessage);
    addMessage('assistant', result.message);

    if (result.success) {
        // Moved to awaiting_media
        creative.continueToUpload();
    }

    return { handled: true };
}

/**
 * Main Creative flow handler
 */
export async function handleCreativeFlow(
    ctx: CreativeHandlerContext,
    addMessage: (role: 'assistant', content: string) => void,
    setMessages: React.Dispatch<React.SetStateAction<any[]>>
): Promise<CreativeHandlerResult> {
    // Handle awaiting_radius stage
    if (ctx.creative.stage === 'awaiting_radius') {
        return handleCreativeRadiusInput(ctx, addMessage);
    }

    // Handle file + text flow
    if (ctx.attachedFile && ctx.userMessage.trim().length > 0) {
        return handleCreativeWithFile(ctx, addMessage, setMessages);
    }

    return { handled: false };
}
