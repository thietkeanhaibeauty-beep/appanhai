/**
 * Simple Metrics Aggregator
 * Aggregate trực tiếp từ các cột database - Không tính toán phức tạp
 * 
 * Ánh xạ từ: 
 * - Bảng facebook_insights -> ADS_METRICS
 * - Bảng sales_reports -> SALES_METRICS
 */

// ============================================
// CÁC CỘT TỪ BẢNG facebook_insights (Ads Report)
// ============================================
export const ADS_METRICS = {
  // Chi phí (AVG vì mỗi ad có chi phí riêng)
  spend: { column: 'spend', aggregate: 'SUM', label: 'Chi tiêu' },
  cost_per_result: { column: 'cost_per_result', aggregate: 'AVG', label: 'Chi phí/Kết quả' },
  cpc: { column: 'cpc', aggregate: 'AVG', label: 'Chi phí/Click' },
  cpm: { column: 'cpm', aggregate: 'AVG', label: 'Chi phí/1000 hiển thị' },
  
  // Hiệu suất (SUM tổng số lượng)
  results: { column: 'results', aggregate: 'SUM', label: 'Kết quả' },
  impressions: { column: 'impressions', aggregate: 'SUM', label: 'Hiển thị' },
  clicks: { column: 'clicks', aggregate: 'SUM', label: 'Nhấp chuột' },
  reach: { column: 'reach', aggregate: 'SUM', label: 'Охват' },
  ctr: { column: 'ctr', aggregate: 'AVG', label: 'Tỷ lệ CTR' },
  frequency: { column: 'frequency', aggregate: 'AVG', label: 'Tần suất' },
} as const;

// ============================================
// CÁC CỘT TỪ BẢNG sales_reports (Sales Report)
// ============================================
export const SALES_METRICS = {
  // Đếm số lượng (COUNT từ các cột boolean/status trong sales_reports)
  appointments: {
    column: 'appointment_status',
    aggregate: 'COUNT_WHERE',
    condition: (status: any) => status && status !== '' && status !== 'cancelled',
    label: 'Số đặt lịch',
  },
  answered_calls: {
    column: 'call_answered',
    aggregate: 'COUNT_WHERE',
    condition: (val: any) => val === true || val === 'true' || val === 1,
    label: 'Cuộc gọi trả lời',
  },
  
  // Tổng doanh thu (SUM từ các cột revenue trong sales_reports)
  total_revenue: { column: 'total_revenue', aggregate: 'SUM', label: 'Tổng doanh thu' },
  service_revenue: { column: 'service_revenue', aggregate: 'SUM', label: 'Doanh thu dịch vụ' },
} as const;

type MetricConfig = {
  column: string;
  aggregate: 'SUM' | 'AVG' | 'COUNT_WHERE';
  condition?: (val: any) => boolean;
  label: string;
};

/**
 * Aggregate metrics từ raw data
 * Không tính toán phức tạp - chỉ SUM/AVG/COUNT
 */
export function aggregateMetrics(
  rows: any[],
  metricsConfig: Record<string, MetricConfig>
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [key, config] of Object.entries(metricsConfig)) {
    if (config.aggregate === 'SUM') {
      result[key] = rows.reduce((sum, row) => {
        const value = Number(row[config.column]) || 0;
        return sum + value;
      }, 0);
    } else if (config.aggregate === 'AVG') {
      const values = rows
        .map((row) => Number(row[config.column]) || 0)
        .filter((v) => v > 0);
      result[key] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    } else if (config.aggregate === 'COUNT_WHERE' && config.condition) {
      result[key] = rows.filter((row) => config.condition!(row[config.column])).length;
    }
  }

  return result;
}

/**
 * Helper: Get all available metric keys
 */
export function getAllMetricKeys(): string[] {
  return [...Object.keys(ADS_METRICS), ...Object.keys(SALES_METRICS)];
}

/**
 * Helper: Get metric label by key
 */
export function getMetricLabel(key: string): string {
  if (key in ADS_METRICS) {
    return ADS_METRICS[key as keyof typeof ADS_METRICS].label;
  }
  if (key in SALES_METRICS) {
    return SALES_METRICS[key as keyof typeof SALES_METRICS].label;
  }
  return key;
}
