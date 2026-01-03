/**
 * aiKeywordsService.ts - CRUD operations for AI Keywords Config
 * 
 * Quản lý từ khóa để AI nhận diện ý định người dùng.
 * SuperAdmin có thể thêm/sửa keywords mà không cần sửa code.
 */

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

// =============================================================================
// TYPES
// =============================================================================

export interface AIKeywordConfig {
    Id?: number;
    intent_type: string;        // 'CAMPAIGN_CONTROL', 'RULE', 'REPORT', etc.
    category: string;           // 'sales', 'marketing', 'appointment', 'general'
    metric_name: string;        // 'spend', 'doanh_thu', 'lịch_hẹn', etc.
    keywords: string[];         // Array of keywords
    description: string;        // Description for admin
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

// Default keywords (seeded when table is empty)
export const DEFAULT_KEYWORDS: Omit<AIKeywordConfig, 'Id' | 'created_at' | 'updated_at'>[] = [
    // === CAMPAIGN_CONTROL ===
    {
        intent_type: 'CAMPAIGN_CONTROL',
        category: 'list',
        metric_name: 'xem_chien_dich',
        keywords: ['liệt kê', 'danh sách', 'hiện', 'xem', 'các', 'đang chạy', 'chiến dịch'],
        description: 'Xem danh sách chiến dịch',
        is_active: true,
    },
    {
        intent_type: 'CAMPAIGN_CONTROL',
        category: 'toggle',
        metric_name: 'bat_tat',
        keywords: ['tắt', 'dừng', 'pause', 'bật', 'chạy', 'kích hoạt', 'activate'],
        description: 'Bật/tắt chiến dịch',
        is_active: true,
    },
    // === RULE ===
    {
        intent_type: 'RULE',
        category: 'trigger',
        metric_name: 'tao_quy_tac',
        keywords: ['tạo quy tắc', 'tạo rule', 'thiết lập quy tắc', 'đặt quy tắc', 'create rule', 'new rule'],
        description: 'Kích hoạt tạo quy tắc mới',
        is_active: true,
    },
    {
        intent_type: 'RULE',
        category: 'metric',
        metric_name: 'chi_phi',
        keywords: ['tiêu', 'chi', 'spend', 'kết quả', 'result', 'cpa', 'chi phí', '100k', '50k'],
        description: 'Nhận diện metric chi phí trong rule',
        is_active: true,
    },
    {
        intent_type: 'RULE',
        category: 'action',
        metric_name: 'hanh_dong',
        keywords: ['tắt', 'bật', 'giảm', 'tăng', 'scale', 'off', 'on', 'decrease', 'increase'],
        description: 'Nhận diện action trong rule',
        is_active: true,
    },
    // === CUSTOM_AUDIENCE ===
    {
        intent_type: 'CUSTOM_AUDIENCE',
        category: 'general',
        metric_name: 'chay_tep',
        keywords: ['tệp đối tượng', 'quảng cáo tệp', 'custom audience', 'lookalike audience', 'qc tệp', 'chạy tệp'],
        description: 'Chạy quảng cáo với tệp đối tượng có sẵn',
        is_active: true,
    },
    // === CREATIVE ===
    {
        intent_type: 'CREATIVE',
        category: 'general',
        metric_name: 'tao_qc_tin_nhan',
        keywords: ['tạo quảng cáo tin nhắn', 'quảng cáo tin nhắn mới', 'tạo qc tin nhắn', 'message ad', 'messenger ad'],
        description: 'Tạo quảng cáo tin nhắn mới',
        is_active: true,
    },
    // === AUDIENCE ===
    {
        intent_type: 'AUDIENCE',
        category: 'general',
        metric_name: 'tao_tep',
        keywords: ['tạo tệp đối tượng', 'tạo đối tượng', 'tạo audience', 'create audience', 'tạo lookalike'],
        description: 'Tạo tệp đối tượng mới',
        is_active: true,
    },
    // === CLONE ===
    {
        intent_type: 'CLONE',
        category: 'general',
        metric_name: 'nhan_ban',
        keywords: ['nhân bản', 'clone', 'copy chiến dịch', 'duplicate', 'sao chép', 'nhân đôi'],
        description: 'Nhân bản campaign/adset/ad',
        is_active: true,
    },
    // === REPORT ===
    {
        intent_type: 'REPORT',
        category: 'sales',
        metric_name: 'doanh_thu',
        keywords: ['doanh thu', 'tổng doanh thu', 'revenue', 'tiền bán', 'thu nhập', 'sale', 'sales', 'bán hàng'],
        description: 'Báo cáo doanh thu/bán hàng',
        is_active: true,
    },
    {
        intent_type: 'REPORT',
        category: 'marketing',
        metric_name: 'chi_tieu',
        keywords: ['chi tiêu', 'spend', 'ngân sách', 'chi phí quảng cáo', 'ads', 'quảng cáo', 'fb ads', 'mkt', 'marketing'],
        description: 'Báo cáo chi tiêu quảng cáo',
        is_active: true,
    },
    {
        intent_type: 'REPORT',
        category: 'summary',
        metric_name: 'tong_hop',
        keywords: ['tổng hợp', 'summary', 'all', 'tất cả', 'toàn bộ', 'đầy đủ', 'báo cáo đầy đủ', 'full report'],
        description: 'Báo cáo tổng hợp',
        is_active: true,
    },
    {
        intent_type: 'REPORT',
        category: 'general',
        metric_name: 'bao_cao_chung',
        keywords: ['báo cáo', 'thống kê', 'report', 'tổng kết'],
        description: 'Từ khóa báo cáo chung',
        is_active: true,
    },
    // === SCHEDULE ===
    {
        intent_type: 'SCHEDULE',
        category: 'appointment',
        metric_name: 'lich_hen',
        keywords: ['có lịch hẹn', 'lịch hẹn nào', 'xem lịch hẹn', 'hẹn khách', 'lịch hẹn mai', 'lịch hẹn hôm nay'],
        description: 'Xem lịch hẹn khách hàng - filter theo appointment_time',
        is_active: true,
    },
    {
        intent_type: 'SCHEDULE',
        category: 'record',
        metric_name: 'du_lieu',
        keywords: ['có lịch tạo', 'dữ liệu hôm nay', 'có dữ liệu', 'có record', 'dữ liệu mới', 'lịch mới tạo'],
        description: 'Xem dữ liệu do nhân viên tạo - filter theo CreatedAt',
        is_active: true,
    },
    {
        intent_type: 'SCHEDULE',
        category: 'phone',
        metric_name: 'sdt',
        keywords: ['có sđt', 'có số điện thoại', 'sđt nào', 'số điện thoại hôm nay', 'có phone', 'sđt mới'],
        description: 'Xem SĐT mới - filter theo CreatedAt và có phone_number',
        is_active: true,
    },
    // === DATE KEYWORDS ===
    {
        intent_type: 'DATE',
        category: 'today',
        metric_name: 'hom_nay',
        keywords: ['hôm nay', 'today', 'ngày hôm nay', 'bữa nay'],
        description: 'Nhận diện hôm nay',
        is_active: true,
    },
    {
        intent_type: 'DATE',
        category: 'yesterday',
        metric_name: 'hom_qua',
        keywords: ['hôm qua', 'yesterday', 'ngày hôm qua'],
        description: 'Nhận diện hôm qua',
        is_active: true,
    },
    {
        intent_type: 'DATE',
        category: 'tomorrow',
        metric_name: 'ngay_mai',
        keywords: ['mai', 'ngày mai', 'tomorrow'],
        description: 'Nhận diện ngày mai',
        is_active: true,
    },
    {
        intent_type: 'DATE',
        category: 'thisWeek',
        metric_name: 'tuan_nay',
        keywords: ['tuần này', 'tuần nay', 'tuần qua', '7 ngày', 'tuần'],
        description: 'Nhận diện tuần này',
        is_active: true,
    },
    {
        intent_type: 'DATE',
        category: 'thisMonth',
        metric_name: 'thang_nay',
        keywords: ['tháng này', 'tháng nay'],
        description: 'Nhận diện tháng này',
        is_active: true,
    },
    // === CANCEL/CONFIRM ===
    {
        intent_type: 'SYSTEM',
        category: 'cancel',
        metric_name: 'huy',
        keywords: ['hủy', 'cancel', 'thôi', 'bỏ', 'không', 'dừng lại'],
        description: 'Hủy flow hiện tại',
        is_active: true,
    },
    {
        intent_type: 'SYSTEM',
        category: 'confirm',
        metric_name: 'xac_nhan',
        keywords: ['ok', 'có', 'yes', 'xác nhận', 'đồng ý', 'được', 'confirm'],
        description: 'Xác nhận thao tác',
        is_active: true,
    },
];

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Get all AI keywords configs
 */
export async function getAIKeywords(): Promise<AIKeywordConfig[]> {
    try {
        const tableId = NOCODB_CONFIG.TABLES.AI_KEYWORDS_CONFIG;
        if (tableId === 'PENDING_TABLE_CREATE') {
            console.warn('[AIKeywords] Table not created yet, returning empty');
            return [];
        }

        const url = `${getNocoDBUrl(tableId)}?limit=200`;
        const response = await fetch(url, {
            method: 'GET',
            headers: await getNocoDBHeaders(),
        });

        if (!response.ok) {
            throw new Error(`NocoDB API error: ${response.status}`);
        }

        const data = await response.json();
        return (data.list || []).map(parseKeywordRecord);
    } catch (error) {
        console.error('[AIKeywords] Error fetching:', error);
        return [];
    }
}

/**
 * Get keywords by intent type
 */
export async function getKeywordsByIntent(intentType: string): Promise<AIKeywordConfig[]> {
    const allKeywords = await getAIKeywords();
    return allKeywords.filter(k => k.intent_type === intentType && k.is_active);
}

/**
 * Update keywords for a config
 */
export async function updateKeywords(id: number, keywords: string[]): Promise<boolean> {
    try {
        const tableId = NOCODB_CONFIG.TABLES.AI_KEYWORDS_CONFIG;
        if (tableId === 'PENDING_TABLE_CREATE') return false;

        const url = getNocoDBUrl(tableId, String(id));
        const response = await fetch(url, {
            method: 'PATCH',
            headers: await getNocoDBHeaders(),
            body: JSON.stringify({
                keywords: JSON.stringify(keywords),
                updated_at: new Date().toISOString(),
            }),
        });

        return response.ok;
    } catch (error) {
        console.error('[AIKeywords] Error updating:', error);
        return false;
    }
}

/**
 * Add new keyword config
 */
export async function addKeywordConfig(config: Omit<AIKeywordConfig, 'Id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
        const tableId = NOCODB_CONFIG.TABLES.AI_KEYWORDS_CONFIG;
        if (tableId === 'PENDING_TABLE_CREATE') return false;

        const url = getNocoDBUrl(tableId);
        const response = await fetch(url, {
            method: 'POST',
            headers: await getNocoDBHeaders(),
            body: JSON.stringify({
                ...config,
                keywords: JSON.stringify(config.keywords),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }),
        });

        return response.ok;
    } catch (error) {
        console.error('[AIKeywords] Error adding:', error);
        return false;
    }
}

/**
 * Toggle active status
 */
export async function toggleKeywordActive(id: number, isActive: boolean): Promise<boolean> {
    try {
        const tableId = NOCODB_CONFIG.TABLES.AI_KEYWORDS_CONFIG;
        if (tableId === 'PENDING_TABLE_CREATE') return false;

        const url = getNocoDBUrl(tableId, String(id));
        const response = await fetch(url, {
            method: 'PATCH',
            headers: await getNocoDBHeaders(),
            body: JSON.stringify({
                is_active: isActive,
                updated_at: new Date().toISOString(),
            }),
        });

        return response.ok;
    } catch (error) {
        console.error('[AIKeywords] Error toggling:', error);
        return false;
    }
}

/**
 * Delete keyword config
 */
export async function deleteKeywordConfig(id: number): Promise<boolean> {
    try {
        const tableId = NOCODB_CONFIG.TABLES.AI_KEYWORDS_CONFIG;
        if (tableId === 'PENDING_TABLE_CREATE') return false;

        // Construct Proxy Command
        const fullUrl = getNocoDBUrl(tableId);
        const proxyBaseUrl = fullUrl.split('/api/v2')[0];
        const path = `/api/v2/tables/${tableId}/records`;

        const response = await fetch(proxyBaseUrl, {
            method: 'POST',
            headers: await getNocoDBHeaders(),
            body: JSON.stringify({
                path: path,
                method: 'DELETE',
                data: [{ Id: id }]
            }),
        });

        return response.ok;
    } catch (error) {
        console.error('[AIKeywords] Error deleting:', error);
        return false;
    }
}

/**
 * Seed default keywords (run once when table is empty)
 */
export async function seedDefaultKeywords(): Promise<{ success: boolean; count: number }> {
    try {
        const existing = await getAIKeywords();
        if (existing.length > 0) {
            return { success: true, count: existing.length };
        }

        let count = 0;
        for (const config of DEFAULT_KEYWORDS) {
            const success = await addKeywordConfig(config);
            if (success) count++;
        }

        return { success: true, count };
    } catch (error) {
        console.error('[AIKeywords] Error seeding:', error);
        return { success: false, count: 0 };
    }
}

// =============================================================================
// HELPERS
// =============================================================================

function parseKeywordRecord(record: any): AIKeywordConfig {
    let keywords: string[] = [];
    try {
        if (typeof record.keywords === 'string') {
            keywords = JSON.parse(record.keywords);
        } else if (Array.isArray(record.keywords)) {
            keywords = record.keywords;
        }
    } catch {
        keywords = [];
    }

    return {
        Id: record.Id,
        intent_type: record.intent_type || '',
        category: record.category || '',
        metric_name: record.metric_name || '',
        keywords,
        description: record.description || '',
        is_active: Boolean(record.is_active),
        created_at: record.created_at,
        updated_at: record.updated_at,
    };
}
