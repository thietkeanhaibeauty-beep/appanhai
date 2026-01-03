import { supabase } from "@/integrations/supabase/client";

export interface CampaignStepParams {
  campaignName: string;
  adsToken: string;
  adAccountId: string;
}

export interface AdSetStepParams {
  campaignId: string;
  adSetName: string;
  dailyBudget?: number;
  budgetType?: 'DAILY' | 'LIFETIME';
  lifetimeBudget?: number;
  startTime?: string;
  endTime?: string;
  adsetSchedule?: Array<{
    days: number[];
    start_minute: number;
    end_minute: number;
    timezone_type?: string;
  }>;
  targeting: any;
  optimizationGoal?: string;
  billingEvent?: string;
  bidStrategy?: string;
  promotedObject: {
    page_id: string;
  };
  adsToken: string;
  adAccountId: string;
  currency?: string;
  customAudienceIds?: string[];
}

export interface AdStepParams {
  adSetId: string;
  adName: string;
  creativeType: 'image' | 'video';
  imageHash?: string;
  videoId?: string;
  thumbnailUrl?: string;
  headline?: string;
  primaryText?: string;
  resolvedPostId?: string;
  postUrl?: string;
  pageId: string;
  adsToken: string;
  adAccountId: string;
  greetingMessage?: string;
  iceBreakers?: Array<{ question: string; payload: string }>;
}

export const creativeCampaignService = {
  async createCampaignStep(params: CampaignStepParams) {




    const { data, error } = await supabase.functions.invoke('create-fb-campaign-step', {
      body: params
    });

    if (error) {
      console.error('Campaign step error:', error);
      throw error;
    }



    if (!data.success) {
      throw new Error(data.error || 'Tạo chiến dịch thất bại');
    }

    return data;
  },

  async createAdSetStep(params: AdSetStepParams) {




    const { data, error } = await supabase.functions.invoke('create-fb-adset-step', {
      body: params
    });

    if (error) {
      console.error('AdSet step error:', error);
      throw error;
    }



    if (!data.success) {
      throw new Error(data.error || 'Tạo nhóm quảng cáo thất bại');
    }

    return data;
  },

  async createAdStep(params: AdStepParams) {




    const { data, error } = await supabase.functions.invoke('create-fb-ad-step', {
      body: params
    });

    if (error) {
      console.error('Ad step error:', error);
      throw error;
    }



    if (!data.success) {
      throw new Error(data.error || 'Tạo quảng cáo thất bại');
    }

    return data;
  }
};
