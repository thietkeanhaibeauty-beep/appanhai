import { useEffect } from 'react';

// Event types for campaign creation communication
export type CampaignEventType = 
  | 'campaign-creation-requested'
  | 'campaign-creation-auto-start' // AI đã xác thực xong, tự động tạo luôn
  | 'campaign-creation-started'
  | 'campaign-creation-progress'
  | 'campaign-creation-completed'
  | 'campaign-creation-failed'
  | 'campaign-parse-status' // Cập nhật trạng thái phân tích (parsing, validating, etc.)
  | 'campaign-parse-success' // Phân tích thành công, sẵn sàng tạo
  | 'campaign-parse-failed' // Phân tích thất bại
  | 'campaign-needs-more-info'; // Thiếu thông tin, cần hỏi user

export interface CampaignEventData {
  type: CampaignEventType;
  data?: any;
  message?: string;
  error?: string;
  needsMoreInfo?: {
    field: string;
    prompt: string;
    partialData?: any;
  };
}

// Event dispatcher - sends events to listeners
export const dispatchCampaignEvent = (eventData: CampaignEventData) => {
  window.dispatchEvent(
    new CustomEvent('campaign-event', { detail: eventData })
  );
};

// Event listener hook - listens for campaign events
export const useCampaignEvents = (callback: (data: CampaignEventData) => void) => {
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<CampaignEventData>;
      callback(customEvent.detail);
    };
    
    window.addEventListener('campaign-event', handler);
    return () => window.removeEventListener('campaign-event', handler);
  }, [callback]);
};
