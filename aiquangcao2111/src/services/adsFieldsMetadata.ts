export interface FieldMetadata {
  field: string;
  label: string;
  group: 'Marketing - Chi phí' | 'Marketing - Hiệu suất' | 'Marketing - Chuyển đổi' | 'Cấp Quảng Cáo';
}

export const ALL_FIELDS: FieldMetadata[] = [
  // ========== Cấp Quảng Cáo ==========
  // Ngân sách
  { field: 'budget', label: 'Ngân sách', group: 'Cấp Quảng Cáo' },
  { field: 'daily_budget', label: 'Ngân sách hàng ngày', group: 'Cấp Quảng Cáo' },
  { field: 'lifetime_budget', label: 'Ngân sách trọn đời', group: 'Cấp Quảng Cáo' },

  // Chiến lược & Cài đặt
  { field: 'buying_type', label: 'Loại mua', group: 'Cấp Quảng Cáo' },
  { field: 'bid_strategy', label: 'Chiến lược đặt giá', group: 'Cấp Quảng Cáo' },
  { field: 'bid_amount', label: 'Số tiền đặt giá', group: 'Cấp Quảng Cáo' },

  // Chi phí đặc thù
  { field: 'cost_per_phone', label: 'Chi phí/SĐT', group: 'Cấp Quảng Cáo' },

  // ✨ NEW: Sales metrics from SALES_REPORTS
  { field: 'booking_count', label: 'Số đặt lịch', group: 'Cấp Quảng Cáo' },
  { field: 'booking_rate', label: 'Tỉ lệ đặt lịch (%)', group: 'Cấp Quảng Cáo' },
  { field: 'total_revenue', label: 'Doanh thu', group: 'Cấp Quảng Cáo' },
  { field: 'marketing_revenue_ratio', label: 'Chi phí MKT/Doanh thu (%)', group: 'Cấp Quảng Cáo' },

  { field: 'cost_per_messaging_replied_7d', label: 'Chi phí MKT trên ngày', group: 'Cấp Quảng Cáo' },
  { field: 'cost_per_action_type', label: 'Chi phí/loại hành động', group: 'Cấp Quảng Cáo' },

  // ========== Marketing - Chi phí ==========
  { field: 'spend', label: 'Chi tiêu', group: 'Marketing - Chi phí' },
  { field: 'cost_per_result', label: 'Chi phí/Kết quả', group: 'Marketing - Chi phí' },
  { field: 'cpc', label: 'CPC (Chi phí mỗi lượt nhấp)', group: 'Marketing - Chi phí' },
  { field: 'cpm', label: 'CPM (Chi phí trên 1000 lần hiển thị)', group: 'Marketing - Chi phí' },
  { field: 'cpp', label: 'CPP (Chi phí trên 1000 người tiếp cận)', group: 'Marketing - Chi phí' },
  { field: 'cost_per_unique_click', label: 'Chi phí/lượt nhấp duy nhất', group: 'Marketing - Chi phí' },
  { field: 'cost_per_inline_link_click', label: 'Chi phí/nhấp liên kết', group: 'Marketing - Chi phí' },
  { field: 'cost_per_thruplay', label: 'Chi phí/lượt ThruPlay', group: 'Marketing - Chi phí' },

  // Cost per action fields (from cost_per_action_type)
  { field: 'cost_per_started_7d', label: 'Chi phí/Trò chuyện 7d', group: 'Marketing - Chi phí' },
  { field: 'cost_per_total_messaging_connection', label: 'Chi phí/Kết nối tin nhắn', group: 'Marketing - Chi phí' },
  { field: 'cost_per_link_click', label: 'Chi phí/Nhấp liên kết', group: 'Marketing - Chi phí' },
  { field: 'cost_per_messaging_welcome_message_view', label: 'Chi phí/Xem tin chào', group: 'Marketing - Chi phí' },
  { field: 'cost_per_post_engagement', label: 'Chi phí/Tương tác bài viết', group: 'Marketing - Chi phí' },
  { field: 'cost_per_post_interaction_gross', label: 'Chi phí/Tương tác tổng', group: 'Marketing - Chi phí' },
  { field: 'cost_per_messaging_first_reply', label: 'Chi phí/Tin nhắn đầu', group: 'Marketing - Chi phí' },
  { field: 'cost_per_video_view', label: 'Chi phí/Xem video', group: 'Marketing - Chi phí' },
  { field: 'cost_per_post_reaction', label: 'Chi phí/Phản ứng', group: 'Marketing - Chi phí' },
  { field: 'cost_per_page_engagement', label: 'Chi phí/Tương tác trang', group: 'Marketing - Chi phí' },
  { field: 'cost_per_messaging_user_depth_2', label: 'Chi phí/Tin nhắn độ sâu 2', group: 'Marketing - Chi phí' },

  // ========== Marketing - Hiệu suất ==========
  // Kết quả
  { field: 'results', label: 'Kết quả', group: 'Marketing - Hiệu suất' },
  { field: 'results_messaging_replied_7d', label: 'Kết quả (Mess 7d)', group: 'Marketing - Hiệu suất' },
  { field: 'started_7d', label: 'Trò chuyện 7d', group: 'Marketing - Hiệu suất' },

  // Hiển thị & Tiếp cận
  { field: 'impressions', label: 'Hiển thị', group: 'Marketing - Hiệu suất' },
  { field: 'reach', label: 'Lượt tiếp cận', group: 'Marketing - Hiệu suất' },
  { field: 'frequency', label: 'Tần suất', group: 'Marketing - Hiệu suất' },

  // Nhấp chuột
  { field: 'clicks', label: 'Nhấp chuột', group: 'Marketing - Hiệu suất' },
  { field: 'unique_clicks', label: 'Lượt nhấp duy nhất', group: 'Marketing - Hiệu suất' },
  { field: 'inline_link_clicks', label: 'Nhấp vào liên kết', group: 'Marketing - Hiệu suất' },
  { field: 'unique_inline_link_clicks', label: 'Nhấp liên kết duy nhất', group: 'Marketing - Hiệu suất' },

  // Tỷ lệ
  { field: 'ctr', label: 'CTR (Tỷ lệ nhấp)', group: 'Marketing - Hiệu suất' },
  { field: 'unique_ctr', label: 'Tỷ lệ nhấp duy nhất', group: 'Marketing - Hiệu suất' },
  { field: 'unique_inline_link_click_ctr', label: 'Tỷ lệ nhấp liên kết duy nhất', group: 'Marketing - Hiệu suất' },

  // Xếp hạng
  { field: 'engagement_rate_ranking', label: 'Xếp hạng tỷ lệ tương tác', group: 'Marketing - Hiệu suất' },
  { field: 'quality_ranking', label: 'Xếp hạng chất lượng', group: 'Marketing - Hiệu suất' },
  { field: 'conversion_rate_ranking', label: 'Xếp hạng tỷ lệ chuyển đổi', group: 'Marketing - Hiệu suất' },

  // ========== Marketing - Chuyển đổi ==========
  // Thông tin chuyển đổi
  { field: 'phones', label: 'SĐT', group: 'Marketing - Chuyển đổi' },
  { field: 'result_label', label: 'Loại kết quả', group: 'Marketing - Chuyển đổi' },
  { field: 'messaging_connections', label: 'Kết quả tin nhắn', group: 'Marketing - Chuyển đổi' },
  { field: 'action_type_used', label: 'Action Type', group: 'Marketing - Chuyển đổi' },
  { field: 'purchase_roas', label: 'ROAS mua hàng', group: 'Marketing - Chuyển đổi' },
  { field: 'action_values', label: 'Giá trị hành động', group: 'Marketing - Chuyển đổi' },
  { field: 'actions', label: 'Hành động', group: 'Marketing - Chuyển đổi' },

  // Video metrics
  { field: 'video_play_actions', label: 'Lượt phát video', group: 'Marketing - Chuyển đổi' },
  { field: 'video_p25_watched_actions', label: 'Xem video 25%', group: 'Marketing - Chuyển đổi' },
  { field: 'video_p50_watched_actions', label: 'Xem video 50%', group: 'Marketing - Chuyển đổi' },
  { field: 'video_p75_watched_actions', label: 'Xem video 75%', group: 'Marketing - Chuyển đổi' },
  { field: 'video_p100_watched_actions', label: 'Xem video 100%', group: 'Marketing - Chuyển đổi' },

  // Thông tin cơ bản
  { field: 'level', label: 'Cấp', group: 'Marketing - Chuyển đổi' },
  { field: 'labels', label: 'Nhãn dán', group: 'Marketing - Chuyển đổi' },
  { field: 'campaign_name', label: 'Tên chiến dịch', group: 'Marketing - Chuyển đổi' },
  { field: 'adset_name', label: 'Tên nhóm quảng cáo', group: 'Marketing - Chuyển đổi' },
  { field: 'ad_name', label: 'Tên quảng cáo', group: 'Marketing - Chuyển đổi' },
  { field: 'campaign_id', label: 'ID Chiến dịch', group: 'Marketing - Chuyển đổi' },
  { field: 'adset_id', label: 'ID Nhóm quảng cáo', group: 'Marketing - Chuyển đổi' },
  { field: 'ad_id', label: 'ID Quảng cáo', group: 'Marketing - Chuyển đổi' },
  { field: 'objective', label: 'Mục tiêu', group: 'Marketing - Chuyển đổi' },

  // Trạng thái
  { field: 'status', label: 'Trạng thái', group: 'Marketing - Chuyển đổi' },
  { field: 'effective_status', label: 'Trạng thái phân phối', group: 'Marketing - Chuyển đổi' },
  { field: 'configured_status', label: 'Trạng thái cài đặt', group: 'Marketing - Chuyển đổi' },

  // Thời gian
  { field: 'date_start', label: 'Ngày bắt đầu', group: 'Marketing - Chuyển đổi' },
  { field: 'date_stop', label: 'Ngày kết thúc', group: 'Marketing - Chuyển đổi' },
];
