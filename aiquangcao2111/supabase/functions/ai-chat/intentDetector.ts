// Intent Detection for AI Report Agent

export type AdLevel = 'campaign' | 'adset' | 'ad';

export type ReportIntent = 
  | { type: 'report_hourly'; params: { hoursAgo: number; level?: AdLevel } }
  | { type: 'report_daily'; params: { date: string; level?: AdLevel } }
  | { type: 'report_active'; params: { level?: AdLevel } }
  | { type: 'report_all_campaigns'; params: { level?: AdLevel } }
  | { type: 'report_paused_campaigns'; params: { level?: AdLevel } }
  | { type: 'report_by_timeframe'; params: { days: number; level?: AdLevel } }
  | { type: 'report_by_budget'; params: { minBudget?: number; maxBudget?: number; level?: AdLevel } }
  | { type: 'report_today'; params: { level?: AdLevel } }
  | { type: 'report_campaign_detail'; params: { campaignId?: string; level?: AdLevel } }
  | { type: 'report_by_label'; params: { labelName: string; level?: AdLevel } }
  | { type: 'report_performance'; params: { level?: AdLevel } }
  | { type: 'general_chat'; params: {} };

/**
 * Detect ad level from user message
 * Returns 'campaign' (default), 'adset', or 'ad'
 */
function detectLevel(message: string): AdLevel {
  const lower = message.toLowerCase().trim();
  
  // Adset detection
  if (
    lower.includes('adset') ||
    lower.includes('ad set') ||
    lower.includes('nhóm quảng cáo') ||
    lower.includes('nhóm qc')
  ) {
    return 'adset';
  }
  
  // Ad detection (be careful not to match "ad account" or "adset")
  if (
    (lower.includes(' ad ') || lower.includes(' ads ')) ||
    lower.includes('quảng cáo đơn') ||
    lower.includes('mẫu quảng cáo') ||
    (lower.includes('quảng cáo') && !lower.includes('chiến dịch') && !lower.includes('nhóm'))
  ) {
    return 'ad';
  }
  
  // Default: campaign
  return 'campaign';
}

/**
 * Detect user intent from message
 * Returns structured intent with parameters
 */
export function detectIntent(message: string): ReportIntent {
  const lower = message.toLowerCase().trim();
  const level = detectLevel(message);
  
  console.log('🎯 Detected level:', level);
  
  // Quick campaign from post detection (HIGHEST PRIORITY)
  // Detect when user mentions:
  // - "bài viết sẵn", "bài viết", "post", "qc bài viết"
  // - Facebook links (facebook.com, fb.com, story_fbid, permalink.php)
  if (
    lower.includes('bài viết sẵn') ||
    lower.includes('bài viết') ||
    lower.includes('post') ||
    lower.includes('qc bài viết') ||
    lower.includes('facebook.com') ||
    lower.includes('fb.com') ||
    lower.includes('story_fbid') ||
    lower.includes('permalink.php')
  ) {
    console.log('🎯 Intent: Quick Campaign from Post (will be handled by analyze-intent)');
    // Return general_chat to let analyze-intent handle the full extraction
    // This is just for logging purposes
    return { type: 'general_chat', params: {} };
  }
  
  // Specific metrics question detection
  if (
    lower.includes('bình luận') || 
    lower.includes('comments') ||
    lower.includes('tương tác') ||
    lower.includes('engagement') ||
    lower.includes('chia sẻ') ||
    lower.includes('shares') ||
    lower.includes('reactions') ||
    lower.includes('video') ||
    lower.includes('chi tiêu') ||
    lower.includes('spend') ||
    lower.includes('kết quả')
  ) {
    console.log('🎯 Intent: report_today (metrics focused)');
    return { type: 'report_today', params: { level } };
  }
  
  // Hourly report detection
  if (
    lower.match(/giờ|hour|theo giờ|hourly/) &&
    !lower.includes('hôm nay') &&
    !lower.includes('ngày')
  ) {
    console.log('🎯 Intent: report_hourly');
    return { type: 'report_hourly', params: { hoursAgo: 1, level } };
  }
  
  // All campaigns detection (active + paused)
  if (
    (lower.includes('tất cả') && lower.includes('chiến dịch')) ||
    lower.includes('tất cả các chiến dịch') ||
    lower.includes('các chiến dịch ở tài khoản') ||
    lower.includes('các chiến dịch đang chạy quảng cáo') ||
    lower.includes('list campaign') ||
    lower.includes('all campaigns')
  ) {
    console.log('🎯 Intent: report_all_campaigns');
    return { type: 'report_all_campaigns', params: { level } };
  }
  
  // Paused campaigns detection
  if (
    lower.includes('tạm dừng') ||
    lower.includes('đang dừng') ||
    lower.includes('paused') ||
    (lower.includes('không') && lower.includes('chạy'))
  ) {
    console.log('🎯 Intent: report_paused_campaigns');
    return { type: 'report_paused_campaigns', params: { level } };
  }

  // Timeframe detection (7 days, 30 days, etc.)
  if (
    lower.includes('7 ngày') ||
    lower.includes('tuần') ||
    lower.includes('7 day') ||
    lower.includes('week')
  ) {
    console.log('🎯 Intent: report_by_timeframe (7 days)');
    return { type: 'report_by_timeframe', params: { days: 7, level } };
  }

  if (
    lower.includes('30 ngày') ||
    lower.includes('tháng') ||
    lower.includes('30 day') ||
    lower.includes('month')
  ) {
    console.log('🎯 Intent: report_by_timeframe (30 days)');
    return { type: 'report_by_timeframe', params: { days: 30, level } };
  }

  if (
    lower.includes('14 ngày') ||
    lower.includes('2 tuần') ||
    lower.includes('14 day') ||
    lower.includes('2 week')
  ) {
    console.log('🎯 Intent: report_by_timeframe (14 days)');
    return { type: 'report_by_timeframe', params: { days: 14, level } };
  }

  // Budget range detection
  if (
    lower.includes('ngân sách') && (
      lower.includes('dưới') ||
      lower.includes('trên') ||
      lower.includes('từ') ||
      lower.includes('đến') ||
      lower.includes('budget') ||
      lower.includes('chi tiêu')
    )
  ) {
    // Extract budget values
    const numberMatches = message.match(/(\d+[\d,\.]*)/g);
    
    if (numberMatches && numberMatches.length >= 1) {
      const budgets = numberMatches.map(n => parseFloat(n.replace(/[,\.]/g, '')));
      
      if (lower.includes('dưới') || lower.includes('under') || lower.includes('below')) {
        console.log('🎯 Intent: report_by_budget (max:', budgets[0], ')');
        return { type: 'report_by_budget', params: { maxBudget: budgets[0], level } };
      } else if (lower.includes('trên') || lower.includes('over') || lower.includes('above')) {
        console.log('🎯 Intent: report_by_budget (min:', budgets[0], ')');
        return { type: 'report_by_budget', params: { minBudget: budgets[0], level } };
      } else if (budgets.length >= 2 && (lower.includes('từ') || lower.includes('đến') || lower.includes('between'))) {
        console.log('🎯 Intent: report_by_budget (range:', budgets[0], '-', budgets[1], ')');
        return { type: 'report_by_budget', params: { minBudget: budgets[0], maxBudget: budgets[1], level } };
      }
    }
  }
  
  // Active campaigns detection
  if (
    lower.includes('đang chạy') || 
    lower.includes('đang hoạt động') ||
    lower.includes('hoạt động') ||
    lower.includes('active') ||
    lower.includes('running')
  ) {
    console.log('🎯 Intent: report_active');
    return { type: 'report_active', params: { level } };
  }
  
  // Today's results detection
  if (
    lower.includes('hôm nay') || 
    lower.includes('ngày nay') ||
    lower.includes('today') ||
    lower.includes('kết quả hôm nay') ||
    lower.includes('báo cáo hôm nay')
  ) {
    console.log('🎯 Intent: report_today');
    return { type: 'report_today', params: { level } };
  }
  
  // Campaign by label detection
  const labelPatterns = [
    /label\s+["""]?(\w+)["""]?/i,
    /nhãn\s+["""]?(\w+)["""]?/i,
    /có\s+nhãn\s+["""]?(\w+)["""]?/i,
    /gắn\s+["""]?(\w+)["""]?/i,
  ];
  
  for (const pattern of labelPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const labelName = match[1];
      console.log('🎯 Intent: report_by_label, labelName:', labelName);
      return { type: 'report_by_label', params: { labelName, level } };
    }
  }
  
  // Performance/results detection
  if (
    lower.includes('kết quả') ||
    lower.includes('hiệu quả') ||
    lower.includes('performance') ||
    lower.includes('thành tích') ||
    lower.includes('báo cáo')
  ) {
    console.log('🎯 Intent: report_performance');
    return { type: 'report_performance', params: { level } };
  }
  
  // Default: general chat
  console.log('🎯 Intent: general_chat');
  return { type: 'general_chat', params: {} };
}
