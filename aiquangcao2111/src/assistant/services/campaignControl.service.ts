import { getCampaigns, updateObjectStatus } from '@/services/facebookInsightsService';

export type ControlScope = 'CAMPAIGN' | 'ADSET' | 'AD' | 'UNKNOWN';

export type CampaignIntent =
    | { type: 'LIST'; status?: 'ACTIVE' | 'PAUSED' | 'ALL'; scope: ControlScope }
    | { type: 'TOGGLE'; action: 'PAUSE' | 'ACTIVATE'; targetName: string; scope: ControlScope }
    | { type: 'UNKNOWN' };

export interface EntityMatch {
    id: string;
    name: string;
    status: string;
    effective_status: string;
    spend?: number;
    results?: number;
    cost_per_result?: number;
    scope: ControlScope;
}

// Alias for backward compatibility if needed, but better to use EntityMatch
export type CampaignMatch = EntityMatch;

// Simple regex-based intent parsing
export function parseCampaignIntent(input: string): CampaignIntent {
    const lower = input.toLowerCase();

    // ⭐ EARLY EXIT: @# template hashtag - should be handled by quickPostHandler
    if (/@#([^\s,]+)/i.test(input)) {
        return { type: 'UNKNOWN' };
    }

    // EARLY EXIT: Exclude custom audience keywords - these should be handled by customAudienceHandler
    const customAudienceKeywords = ['tệp đối tượng', 'quảng cáo tệp', 'chạy tệp', 'qc tệp', 'ads tệp', 'chạy quảng cáo tệp', 'target tệp'];
    if (customAudienceKeywords.some(k => lower.includes(k))) {
        return { type: 'UNKNOWN' };
    }

    // 1. Detect Scope
    let scope: ControlScope = 'UNKNOWN';
    if (lower.includes('nhóm') || lower.includes('adset') || lower.includes('ad set')) {
        scope = 'ADSET';
    } else if (lower.includes('bài viết') || lower.includes('quảng cáo') || lower.includes('ad')) {
        // "quảng cáo" is tricky because "nhóm quảng cáo" contains it.
        // But if it matched "nhóm" above, it's ADSET.
        // So here we only match if it didn't match ADSET.
        // However, "chiến dịch quảng cáo" contains it too? "chiến dịch" usually explicit.
        if (!lower.includes('nhóm') && !lower.includes('chiến dịch')) {
            scope = 'AD';
        } else if (lower.includes('quảng cáo') && !lower.includes('nhóm')) {
            // "quảng cáo" alone -> likely Ad, but could be Campaign if user says "chạy quảng cáo".
            // Let's assume 'AD' if specific "bài viết" or "quảng cáo" without "nhóm"/"chiến dịch".
            scope = 'AD';
        }
    }

    if (lower.includes('chiến dịch') || lower.includes('campaign')) {
        scope = 'CAMPAIGN';
    }

    // Default to CAMPAIGN if unknown but command is clear, OR 'UNKNOWN' to search all?
    // For safety, let's keep it UNKNOWN if not specified, 
    // OR default to CAMPAIGN for backward compatibility if it looks like a campaign command.
    if (scope === 'UNKNOWN') {
        // Heuristic: If user says "Bật cái X", we might need to search all.
        // For now, default to CAMPAIGN to match previous behavior/stability.
        scope = 'CAMPAIGN';
    }

    // 2. Detect LIST intent
    if (lower.includes('liệt kê') || lower.includes('danh sách') || lower.includes('hiện') || lower.includes('xem') || lower.includes('các') || lower.includes('đang chạy')) {
        if (lower.includes('đang chạy') || lower.includes('hoạt động') || lower.includes('active')) {
            return { type: 'LIST', status: 'ACTIVE', scope };
        }
        if (lower.includes('đang tắt') || lower.includes('tạm dừng') || lower.includes('paused')) {
            return { type: 'LIST', status: 'PAUSED', scope };
        }
        return { type: 'LIST', status: 'ALL', scope };
    }

    // 3. Detect TOGGLE intent
    // Remove keywords to find target name
    let cleanInput = lower;
    ['tắt', 'dừng', 'pause', 'bật', 'chạy', 'kích hoạt', 'activate', 'chiến dịch', 'campaign', 'nhóm', 'adset', 'bài viết', 'quảng cáo'].forEach(w => {
        cleanInput = cleanInput.replace(w, '');
    });
    const targetName = cleanInput.trim();

    if (lower.includes('tắt') || lower.includes('dừng') || lower.includes('pause')) {
        return { type: 'TOGGLE', action: 'PAUSE', targetName, scope };
    }

    if (lower.includes('bật') || lower.includes('chạy') || lower.includes('kích hoạt') || lower.includes('activate')) {
        return { type: 'TOGGLE', action: 'ACTIVATE', targetName, scope };
    }

    return { type: 'UNKNOWN' };
}

