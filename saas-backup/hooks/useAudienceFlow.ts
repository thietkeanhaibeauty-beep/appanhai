import { useState, useCallback } from 'react';
import {
  createFileAudience,
  createPageMessengersAudience,
  createLookalikeAudience
} from '@/services/aiChatAudienceOrchestratorService';

export type AudienceStage =
  | 'idle'
  | 'selecting_type'
  | 'collecting_file'
  | 'select_phone_method'
  | 'collecting_phone_input'
  | 'collecting_messenger_name'
  | 'collecting_messenger_page'
  | 'collecting_messenger_days'
  | 'collecting_lookalike'
  | 'confirming'
  | 'creating'
  | 'post_creation_options'
  | 'post_lookalike_creation'
  | 'needs_tos_verification';

export type AudienceType =
  | 'phone_numbers'
  | 'page_messenger'
  | 'lookalike';

interface AudienceState {
  stage: AudienceStage;
  type?: AudienceType;
  data?: {
    audienceName?: string;
    description?: string;
    phoneNumbers?: string[];
    pageId?: string;
    pageName?: string;
    retentionDays?: number;
    sourceAudienceId?: string;
    sourceId?: string;
    sourceName?: string;
    lookalikeRatio?: number;
    ratio?: number;
    country?: string;
    countryName?: string;
    availablePages?: any[];
    availableAudiences?: any[];
    showCountryButtons?: boolean;
    showRatioButtons?: boolean;
    showConfirmButtons?: boolean;
    createdAudienceId?: string;
    createdAudienceName?: string;
    createdAudiences?: Array<{ id: string; name: string; type: 'source' | 'lookalike' }>;
    tosLink?: string;
  };
}

interface AudienceFlowResult {
  stage: AudienceStage;
  type?: AudienceType;
  data: any;
  isActive: boolean;
  start: () => void;
  selectType: (type: AudienceType) => void;
  setData: (data: any) => void;
  setStage: (stage: AudienceStage, type?: AudienceType) => void;
  createAudience: (adAccountId: string, adsToken: string) => Promise<{ success: boolean; message: string; error?: string; tosLink?: string }>;
  reset: () => void;
}

export function useAudienceFlow(): AudienceFlowResult {
  const [state, setState] = useState<AudienceState>({
    stage: 'idle',
    type: undefined,
    data: undefined
  });

  const start = useCallback(() => {

    setState({ stage: 'selecting_type', type: undefined, data: undefined });
  }, []);

  const selectType = useCallback((type: AudienceType) => {


    if (type === 'phone_numbers') {
      setState({ stage: 'collecting_file', type, data: {} });
    } else if (type === 'page_messenger') {
      setState({ stage: 'collecting_messenger_name', type, data: {} });
    } else if (type === 'lookalike') {
      setState({ stage: 'collecting_lookalike', type, data: {} });
    }
  }, []);

  const setData = useCallback((data: any) => {
    setState(prev => ({ ...prev, data: { ...prev.data, ...data } }));
  }, []);

  const setStage = useCallback((stage: AudienceStage, type?: AudienceType) => {
    setState(prev => ({ ...prev, stage, ...(type ? { type } : {}) }));
  }, []);

  const createAudience = useCallback(async (
    adAccountId: string,
    adsToken: string
  ) => {


    setState(prev => ({ ...prev, stage: 'creating' }));

    try {
      let result;

      if (state.type === 'phone_numbers') {
        result = await createFileAudience(
          adAccountId,
          adsToken,
          state.data?.audienceName || 'Phone Audience',
          state.data?.description || 'Created from phone numbers',
          state.data?.phoneNumbers || [],
          (msg, type, detail) => { }
        );
      } else if (state.type === 'page_messenger') {
        result = await createPageMessengersAudience(
          adAccountId,
          adsToken,
          state.data?.audienceName || 'Messenger Audience',
          state.data?.description || 'Created from page messengers',
          state.data?.pageId || '',
          state.data?.retentionDays || 365,
          (msg, type, detail) => { }
        );
      } else if (state.type === 'lookalike') {

        result = await createLookalikeAudience(
          adAccountId,
          adsToken,
          state.data?.audienceName || 'Lookalike Audience',
          state.data?.description || 'Created from lookalike',
          state.data?.sourceId || '',
          state.data?.country || 'VN',
          state.data?.ratio || 1, // Gửi số nguyên 1-20, service sẽ chia cho 100
          (msg, type, detail) => { }
        );
      } else {
        return {
          success: false,
          message: '❌ Loại đối tượng không hợp lệ',
          error: 'Loại đối tượng không hợp lệ'
        };
      }



      if (!result.success) {
        // Check if it's a TOS verification error
        if (result.tosLink) {
          setState(prev => ({
            ...prev,
            stage: 'needs_tos_verification',
            data: { ...prev.data, tosLink: result.tosLink }
          }));
          return {
            success: false,
            message: result.error || '⚠️ Cần xác nhận điều khoản',
            error: result.error,
            tosLink: result.tosLink
          };
        }

        // Fallback logic for other errors
        let prevStage: AudienceStage = 'idle';
        if (state.type === 'phone_numbers') {
          prevStage = 'collecting_file';
        } else if (state.type === 'page_messenger') {
          prevStage = 'collecting_messenger_days';
        } else if (state.type === 'lookalike') {
          prevStage = 'collecting_lookalike';
        }

        setState(prev => ({ ...prev, stage: prevStage }));
        return {
          success: false,
          message: `❌ Tạo đối tượng thất bại: ${result.error}`,
          error: result.error
        };
      }

      // Success
      if (state.type === 'lookalike') {
        // For Lookalike created after source audience, offer to run ads on both
        const existingAudiences = state.data?.createdAudiences || [];
        if (existingAudiences.length > 0) {
          // We have source audience, add lookalike and offer ads
          setState(prev => ({
            ...prev,
            stage: 'post_lookalike_creation',
            data: {
              ...prev.data,
              createdAudiences: [
                ...existingAudiences,
                { id: result.audienceId!, name: result.audienceName!, type: 'lookalike' as const }
              ]
            }
          }));
        } else {
          // Standalone lookalike, reset to idle
          setState({ stage: 'idle', type: undefined, data: undefined });
        }
      } else {
        // For Custom Audiences (File/Messenger), save to createdAudiences and offer lookalike
        setState(prev => ({
          ...prev,
          stage: 'post_creation_options',
          data: {
            ...prev.data,
            createdAudienceId: result.audienceId,
            createdAudienceName: result.audienceName,
            createdAudiences: [
              { id: result.audienceId!, name: result.audienceName!, type: 'source' as const }
            ]
          }
        }));
      }

      return {
        success: true,
        message: `✅ Tệp đối tượng "${result.audienceName}" đã được tạo thành công!`
      };
    } catch (error: any) {
      console.error('[AudienceFlow] Creation error:', error);

      let prevStage: AudienceStage = 'idle';
      if (state.type === 'phone_numbers') {
        prevStage = 'collecting_file';
      } else if (state.type === 'page_messenger') {
        prevStage = 'collecting_messenger_days';
      } else {
        prevStage = 'collecting_lookalike';
      }

      setState(prev => ({ ...prev, stage: prevStage }));
      return {
        success: false,
        message: `❌ Lỗi: ${error.message}`,
        error: error.message
      };
    }
  }, [state.type, state.data]);

  const reset = useCallback(() => {

    setState({ stage: 'idle', type: undefined, data: undefined });
  }, []);

  return {
    stage: state.stage,
    type: state.type,
    data: state.data || {},
    isActive: state.stage !== 'idle',
    start,
    selectType,
    setData,
    setStage,
    createAudience,
    reset
  };
}
