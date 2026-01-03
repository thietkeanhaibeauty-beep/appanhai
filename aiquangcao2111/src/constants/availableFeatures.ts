// Centralized available features list for packages
// SYNCED với Feature_Flags table trong NocoDB

export type AvailableFeature = {
  id: string;
  name: string;
  category: 'basic' | 'pro' | 'enterprise';
  description?: string;
};

export const AVAILABLE_FEATURES: AvailableFeature[] = [
  // ============================================
  // === BASIC FEATURES (Starter có) ===
  // ============================================

  // AI Features (từ DB)
  { id: 'ai_chat', name: 'Trợ lý AI chat', category: 'basic' },
  { id: 'ai_quick_post', name: 'Quick Post - Tạo QC từ bài viết', category: 'basic' },
  { id: 'ai_creative_campaign', name: 'Creative Campaign - Tạo QC với media', category: 'basic' },
  { id: 'ai_report_analysis', name: 'Report Analysis - Phân tích báo cáo', category: 'basic' },

  // Form thủ công (từ DB)
  { id: 'manual_create_ads', name: 'Tạo quảng cáo cơ bản', category: 'basic' },
  { id: 'manual_create_message', name: 'Tạo QC tin nhắn', category: 'basic' },
  { id: 'manual_quick_ad', name: 'Bài viết sẵn nhanh', category: 'basic' },

  // Chạy với tệp có sẵn
  { id: 'custom_audience_ads', name: 'Chạy QC tệp đối tượng', category: 'basic' },

  // Báo cáo (từ DB)
  { id: 'report_ads', name: 'Báo cáo ADS', category: 'basic' },
  { id: 'report_sale', name: 'Báo cáo Sale', category: 'basic' },
  { id: 'report_summary', name: 'Báo cáo Tổng', category: 'basic' },

  // Quy tắc & Quản lý
  { id: 'automated_rules', name: 'Quy tắc tự động', category: 'basic' },
  { id: 'campaign_control', name: 'Bật/tắt chiến dịch', category: 'basic' },
  { id: 'ads_management', name: 'Quản lý quảng cáo', category: 'basic' },
  { id: 'labels_management', name: 'Quản lý nhãn', category: 'basic' },

  // Cài đặt
  { id: 'notification_settings', name: 'Cài đặt thông báo', category: 'basic' },
  { id: 'ad_account_settings', name: 'Cài đặt TK quảng cáo', category: 'basic' },
  { id: 'ads_history', name: 'Lịch sử quảng cáo', category: 'basic' },

  // ============================================
  // === PRO FEATURES (Chỉ Pro+ có) ===
  // ============================================

  // Tạo mới đối tượng (từ DB)
  { id: 'manual_audience', name: 'Tạo đối tượng', category: 'pro' },
  { id: 'ai_audience_creator', name: 'Audience Creator - Tạo đối tượng AI', category: 'pro' },
  { id: 'manual_target_templates', name: 'Bảng nhắm mục tiêu', category: 'pro' },

  // Nâng cao (từ DB)
  { id: 'manual_advanced_ads', name: 'Nhân bản chiến dịch', category: 'pro' },
  { id: 'ai_clone_tool', name: 'Clone Tool - Nhân bản AI', category: 'pro' },
  { id: 'golden_rule_set', name: 'Bộ quy tắc vàng', category: 'pro' },
  { id: 'schedule', name: 'Xem lịch hẹn/SĐT', category: 'pro' },
  { id: 'export_data', name: 'Export Excel', category: 'pro' },
  { id: 'priority_support', name: 'Ưu tiên hỗ trợ', category: 'pro' },

  // ============================================
  // === ENTERPRISE FEATURES ===
  // ============================================
  { id: 'api_access', name: 'API tích hợp', category: 'enterprise' },
  { id: 'multi_workspace', name: 'Nhiều workspace', category: 'enterprise' },
  { id: 'white_label', name: 'White-label', category: 'enterprise' },
  { id: 'sla_guarantee', name: 'SLA đảm bảo', category: 'enterprise' },

  // ============================================
  // === SPECIAL (shorthand) ===
  // ============================================
  { id: 'all', name: 'Tất cả tính năng', category: 'basic' },
];

export const FEATURE_NAME_MAP: Record<string, string> = AVAILABLE_FEATURES.reduce(
  (acc, f) => {
    acc[f.id] = f.name;
    return acc;
  },
  {} as Record<string, string>
);

// Key để lưu custom names trong localStorage
const FEATURE_NAMES_KEY = 'ai_quangcao_feature_names';

/**
 * Lấy tên feature - ưu tiên custom name từ localStorage, fallback về constant
 */
export const getFeatureName = (featureId: string): string => {
  try {
    const saved = localStorage.getItem(FEATURE_NAMES_KEY);
    if (saved) {
      const customNames = JSON.parse(saved) as Record<string, string>;
      if (customNames[featureId]) {
        return customNames[featureId];
      }
    }
  } catch {
    // Ignore parse errors
  }
  return FEATURE_NAME_MAP[featureId] || featureId;
};

/**
 * Lấy tất cả feature names (merged localStorage + constants)
 */
export const getAllFeatureNames = (): Record<string, string> => {
  const result = { ...FEATURE_NAME_MAP };
  try {
    const saved = localStorage.getItem(FEATURE_NAMES_KEY);
    if (saved) {
      const customNames = JSON.parse(saved) as Record<string, string>;
      Object.assign(result, customNames);
    }
  } catch {
    // Ignore parse errors
  }
  return result;
};

// Helper functions
export const getBasicFeatures = () => AVAILABLE_FEATURES.filter(f => f.category === 'basic' && f.id !== 'all');
export const getProFeatures = () => AVAILABLE_FEATURES.filter(f => f.category === 'pro');
export const getEnterpriseFeatures = () => AVAILABLE_FEATURES.filter(f => f.category === 'enterprise');

// Keys cần thêm vào Feature_Flags table trong NocoDB:
// - ai_chat
// - custom_audience_ads
// - automated_rules
// - campaign_control
// - ads_management
// - labels_management
// - notification_settings
// - ad_account_settings
// - ads_history
// - golden_rule_set
// - schedule
// - export_data
// - priority_support
// - api_access
// - multi_workspace
// - white_label
// - sla_guarantee
