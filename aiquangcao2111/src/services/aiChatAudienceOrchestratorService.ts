// AI Chat Audience Orchestrator Service - Điều phối tạo đối tượng quảng cáo
import { supabase } from "@/integrations/supabase/client";
import * as facebookService from './facebook';

export type AudienceType = 'file' | 'page_messengers' | 'lookalike';

export interface ParsedAudienceData {
  audienceName?: string | null;
  description?: string | null;
  retentionDays?: number | null;
  country?: string | null;
  ratio?: number | null;
  hasFile?: boolean | null;
}

export type LogCallback = (message: string, type: 'info' | 'success' | 'error', details?: string) => void;

export interface ParseAudienceResult {
  success: boolean;
  needsMoreInfo?: boolean;
  missingField?: 'name' | 'file' | 'pageId' | 'retentionDays' | 'sourceId' | 'country' | 'ratio';
  missingFieldPrompt?: string;
  partialData?: any;
  data?: ParsedAudienceData;
  error?: string;
}

export interface CreateAudienceResult {
  success: boolean;
  audienceId?: string;
  audienceName?: string;
  audienceType?: AudienceType;
  error?: string;
  tosLink?: string; // TOS verification link when error 1870090 occurs
}

// Parse audience input với AI
export const parseAudienceInput = async (
  userMessage: string,
  currentStage: string,
  currentData: any
): Promise<ParsedAudienceData> => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-parse-audience', {
      body: {
        userMessage,
        currentStage,
        currentData
      }
    });

    if (error) {
      console.error('[parseAudienceInput] Error:', error);
      return {};
    }

    return data as ParsedAudienceData;
  } catch (error) {
    console.error('[parseAudienceInput] Exception:', error);
    return {};
  }
};

// Validate và trả về missing field nếu cần
export const validateAudienceData = (
  type: AudienceType,
  data: any,
  phoneNumbers?: string[]
): ParseAudienceResult => {
  // Validate name cho tất cả types
  if (!data.audienceName || !data.audienceName.trim()) {
    return {
      success: false,
      needsMoreInfo: true,
      missingField: 'name',
      missingFieldPrompt: 'Anh cho em biết tên đối tượng này ạ?',
      partialData: data
    };
  }

  // Validate theo type
  if (type === 'file') {
    if (!phoneNumbers || phoneNumbers.length === 0) {
      return {
        success: false,
        needsMoreInfo: true,
        missingField: 'file',
        missingFieldPrompt: 'Anh vui lòng tải file .txt hoặc .csv chứa SĐT (mỗi số 1 dòng) ạ',
        partialData: data
      };
    }
  } else if (type === 'page_messengers') {
    if (!data.pageId) {
      return {
        success: false,
        needsMoreInfo: true,
        missingField: 'pageId',
        missingFieldPrompt: 'Em không tìm thấy Page nào. Anh vui lòng kết nối Page trong Cài đặt trước ạ',
        partialData: data
      };
    }
    if (!data.retentionDays || data.retentionDays < 1 || data.retentionDays > 365) {
      return {
        success: false,
        needsMoreInfo: true,
        missingField: 'retentionDays',
        missingFieldPrompt: 'Anh muốn lấy người nhắn tin trong bao nhiêu ngày qua? (từ 1 đến 365 ngày) ạ',
        partialData: data
      };
    }
  } else if (type === 'lookalike') {
    if (!data.sourceId) {
      return {
        success: false,
        needsMoreInfo: true,
        missingField: 'sourceId',
        missingFieldPrompt: 'Anh vui lòng chọn một đối tượng nguồn để tạo lookalike ạ',
        partialData: data
      };
    }
    if (!data.country) {
      return {
        success: false,
        needsMoreInfo: true,
        missingField: 'country',
        missingFieldPrompt: 'Anh muốn tạo lookalike ở quốc gia nào? (VN, US, TH, SG, MY) ạ',
        partialData: data
      };
    }
    if (!data.ratio || data.ratio < 1 || data.ratio > 20) {
      return {
        success: false,
        needsMoreInfo: true,
        missingField: 'ratio',
        missingFieldPrompt: 'Anh muốn quy mô lookalike là bao nhiêu %? (từ 1% đến 20%) ạ',
        partialData: data
      };
    }
  }

  return { success: true };
};

// Tạo File Upload Audience
export const createFileAudience = async (
  adAccountId: string,
  accessToken: string,
  audienceName: string,
  description: string,
  phoneNumbers: string[],
  addLog: LogCallback
): Promise<CreateAudienceResult> => {
  try {
    addLog('Bước 0', 'info', 'Kiểm tra TOS status...');

    // Check TOS status first for debugging
    try {
      const tosStatus = await facebookService.checkCustomAudienceTosStatus(adAccountId, accessToken);
      addLog('TOS Status', 'info', `custom_audience_tos = ${tosStatus.customAudienceTos}`);
    } catch (tosError: any) {
      // TOS check failed, continue anyway
    }

    addLog('Bước 1/2', 'info', 'Tạo container đối tượng...');

    const audienceId = await facebookService.createCustomAudience(
      adAccountId,
      accessToken,
      audienceName,
      description
    );

    addLog('Bước 1/2', 'success', `Container ID: ${audienceId}`);

    addLog('Bước 2/2', 'info', `Tải lên ${phoneNumbers.length.toLocaleString('vi-VN')} SĐT...`);

    await facebookService.addUsersToCustomAudience(
      audienceId,
      accessToken,
      phoneNumbers
    );

    addLog('Bước 2/2', 'success', 'Tải lên thành công');

    return {
      success: true,
      audienceId,
      audienceName,
      audienceType: 'file'
    };
  } catch (error: any) {

    // Detect TOS not accepted error (subcode 1870090)
    const isTosError = error.error_subcode === 1870090 ||
      error.message?.includes('1870090') ||
      error.message?.includes('Subcode: 1870090');

    if (isTosError) {
      // Extract numeric Ad Account ID (remove 'act_' prefix if present)
      const numericAccountId = adAccountId.replace('act_', '');
      // Use act= parameter format as per Facebook's error message format
      const tosLink = `https://business.facebook.com/ads/manage/customaudiences/tos/?act=${numericAccountId}`;

      addLog('❌ Chưa xác minh điều khoản', 'error', 'Cần chấp nhận điều khoản Custom Audience');

      return {
        success: false,
        error: '⚠️ Chưa chấp nhận điều khoản Custom Audience',
        tosLink // Return link for UI to open in new tab
      };
    }

    addLog('❌ Lỗi tạo đối tượng', 'error', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Tạo Page Messengers Audience
export const createPageMessengersAudience = async (
  adAccountId: string,
  accessToken: string,
  audienceName: string,
  description: string,
  pageId: string,
  retentionDays: number,
  addLog: LogCallback
): Promise<CreateAudienceResult> => {
  try {
    addLog('Đang tạo', 'info', 'Tạo đối tượng người nhắn tin...');

    const audienceId = await facebookService.createPageMessengersAudience(
      adAccountId,
      accessToken,
      audienceName,
      description,
      pageId,
      retentionDays
    );

    addLog('✅ Thành công', 'success', `Audience ID: ${audienceId}`);

    return {
      success: true,
      audienceId,
      audienceName,
      audienceType: 'page_messengers'
    };
  } catch (error: any) {
    console.error('[createPageMessengersAudience] Error:', error);
    addLog('❌ Lỗi tạo đối tượng', 'error', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Tạo Lookalike Audience
export const createLookalikeAudience = async (
  adAccountId: string,
  accessToken: string,
  audienceName: string,
  description: string,
  sourceId: string,
  country: string,
  ratio: number,
  addLog: LogCallback
): Promise<CreateAudienceResult> => {
  try {
    addLog('Đang tạo', 'info', 'Tạo đối tượng tương tự...');

    const audienceId = await facebookService.createLookalikeAudience(
      adAccountId,
      accessToken,
      audienceName,
      description,
      sourceId,
      country,
      ratio
    );

    addLog('✅ Thành công', 'success', `Audience ID: ${audienceId}`);

    return {
      success: true,
      audienceId,
      audienceName,
      audienceType: 'lookalike'
    };
  } catch (error: any) {
    addLog('❌ Lỗi tạo đối tượng', 'error', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get custom audiences list
export const getCustomAudiences = async (
  adAccountId: string,
  accessToken: string
): Promise<Array<{ id: string; name: string }>> => {
  try {
    return await facebookService.getCustomAudiences(adAccountId, accessToken);
  } catch (error) {
    console.error('[getCustomAudiences] Error:', error);
    return [];
  }
};
