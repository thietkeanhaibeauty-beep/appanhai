/**
 * intentDetector.ts - Tầng 1: Nhận diện ý định người dùng
 * 
 * Gom tất cả logic detect intent vào 1 nơi duy nhất.
 * KHÔNG thay đổi logic nghiệp vụ, chỉ copy từ các nguồn:
 * - parseRuleIntent (ruleControl.service.ts)
 * - parseCampaignIntent (campaignControl.service.ts)
 * - isCustomAudienceIntent (inline trong AIChatPanel.tsx)
 * - detectFBLink (inline trong AIChatPanel.tsx)
 * 
 * @author AI Assistant Refactoring
 * @date 2024-12-17
 */

// =============================================================================
// IMPORTS
// =============================================================================

import { SCHEDULE_KEYWORDS, REPORT_KEYWORDS, matchesKeywords } from '@/assistant/config/keywordsConfig';

// =============================================================================
// TYPES
// =============================================================================

export type IntentType =
    | 'CAMPAIGN_CONTROL'  // Bật/tắt, xem chiến dịch
    | 'RULE'              // Tạo quy tắc đơn
    | 'GOLDEN_RULE_SET'   // Tạo bộ quy tắc vàng (multi-step)
    | 'CUSTOM_AUDIENCE'   // Chạy QC với tệp đối tượng có sẵn
    | 'QUICK_POST'        // Chạy QC từ link bài viết FB
    | 'CREATIVE'          // Tạo QC tin nhắn mới
    | 'AUDIENCE'          // Tạo tệp đối tượng mới
    | 'CLONE'             // Nhân bản campaign/adset/ad
    | 'REPORT'            // Báo cáo thống kê marketing/sales
    | 'SCHEDULE'          // Xem lịch hẹn, dữ liệu sales
    | 'GENERAL_CHAT'      // Hỏi đáp, tư vấn
    | 'UNKNOWN';

export type ControlScope = 'CAMPAIGN' | 'ADSET' | 'AD' | 'UNKNOWN';

export interface DetectedIntent {
    type: IntentType;
    confidence: number; // 0-1
    rawInput: string;

    // Rule-specific
    ruleType?: 'single' | 'golden_set';

    // Campaign Control-specific  
    controlAction?: 'LIST' | 'TOGGLE';
    controlScope?: ControlScope;
    toggleAction?: 'PAUSE' | 'ACTIVATE';
    targetName?: string;
    statusFilter?: 'ACTIVE' | 'PAUSED' | 'ALL';

    // Link-specific
    hasFBLink?: boolean;
    fbLinkUrl?: string;

    // Media-specific
    hasMedia?: boolean;

    // Schedule-specific
    scheduleType?: 'appointment' | 'record' | 'phone';
    scheduleDateField?: 'appointment_time' | 'CreatedAt';
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Unified intent detection function
 * Priority order khi không có flow active:
 * 1. CAMPAIGN_CONTROL
 * 2. RULE / GOLDEN_RULE_SET
 * 3. CUSTOM_AUDIENCE
 * 4. QUICK_POST (có link FB)
 * 5. CREATIVE (có media, không có link)
 * 6. AUDIENCE
 * 7. CLONE
 * 8. GENERAL_CHAT
 */
export function detectIntent(
    input: string,
    attachedFile?: File | null
): DetectedIntent {
    const trimmedInput = input.trim();
    const lower = trimmedInput.toLowerCase();

    // 0. ⭐ HIGHEST PRIORITY: Check for @# template hashtag
    // Route based on whether there's a FB link or not:
    // - @# + link → QUICK_POST (boost existing post)
    // - @# + content (no link) → CREATIVE (new message ad)
    const templateHashtagMatch = trimmedInput.match(/@#([^\s,]+)/i);
    if (templateHashtagMatch) {
        const hasFBLink = /https?:\/\/(?:www\.)?(?:m\.)?(?:facebook\.com|fb\.com|fb\.watch)\/[^\s]+/i.test(trimmedInput);
        if (hasFBLink) {
            return {
                type: 'QUICK_POST',
                confidence: 0.95,
                rawInput: trimmedInput,
                hasFBLink: true,
            };
        } else {
            // @# template without link → New message ad (Creative flow)
            return {
                type: 'CREATIVE',
                confidence: 0.95,
                rawInput: trimmedInput,
                hasMedia: !!attachedFile,
            };
        }
    }

    // 1. Check CAMPAIGN_CONTROL first (bật/tắt, xem chiến dịch)
    const campaignIntent = detectCampaignControlIntent(lower);
    if (campaignIntent.type !== 'UNKNOWN') {
        return {
            type: 'CAMPAIGN_CONTROL',
            confidence: 0.9,
            rawInput: trimmedInput,
            controlAction: campaignIntent.controlAction,
            controlScope: campaignIntent.scope,
            toggleAction: campaignIntent.toggleAction,
            targetName: campaignIntent.targetName,
            statusFilter: campaignIntent.statusFilter,
        };
    }

    // 2. Check RULE intent
    const ruleIntent = detectRuleIntent(lower, trimmedInput);
    if (ruleIntent.type !== 'UNKNOWN') {
        return {
            type: ruleIntent.type,
            confidence: 0.85,
            rawInput: trimmedInput,
            ruleType: ruleIntent.ruleType,
        };
    }

    // 3. Check AUDIENCE intent FIRST (tạo tệp đối tượng mới)
    // Must check before CUSTOM_AUDIENCE to prevent "tạo tệp đối tượng" from matching "tệp đối tượng"
    if (detectAudienceIntent(lower)) {
        return {
            type: 'AUDIENCE',
            confidence: 0.85,
            rawInput: trimmedInput,
        };
    }

    // 4. Check CUSTOM_AUDIENCE intent (chạy QC với tệp có sẵn)
    if (detectCustomAudienceIntent(lower)) {
        return {
            type: 'CUSTOM_AUDIENCE',
            confidence: 0.85,
            rawInput: trimmedInput,
        };
    }

    // 4. Check for FB Link → QUICK_POST
    const fbLink = detectFBLink(trimmedInput);
    if (fbLink) {
        return {
            type: 'QUICK_POST',
            confidence: 0.9,
            rawInput: trimmedInput,
            hasFBLink: true,
            fbLinkUrl: fbLink,
        };
    }

    // 5. Check CREATIVE intent (có media hoặc keywords)
    const hasMedia = !!attachedFile;
    if (hasMedia || detectCreativeIntent(lower)) {
        return {
            type: 'CREATIVE',
            confidence: hasMedia ? 0.85 : 0.7,
            rawInput: trimmedInput,
            hasMedia,
        };
    }

    // NOTE: AUDIENCE check moved to priority 3 (before CUSTOM_AUDIENCE)

    // 7. Check CLONE intent
    if (detectCloneIntent(lower)) {
        return {
            type: 'CLONE',
            confidence: 0.8,
            rawInput: trimmedInput,
        };
    }

    // 8. Check SCHEDULE intent (xem lịch hẹn, dữ liệu sales)
    const scheduleIntent = detectScheduleIntent(lower);
    if (scheduleIntent.isSchedule) {
        return {
            type: 'SCHEDULE',
            confidence: 0.85,
            rawInput: trimmedInput,
            scheduleType: scheduleIntent.scheduleType,
            scheduleDateField: scheduleIntent.dateField,
        };
    }

    // 9. Check REPORT intent (báo cáo thống kê)
    if (detectReportIntent(lower)) {
        return {
            type: 'REPORT',
            confidence: 0.85,
            rawInput: trimmedInput,
        };
    }

    // 10. Default: GENERAL_CHAT
    return {
        type: 'GENERAL_CHAT',
        confidence: 0.5,
        rawInput: trimmedInput,
    };
}

// =============================================================================
// HELPER FUNCTIONS - Copy từ các service hiện tại
// =============================================================================

/**
 * Detect Campaign Control intent
 * Copy từ: campaignControl.service.ts → parseCampaignIntent()
 */
function detectCampaignControlIntent(lower: string): {
    type: 'LIST' | 'TOGGLE' | 'UNKNOWN';
    controlAction?: 'LIST' | 'TOGGLE';
    scope: ControlScope;
    toggleAction?: 'PAUSE' | 'ACTIVATE';
    targetName?: string;
    statusFilter?: 'ACTIVE' | 'PAUSED' | 'ALL';
} {
    // EARLY EXIT: Exclude custom audience keywords
    const customAudienceKeywords = ['tệp đối tượng', 'quảng cáo tệp', 'chạy tệp', 'qc tệp', 'ads tệp'];
    if (customAudienceKeywords.some(k => lower.includes(k))) {
        return { type: 'UNKNOWN', scope: 'UNKNOWN' };
    }

    // 1. Detect Scope
    let scope: ControlScope = 'UNKNOWN';
    if (lower.includes('nhóm') || lower.includes('adset') || lower.includes('ad set')) {
        scope = 'ADSET';
    } else if (lower.includes('bài viết') || lower.includes('quảng cáo') || lower.includes('ad')) {
        if (!lower.includes('nhóm') && !lower.includes('chiến dịch')) {
            scope = 'AD';
        } else if (lower.includes('quảng cáo') && !lower.includes('nhóm')) {
            scope = 'AD';
        }
    }

    if (lower.includes('chiến dịch') || lower.includes('campaign')) {
        scope = 'CAMPAIGN';
    }

    if (scope === 'UNKNOWN') {
        scope = 'CAMPAIGN'; // Default
    }

    // 2. Detect LIST intent
    if (lower.includes('liệt kê') || lower.includes('danh sách') || lower.includes('hiện') ||
        lower.includes('xem') || lower.includes('các') || lower.includes('đang chạy')) {
        let statusFilter: 'ACTIVE' | 'PAUSED' | 'ALL' = 'ALL';
        if (lower.includes('đang chạy') || lower.includes('hoạt động') || lower.includes('active')) {
            statusFilter = 'ACTIVE';
        } else if (lower.includes('đang tắt') || lower.includes('tạm dừng') || lower.includes('paused')) {
            statusFilter = 'PAUSED';
        }
        return { type: 'LIST', controlAction: 'LIST', scope, statusFilter };
    }

    // 3. Detect TOGGLE intent
    let cleanInput = lower;
    ['tắt', 'dừng', 'pause', 'bật', 'chạy', 'kích hoạt', 'activate', 'chiến dịch', 'campaign', 'nhóm', 'adset', 'bài viết', 'quảng cáo'].forEach(w => {
        cleanInput = cleanInput.replace(w, '');
    });
    const targetName = cleanInput.trim();

    if (lower.includes('tắt') || lower.includes('dừng') || lower.includes('pause')) {
        return { type: 'TOGGLE', controlAction: 'TOGGLE', scope, toggleAction: 'PAUSE', targetName };
    }

    if (lower.includes('bật') || lower.includes('chạy') || lower.includes('kích hoạt') || lower.includes('activate')) {
        // Loại trừ "chạy quảng cáo" / "chạy tệp" vì đó là intent khác
        if (!lower.includes('quảng cáo') && !lower.includes('tệp')) {
            return { type: 'TOGGLE', controlAction: 'TOGGLE', scope, toggleAction: 'ACTIVATE', targetName };
        }
    }

    return { type: 'UNKNOWN', scope };
}

/**
 * Detect Rule intent
 * Copy từ: ruleControl.service.ts → parseRuleIntent()
 */
function detectRuleIntent(lower: string, originalInput: string): {
    type: 'RULE' | 'GOLDEN_RULE_SET' | 'UNKNOWN';
    ruleType?: 'single' | 'golden_set';
} {
    // Step 1: Check for TRIGGER keywords
    const triggerKeywords = [
        'tạo quy tắc', 'tạo rule', 'tạo quy tắc mới',
        'thiết lập quy tắc', 'đặt quy tắc', 'làm quy tắc',
        'create rule', 'new rule'
    ];

    if (triggerKeywords.some(kw => lower.includes(kw))) {
        return { type: 'RULE', ruleType: 'single' };
    }

    // Step 2: Check if input looks like a RULE DESCRIPTION (has metrics + actions)
    const hasMetric = /(?:tiêu|chi|spend|kết quả|result|cpa|chi phí|100k|50k|\d+k)/i.test(lower);
    const hasAction = /(?:tắt|bật|giảm|tăng|scale|off|on|decrease|increase)/i.test(lower);

    if (hasMetric && hasAction) {
        // Determine if it's multi-step or single
        const isMultiStep =
            (lower.match(/,/g) || []).length >= 1 ||
            lower.includes('bước') ||
            lower.includes('ưu tiên') ||
            lower.includes('cắt lỗ') ||
            lower.includes('scale');

        return {
            type: isMultiStep ? 'GOLDEN_RULE_SET' : 'RULE',
            ruleType: isMultiStep ? 'golden_set' : 'single',
        };
    }

    return { type: 'UNKNOWN' };
}

/**
 * Detect Custom Audience intent
 * Copy từ: AIChatPanel.tsx line 665-671
 */
function detectCustomAudienceIntent(lower: string): boolean {
    // EXCLUDE keywords that indicate CREATE (tạo mới) - those should go to AUDIENCE intent
    const createKeywords = ['tạo tệp', 'tạo đối tượng', 'tạo audience', 'create audience', 'tạo lookalike'];
    if (createKeywords.some(k => lower.includes(k))) {
        return false; // Let AUDIENCE intent handle this
    }

    const keywords = [
        'tệp đối tượng', 'quảng cáo tệp', 'custom audience', 'lookalike audience',
        'retargeting audience', 'qc tệp', 'qc tep', 'chạy tệp', 'chay tep',
        'ads tệp', 'quảng cáo đối tượng', 'chạy quảng cáo tệp', 'target tệp'
    ];
    return keywords.some(k => lower.includes(k));
}

/**
 * Detect Facebook Link
 * Common patterns: facebook.com/xxx/posts/xxx, fb.com/xxx, etc.
 */
function detectFBLink(input: string): string | null {
    const fbLinkRegex = /https?:\/\/(www\.)?(facebook\.com|fb\.com|fb\.watch)\/[^\s]+/i;
    const match = input.match(fbLinkRegex);
    return match ? match[0] : null;
}

/**
 * Detect Creative intent (tạo QC tin nhắn mới)
 */
function detectCreativeIntent(lower: string): boolean {
    const keywords = [
        'tạo quảng cáo tin nhắn',
        'quảng cáo tin nhắn mới',
        'tạo qc tin nhắn',
        'tạo chiến dịch tin nhắn',
        'message ad',
        'messenger ad'
    ];
    return keywords.some(k => lower.includes(k));
}

/**
 * Detect Audience intent (tạo tệp đối tượng MỚI, khác với CUSTOM_AUDIENCE)
 */
function detectAudienceIntent(lower: string): boolean {
    const keywords = [
        'tạo tệp đối tượng',
        'tạo đối tượng',
        'tạo audience',
        'create audience',
        'upload danh sách',
        'tạo lookalike'
    ];
    return keywords.some(k => lower.includes(k));
}

/**
 * Detect Clone intent
 */
function detectCloneIntent(lower: string): boolean {
    const keywords = [
        'nhân bản', 'clone', 'copy chiến dịch', 'duplicate',
        'sao chép', 'nhân đôi'
    ];
    return keywords.some(k => lower.includes(k));
}

/**
 * Detect Schedule intent (xem lịch hẹn, dữ liệu sales)
 * Phân biệt với REPORT: hỏi về records cụ thể chứ không phải tổng hợp
 * 
 * Keywords được config tại: src/assistant/config/keywordsConfig.ts
 */
function detectScheduleIntent(lower: string): {
    isSchedule: boolean;
    scheduleType?: 'appointment' | 'record' | 'phone';
    dateField?: 'appointment_time' | 'CreatedAt';
} {
    // Check each category
    if (matchesKeywords(lower, SCHEDULE_KEYWORDS.appointment.keywords)) {
        return {
            isSchedule: true,
            scheduleType: 'appointment',
            dateField: 'appointment_time'
        };
    }

    if (matchesKeywords(lower, SCHEDULE_KEYWORDS.record.keywords)) {
        return {
            isSchedule: true,
            scheduleType: 'record',
            dateField: 'CreatedAt'
        };
    }

    if (matchesKeywords(lower, SCHEDULE_KEYWORDS.phone.keywords)) {
        return {
            isSchedule: true,
            scheduleType: 'phone',
            dateField: 'CreatedAt'
        };
    }

    return { isSchedule: false };
}

/**
 * Detect Report intent (báo cáo thống kê marketing/sales)
 * 
 * Keywords được config tại: src/assistant/config/keywordsConfig.ts
 */
function detectReportIntent(lower: string): boolean {
    // Check all report categories
    const allReportKeywords = [
        ...REPORT_KEYWORDS.sales.keywords,
        ...REPORT_KEYWORDS.marketing.keywords,
        ...REPORT_KEYWORDS.summary.keywords,
        // Thêm keywords cơ bản
        'báo cáo', 'thống kê', 'report', 'tổng kết',
    ];

    return matchesKeywords(lower, allReportKeywords);
}

// =============================================================================
// EXPORT FOR BACKWARD COMPATIBILITY
// Cho phép các file khác vẫn dùng được các hàm cũ trong quá trình migration
// =============================================================================

export { detectCampaignControlIntent, detectRuleIntent, detectCustomAudienceIntent, detectFBLink };
