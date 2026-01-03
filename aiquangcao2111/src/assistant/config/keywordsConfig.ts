/**
 * AI Chat Keywords Configuration
 * 
 * Anh có thể tự thêm/sửa keywords ở đây để AI nhận diện đúng ý định.
 * Không cần sửa code logic, chỉ cần thêm từ khóa vào đúng category.
 */

// =============================================================================
// REPORT KEYWORDS - Báo cáo tổng hợp số liệu
// =============================================================================

export const REPORT_KEYWORDS = {
    // --- SALES REPORT ---
    // Khi user hỏi về doanh thu, khách hàng, lịch hẹn tổng hợp
    sales: {
        description: 'Báo cáo doanh thu/bán hàng - lấy từ bảng SALES_REPORTS',
        keywords: [
            // Doanh thu
            'doanh thu', 'tổng doanh thu', 'revenue', 'tiền bán', 'thu nhập',
            // Sale
            'sale', 'sales', 'bán hàng', 'tổng sale', 'tổng bán',
            // Khách hàng tổng hợp
            'tổng khách', 'số khách hàng tuần', 'số khách tháng',
            // Lịch hẹn tổng hợp
            'tổng lịch hẹn', 'số lịch tuần', 'tổng đặt lịch',
            // SĐT tổng hợp  
            'tổng sđt', 'số điện thoại tuần', 'tổng số phone',
            // Tỉ lệ
            'tỉ lệ chuyển đổi', 'tỷ lệ booking', 'tỉ lệ đặt lịch', 'conversion rate',
        ],
        // 6 chỉ số chính trong báo cáo sale
        metrics: [
            'doanh_thu',           // Tổng doanh thu
            'so_dat_lich',         // Số đặt lịch
            'so_khach_hang',       // Số khách hàng
            'ti_le_dat_lich',      // Tỉ lệ đặt lịch (từ kết quả)
            'ti_le_sdt',           // Tỉ lệ SĐT (từ kết quả FB)
            'ti_le_chuyen_doi',    // Tỷ lệ chuyển đổi
        ],
    },

    // --- MARKETING/ADS REPORT ---
    // Khi user hỏi về chi tiêu quảng cáo, kết quả FB
    marketing: {
        description: 'Báo cáo marketing/ads - lấy từ FACEBOOK_INSIGHTS',
        keywords: [
            // Chi tiêu
            'chi tiêu', 'spend', 'ngân sách', 'chi phí quảng cáo', 'tổng chi',
            // Ads
            'ads', 'quảng cáo', 'fb ads', 'facebook ads', 'mkt', 'marketing',
            // Kết quả
            'kết quả fb', 'tin nhắn fb', 'message ads', 'hiệu quả quảng cáo',
            // CPA
            'cpa', 'chi phí kết quả', 'cost per result',
        ],
        metrics: [
            'spend',
            'results',
            'cost_per_result',
            'impressions',
            'reach',
            'ctr',
        ],
    },

    // --- SUMMARY REPORT ---
    // Khi user muốn xem cả ads + sales
    summary: {
        description: 'Báo cáo tổng hợp - kết hợp cả ADS và SALES',
        keywords: [
            'tổng hợp', 'summary', 'all', 'tất cả', 'toàn bộ', 'đầy đủ',
            'báo cáo đầy đủ', 'full report',
        ],
    },
};

// =============================================================================
// SCHEDULE KEYWORDS - Xem lịch/dữ liệu cụ thể (không tổng hợp)
// =============================================================================

export const SCHEDULE_KEYWORDS = {
    // --- APPOINTMENT (Lịch hẹn khách) ---
    // Filter theo: appointment_time
    appointment: {
        description: 'Xem lịch hẹn khách hàng - filter theo cột appointment_time',
        dateField: 'appointment_time',
        keywords: [
            'có lịch hẹn', 'lịch hẹn nào', 'xem lịch hẹn', 'hẹn khách',
            'có hẹn nào', 'có cuộc hẹn', 'lịch hẹn mai', 'lịch hẹn hôm nay',
            'mai có hẹn', 'có khách hẹn', 'xem hẹn',
        ],
    },

    // --- RECORD (Dữ liệu nhân viên tạo) ---
    // Filter theo: CreatedAt
    record: {
        description: 'Xem dữ liệu/lịch do nhân viên tạo - filter theo cột CreatedAt',
        dateField: 'CreatedAt',
        keywords: [
            'có lịch tạo', 'lịch tạo nào', 'dữ liệu hôm nay', 'có dữ liệu',
            'có lịch nào không', 'xem lịch hôm nay', 'có record',
            'dữ liệu mới', 'có gì mới', 'lịch mới tạo',
        ],
    },

    // --- PHONE (SĐT mới) ---
    // Filter theo: CreatedAt + có phone_number
    phone: {
        description: 'Xem SĐT mới - filter theo CreatedAt và có phone_number',
        dateField: 'CreatedAt',
        keywords: [
            'có sđt', 'có số điện thoại', 'sđt nào', 'số điện thoại hôm nay',
            'có phone nào', 'có số nào', 'sđt mới', 'có số mới',
        ],
    },
};

// =============================================================================
// DATE KEYWORDS - Nhận diện ngày tháng
// =============================================================================

export const DATE_KEYWORDS = {
    today: {
        description: 'Hôm nay',
        keywords: ['hôm nay', 'today', 'ngày hôm nay', 'bữa nay'],
    },
    yesterday: {
        description: 'Hôm qua',
        keywords: ['hôm qua', 'yesterday', 'ngày hôm qua'],
    },
    tomorrow: {
        description: 'Ngày mai',
        keywords: ['mai', 'ngày mai', 'tomorrow'],
    },
    thisWeek: {
        description: 'Tuần này',
        keywords: ['tuần này', 'tuần nay', 'tuần qua', '7 ngày', 'tuần'],
    },
    thisMonth: {
        description: 'Tháng này',
        keywords: ['tháng này', 'tháng nay'],
    },
    lastMonth: {
        description: 'Tháng trước',
        keywords: ['tháng trước', 'tháng rồi'],
    },
};

// =============================================================================
// HELPER: Check if message matches any keyword in a category
// =============================================================================

export function matchesKeywords(message: string, keywords: string[]): boolean {
    const lower = message.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
}

export function findMatchingCategory<T extends Record<string, { keywords: string[] }>>(
    message: string,
    config: T
): keyof T | null {
    const lower = message.toLowerCase();
    for (const [category, data] of Object.entries(config)) {
        if (data.keywords.some((kw: string) => lower.includes(kw))) {
            return category as keyof T;
        }
    }
    return null;
}
