// Automation Rules Types

export type RuleScope = 'campaign' | 'adset' | 'ad';

export type TimeRange = 'today' | 'yesterday' | '7_days' | '14_days' | '30_days' | 'lifetime' | 'custom';

export type MetricType =
  // 📊 Operator-level metrics (Facebook Ads)
  | 'spend'
  | 'results'
  | 'cpm'
  | 'cpc'
  | 'ctr'
  | 'reach'
  | 'impressions'
  | 'clicks'
  | 'cost_per_result'
  | 'frequency'
  | 'days_since_created'
  // 🎯 Manager-level metrics (Sales)
  | 'phone_count'               // Số điện thoại (SĐT count)
  | 'cost_per_phone'            // ✅ NEW: Chi phí / SĐT
  | 'sdt_rate'                  // Tỉ lệ có SĐT (SĐT / Results) %
  | 'booking_rate'              // Tỉ lệ đặt lịch (Đặt lịch / SĐT) %
  | 'revenue_rate'              // % Doanh thu (Doanh thu / Chi phí) %
  | 'phone_collection_rate'     // [Deprecated] Tỉ lệ có SĐT (%)
  | 'cost_per_appointment'      // Chi phí trên lịch hẹn
  | 'cost_per_service_revenue'  // Chi phí / Doanh thu dịch vụ
  // 💼 Director-level metrics (Business)
  | 'marketing_revenue_ratio'   // Chi phí MKT / Doanh thu (%)
  | 'marketing_service_ratio'   // Chi phí MKT / Doanh thu DV (%)
  | 'marketing_daily_ratio'     // Chi phí MKT / Doanh thu ngày
  | 'roi'                       // ROI (%)
  | 'roas';                     // ROAS (Revenue / Spend)

export type OperatorType =
  | 'greater_than'
  | 'less_than'
  | 'equals'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'not_equals';

export type ActionType =
  | 'turn_off'
  | 'turn_on'
  | 'increase_budget'
  | 'decrease_budget'
  | 'add_label'
  | 'remove_label'
  | 'send_notification'
  | 'keep'; // Giữ nguyên - không thực hiện hành động nào

export type ConditionLogic = 'all' | 'any'; // AND or OR

export interface RuleCondition {
  id: string;
  metric: MetricType;
  operator: OperatorType;
  value: number;
}

export interface RuleAction {
  id: string;
  type: ActionType;
  value?: number | string; // For budget % or label ID
  budgetMode?: 'percentage' | 'absolute'; // For budget changes
  executeAt?: string; // Time in HH:mm format

  // ✨ Auto-revert settings
  autoRevert?: boolean; // Có tự động revert action không?
  revertMode?: 'fixed_time' | 'after_duration'; // ✅ NEW: Explicit mode selection
  revertAtTime?: string; // Giờ cụ thể để bật lại (HH:mm, 24h format)
  revertAfterHours?: number; // Số giờ sau khi tắt (ví dụ: 0.0833 = 5 phút)
  revertAction?: ActionType; // Action nào sẽ được thực thi để revert
}

export interface AdvancedSettings {
  customDays?: number; // For custom time range
  enableAutoSchedule?: boolean;
  checkFrequency?: number; // minutes
  enableSafeGuards?: boolean;
  maxBudgetDailySpend?: number;
  minRoasThreshold?: number;
  enableExecutionLimits?: boolean;
  maxExecutionsPerObject?: number; // Max times an action can execute on same object
  cooldownHours?: number; // Hours to wait before re-executing on same object
  resetDaily?: boolean; // Reset execution count daily at 00:00
  enableLabelSuccess?: boolean;
  successLabelId?: string;
  enableLabelFailure?: boolean;
  failureLabelId?: string;
  enableRollback?: boolean;
  rollbackDuration?: number; // hours

  // 🥇 Override conditions (Golden Rules)
  enableOverride?: boolean;
  overrideConditions?: RuleCondition[];
  overrideConditionLogic?: ConditionLogic;
}

// 🔗 Multi-step rule (chuỗi IF-THEN)
export interface RuleStep {
  id: string;
  order: number; // Thứ tự, bước sau có quyền cao hơn
  logic: 'OR' | 'AND'; // Liên kết với bước trước: HOẶC/VÀ
  conditions: RuleCondition[];
  condition_logic: ConditionLogic; // Bên trong bước: all/any
  action: RuleAction;
}

export interface AutomationRule {
  id: string;
  Id?: number; // NocoDB record ID
  user_id: string;
  rule_name: string;
  scope: RuleScope;
  time_range: TimeRange;
  is_active: boolean;

  conditions: RuleCondition[];
  condition_logic: ConditionLogic;

  actions: RuleAction[];

  // 🔗 Multi-step rules (optional, for chained IF-THEN)
  steps?: RuleStep[];

  advanced_settings: AdvancedSettings;

  // Scheduling fields (moved from advanced_settings for easier access)
  enableAutoSchedule?: boolean;
  checkFrequency?: number; // minutes

  labels: (string | number)[]; // Labels for this rule
  target_labels: (string | number)[]; // Filter objects by labels

  // Target scope details
  apply_to?: 'all' | 'specific' | 'filtered';
  specific_ids?: string[]; // Specific IDs to apply rule to

  created_at: string;
  updated_at: string;
  last_run_at?: string;

  execution_count?: number;
  last_execution_status?: string;
  last_execution_log?: any;
}

export interface ExecutionResult {
  objectId: string;
  objectName: string;
  campaignId?: string;
  campaignName?: string;
  level?: 'campaign' | 'adset' | 'ad';
  action: ActionType;
  result: 'success' | 'failed' | 'skipped';
  status?: 'pending' | 'completed' | 'error' | 'skipped';
  details?: string;
  error?: string;
  reason?: string;
  timestamp?: string;
  executionCount?: number;
}

export interface ExecutionLog {
  timestamp: string;
  ruleId: string;
  ruleName: string;
  matchedObjectsCount: number;
  executedActionsCount: number;
  status: 'success' | 'partial' | 'failed';
  details: ExecutionResult[];
}

// Metric labels for UI
export const METRIC_LABELS: Record<MetricType, string> = {
  // Operator metrics
  spend: 'Chi tiêu',
  results: 'Kết quả',
  cpm: 'CPM',
  cpc: 'CPC',
  ctr: 'CTR (%)',
  reach: 'Lượt tiếp cận',
  impressions: 'Lượt hiển thị',
  clicks: 'Lượt nhấp',
  cost_per_result: 'Chi phí/Kết quả',
  frequency: 'Tần suất',
  days_since_created: 'Số ngày từ khi tạo',
  // Manager metrics
  phone_count: 'Số điện thoại',
  cost_per_phone: 'Chi phí/SĐT',  // ✅ NEW
  sdt_rate: 'Tỉ lệ SĐT (%)',
  booking_rate: 'Tỉ lệ đặt lịch (%)',
  revenue_rate: '% Doanh thu (Doanh thu/Chi phí)',
  phone_collection_rate: '[Cũ] Tỉ lệ có SĐT (%)',
  cost_per_appointment: 'Chi phí/Đặt lịch',
  cost_per_service_revenue: 'Chi phí/Doanh thu DV',
  // Director metrics
  marketing_revenue_ratio: 'Chi phí MKT/Doanh thu (%)',
  marketing_service_ratio: 'Chi phí MKT/Doanh thu DV (%)',
  marketing_daily_ratio: 'Chi phí MKT/Doanh thu ngày',
  roi: 'ROI (%)',
  roas: 'ROAS'
};

// Metric categories for UI grouping
export const METRIC_CATEGORIES = {
  operator: ['spend', 'results', 'cpm', 'cpc', 'ctr', 'reach', 'impressions', 'clicks', 'cost_per_result', 'frequency', 'days_since_created'] as MetricType[],
  manager: ['phone_count', 'cost_per_phone', 'sdt_rate', 'booking_rate', 'revenue_rate', 'cost_per_appointment', 'cost_per_service_revenue'] as MetricType[],
  director: ['marketing_revenue_ratio', 'marketing_service_ratio', 'marketing_daily_ratio', 'roi', 'roas'] as MetricType[]
};

// Operator labels for UI
export const OPERATOR_LABELS: Record<OperatorType, string> = {
  greater_than: 'Lớn hơn',
  less_than: 'Nhỏ hơn',
  equals: 'Bằng',
  greater_than_or_equal: 'Lớn hơn hoặc bằng',
  less_than_or_equal: 'Nhỏ hơn hoặc bằng',
  not_equals: 'Khác'
};

// Action labels for UI
export const ACTION_LABELS: Record<ActionType, string> = {
  turn_off: 'Tắt chiến dịch',
  turn_on: 'Bật chiến dịch',
  increase_budget: 'Tăng ngân sách',
  decrease_budget: 'Giảm ngân sách',
  add_label: 'Gắn nhãn',
  remove_label: 'Gỡ nhãn',
  send_notification: 'Gửi thông báo',
  keep: 'Giữ nguyên (không làm gì)'
};

// Time range labels for UI
export const TIME_RANGE_LABELS: Record<Exclude<TimeRange, 'custom'>, string> = {
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  '7_days': '7 ngày qua',
  '14_days': '14 ngày qua',
  '30_days': '30 ngày qua',
  lifetime: 'Trọn đời'
};

// Scope labels for UI
export const SCOPE_LABELS: Record<RuleScope, string> = {
  campaign: 'Chiến dịch',
  adset: 'Nhóm quảng cáo',
  ad: 'Quảng cáo'
};

// ✨ NEW: Revert action mapping
export const REVERT_ACTION_MAP: Partial<Record<ActionType, ActionType>> = {
  turn_off: 'turn_on',
  turn_on: 'turn_off',
  increase_budget: 'decrease_budget',
  decrease_budget: 'increase_budget'
};

// =============================================================================
// 🥇 GOLDEN RULE SETS - Bộ Quy tắc Vàng (v2)
// =============================================================================

/**
 * Quy tắc cơ bản trong bộ (BasicRule)
 * Dành cho nhân viên Ads - dựa trên metrics Facebook
 */
export interface BasicRule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  condition_logic: ConditionLogic;
  action: RuleAction;
}

/**
 * Override nâng cao (AdvancedOverride)
 * Dành cho Trưởng phòng/GĐ - dựa trên metrics Sale
 * Nếu match → CHẶN các action từ BasicRules
 */
export interface AdvancedOverride {
  id: string;
  name: string;
  conditions: RuleCondition[];
  condition_logic: ConditionLogic;
  blocks_actions: ActionType[]; // Actions sẽ bị chặn nếu override match
  reason?: string; // Lý do chặn (hiển thị trong log)
}

/**
 * Bộ Quy tắc Vàng (GoldenRuleSet)
 * Gộp nhiều BasicRules + AdvancedOverrides vào 1 bộ
 */
export interface GoldenRuleSet {
  id: string;
  Id?: number; // NocoDB record ID
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;

  // Scope & Timeframe
  scope: RuleScope;
  time_range: TimeRange;

  // Target labels - chỉ apply cho objects có nhãn này
  target_labels: (string | number)[];

  // Rules
  basic_rules: BasicRule[];
  advanced_overrides: AdvancedOverride[];

  // Advanced settings (shared)
  advanced_settings?: AdvancedSettings;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_run_at?: string;

  // Stats
  execution_count?: number;
  last_execution_status?: string;
}

/**
 * Kết quả thực thi Golden Rule Set
 */
export interface GoldenRuleExecutionResult {
  objectId: string;
  objectName: string;
  level: 'campaign' | 'adset' | 'ad';

  // Rule that matched
  matchedBasicRule?: {
    id: string;
    name: string;
    action: ActionType;
  };

  // Override that blocked
  blockedBy?: {
    id: string;
    name: string;
    reason?: string;
  };

  // Final result
  result: 'executed' | 'blocked' | 'skipped';
  finalAction?: ActionType;
  details?: string;
  timestamp: string;
}

// Labels for UI display
export const GOLDEN_RULE_STATUS_LABELS = {
  executed: '✅ Đã thực thi',
  blocked: '🚫 Đã bị chặn',
  skipped: '⏭️ Bỏ qua'
};
