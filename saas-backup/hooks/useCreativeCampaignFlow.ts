import { useState, useCallback } from 'react';
import { parseAndValidateCreativeCampaign } from '@/services/aiChatCreativeOrchestratorService';
import * as quickCreativeFacebookService from '@/services/quickCreativeFacebookService';
import { creativeCampaignService } from '@/services/creativeCampaign.service';

export type CreativeStage =
  | 'idle'
  | 'parsing'
  | 'reviewing_data'
  | 'awaiting_media'
  | 'awaiting_radius'
  | 'confirming'
  | 'creating';

interface CreativeState {
  stage: CreativeStage;
  partialData?: any;
  mediaFile?: File;
  uploadedHash?: string;
  uploadedVideoId?: string;
  mediaType?: 'image' | 'video';
  thumbnailUrl?: string;
  thumbnailChoice?: 'default' | 'custom';
  customThumbnailHash?: string;
  customThumbnailUrl?: string;
  customAudienceIds?: string[];
}

interface CreativeFlowResult {
  stage: CreativeStage;
  partialData: any;
  mediaFile?: File;
  uploadedHash?: string;
  uploadedVideoId?: string;
  mediaType?: 'image' | 'video';
  thumbnailUrl?: string;
  thumbnailChoice?: 'default' | 'custom';
  customThumbnailHash?: string;
  customThumbnailUrl?: string;
  customAudienceIds?: string[];
  isActive: boolean;
  start: (rawInput: string, adsToken: string, hasMediaUploaded?: boolean, customAudienceIds?: string[]) => Promise<{ success: boolean; message: string; data?: any; missingField?: string }>;
  handleRadiusInput: (radiusText: string) => Promise<{ success: boolean; message: string; data?: any }>;
  uploadMedia: (file: File, adAccountId: string, adsToken: string) => Promise<{ success: boolean; hash?: string; videoId?: string; message: string }>;
  setMediaFile: (file: File) => void;
  setThumbnailUrl: (url: string) => void;
  continueToUpload: () => void;
  confirmAndCreate: (userId: string, adsToken: string, pageToken: string, adAccountId: string, pageId: string) => Promise<{ success: boolean; message: string; ids?: any; error?: string }>;
  reset: () => void;
}

export function useCreativeCampaignFlow(): CreativeFlowResult {
  const [state, setState] = useState<CreativeState>({
    stage: 'idle',
    partialData: undefined,
    mediaFile: undefined,
    uploadedHash: undefined,
    uploadedVideoId: undefined,
    mediaType: undefined,
    thumbnailUrl: undefined,
    thumbnailChoice: undefined,
    customThumbnailHash: undefined,
    customThumbnailUrl: undefined
  });

  const start = useCallback(async (
    rawInput: string,
    adsToken: string,
    hasMediaUploadedOrOptions?: boolean | {
      hasMediaUploaded?: boolean;
      customAudienceIds?: string[];
      uploadedHash?: string;
      uploadedVideoId?: string;
    },
    legacyCustomAudienceIds?: string[]
  ) => {
    // Handle options overloading
    let hasMediaUploaded = false;
    let customAudienceIds: string[] | undefined = legacyCustomAudienceIds;
    let uploadedHash: string | undefined = undefined;
    let uploadedVideoId: string | undefined = undefined;

    if (typeof hasMediaUploadedOrOptions === 'object') {
      hasMediaUploaded = hasMediaUploadedOrOptions.hasMediaUploaded || false;
      customAudienceIds = hasMediaUploadedOrOptions.customAudienceIds;
      uploadedHash = hasMediaUploadedOrOptions.uploadedHash;
      uploadedVideoId = hasMediaUploadedOrOptions.uploadedVideoId;
    } else {
      hasMediaUploaded = !!hasMediaUploadedOrOptions;
    }

    setState(prev => ({
      ...prev,
      stage: 'parsing',
      partialData: { rawInput },
      customAudienceIds,
      uploadedHash: uploadedHash || prev.uploadedHash, // Explicit update or preserve
      uploadedVideoId: uploadedVideoId || prev.uploadedVideoId
    }));

    try {
      // 1. Parse text with AI
      const analyzedData = await parseAndValidateCreativeCampaign(rawInput, adsToken, () => { });

      if (analyzedData.error) {
        setState(prev => ({ ...prev, stage: 'idle', error: analyzedData.error }));
        return { success: false, message: analyzedData.error };
      }

      const parsed = analyzedData.data;

      setState(prev => ({
        ...prev,
        partialData: parsed,
        // If we found a location that needs verification (city/radius), check logic here
        // For now, assume AI did good job or we check next step
      }));

      // 2. Decide next step
      // Logic: If media is uploaded OR parsed says "no parsing error", go to confirming?
      // Actually usually goes to 'reviewing_data' (confirm card)

      // If locations need radius (city), we might prompt?
      // Logic:
      // If location type is city and radius is null, AI said "null defaults to 17km" in create step.
      // So we can go straight to review.

      setState(prev => ({ ...prev, stage: 'reviewing_data' }));
      return { success: true, message: '__SHOW_CREATIVE_CONFIRM_CARD__' };

    } catch (error: any) {
      console.error('Error starting creative flow:', error);
      setState(prev => ({ ...prev, stage: 'idle', error: error.message }));
      return { success: false, message: error.message };
    }
  }, []);

  const handleRadiusInput = useCallback(async (radiusText: string) => {


    const radiusNum = parseInt(radiusText.trim(), 10);
    if (isNaN(radiusNum) || radiusNum <= 0) {
      return {
        success: false,
        message: '⚠️ Bán kính phải là số dương (VD: 5, 10, 15). Vui lòng nhập lại!'
      };
    }

    const locations = state.partialData?.locations || [];
    const hasCoordinates = locations.some((loc: any) => /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(loc.trim()));
    const minRadius = hasCoordinates ? 1 : 17;

    if (radiusNum < minRadius) {
      const locationType = hasCoordinates ? 'tọa độ' : 'thành phố';
      return {
        success: false,
        message: `⚠️ Bán kính **${radiusNum}km** quá nhỏ!\n\n` +
          `Với ${locationType}, bán kính tối thiểu là **${minRadius}km**.\n\n` +
          `💡 Ví dụ: 5, 10, 15\n\n` +
          `Vui lòng nhập lại bán kính mới nhé!`
      };
    }

    const updatedData = {
      ...state.partialData,
      locationRadius: radiusNum
    };

    setState(prev => ({
      ...prev,
      stage: 'awaiting_media',
      partialData: updatedData
    }));

    return {
      success: true,
      message: `✅ Đã cập nhật bán kính **${radiusNum}km**. Giờ hãy tải ảnh/video lên!`,
      data: updatedData
    };
  }, [state.partialData]);

  const uploadMedia = useCallback(async (
    file: File,
    adAccountId: string,
    adsToken: string
  ) => {


    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      return { success: false, message: 'File không hợp lệ. Chỉ chấp nhận ảnh hoặc video.' };
    }

    setState(prev => ({
      ...prev,
      mediaFile: file,
      mediaType: isImage ? 'image' : 'video'
    }));

    try {
      if (isImage) {
        const result = await quickCreativeFacebookService.uploadAdImage(adAccountId, adsToken, file);


        setState(prev => ({
          ...prev,
          uploadedHash: result.imageHash,
          stage: 'confirming'
        }));

        return {
          success: true,
          hash: result.imageHash,
          message: '✅ Upload ảnh thành công!'
        };
      } else {
        const result = await quickCreativeFacebookService.uploadAdVideo(adAccountId, adsToken, file);


        // ✅ TỰ ĐỘNG FETCH THUMBNAIL NGAY SAU KHI UPLOAD
        let thumbnailUrl = '';
        try {

          thumbnailUrl = await quickCreativeFacebookService.getVideoThumbnails(result.videoId, adsToken);

        } catch (error) {
          console.warn('[CreativeFlow] ⚠️ Could not fetch thumbnail, will rely on edge function fallback:', error);
        }

        setState(prev => ({
          ...prev,
          uploadedVideoId: result.videoId,
          thumbnailUrl, // ✅ LƯU THUMBNAIL VÀO STATE
          stage: 'confirming' // ✅ CHUYỂN THẲNG SANG CONFIRMING
        }));

        return {
          success: true,
          videoId: result.videoId,
          message: thumbnailUrl
            ? '✅ Upload video thành công! Đã tự động lấy thumbnail.'
            : '✅ Upload video thành công! Thumbnail sẽ được tạo tự động.'
        };
      }
    } catch (error: any) {
      console.error('[CreativeFlow] Upload error:', error);
      setState(prev => ({ ...prev, stage: 'awaiting_media' }));
      return {
        success: false,
        message: `❌ Lỗi upload: ${error.message}`
      };
    }
  }, []);

  const setMediaFile = useCallback((file: File) => {
    const isVideo = file.type.startsWith('video/');
    setState(prev => ({ ...prev, mediaFile: file, mediaType: isVideo ? 'video' : 'image' }));
  }, []);

  const setThumbnailUrl = useCallback((url: string) => {
    setState(prev => ({ ...prev, thumbnailUrl: url }));
  }, []);

  const confirmAndCreate = useCallback(async (
    userId: string,
    adsToken: string,
    pageToken: string,
    adAccountId: string,
    pageId: string
  ) => {

    setState(prev => ({ ...prev, stage: 'creating' }));

    try {
      if (!state.partialData) {
        throw new Error('Không có dữ liệu phân tích');
      }

      // Build targeting object
      const targeting: any = {
        age_min: state.partialData.ageMin,
        age_max: state.partialData.ageMax,
        genders: state.partialData.gender === 'male' ? [1] : state.partialData.gender === 'female' ? [2] : [1, 2],
        geo_locations: {},
        interests: state.partialData.interests?.map((int: any) => ({ id: int.id, name: int.name })) || []
      };

      // ✅ Add Custom Audiences if available
      if (state.customAudienceIds && state.customAudienceIds.length > 0) {
        targeting.custom_audiences = state.customAudienceIds.map(id => ({ id }));
      }

      // Add location targeting
      if (state.partialData.locationType === 'city' && state.partialData.resolvedLocation) {
        targeting.geo_locations.cities = [{
          key: state.partialData.resolvedLocation.key,
          radius: state.partialData.radiusKm || 17,
          distance_unit: 'kilometer'
        }];
      } else if (state.partialData.locationType === 'coordinate') {
        targeting.geo_locations.custom_locations = [{
          latitude: state.partialData.latitude,
          longitude: state.partialData.longitude,
          radius: state.partialData.radiusKm || 17,
          distance_unit: 'kilometer'
        }];
      } else if (state.partialData.locationType === 'country' && state.partialData.resolvedLocation) {
        targeting.geo_locations.countries = [state.partialData.resolvedLocation.country_code || 'VN'];
      } else {
        // Fallback: Default to entire Vietnam if no specific location is detected
        targeting.geo_locations.countries = ['VN'];
      }


      const campaignResult = await creativeCampaignService.createCampaignStep({
        campaignName: state.partialData.campaignName,
        adsToken,
        adAccountId
      });

      if (!campaignResult.success || !campaignResult.campaignId) {
        throw new Error(campaignResult.error || 'Tạo chiến dịch thất bại');
      }

      // ✅ Lifetime Budget & Schedule Handling (case-insensitive check)
      const isLifetime = String(state.partialData.budgetType || '').toLowerCase() === 'lifetime';

      let adsetSchedule: Array<{ days: number[]; start_minute: number; end_minute: number; timezone_type: string }> | undefined;

      if (isLifetime && state.partialData.enableSchedule && state.partialData.scheduleSlots?.length > 0) {
        adsetSchedule = state.partialData.scheduleSlots.map((slot: any) => ({
          days: slot.days,
          start_minute: slot.startHour * 60,
          end_minute: slot.endHour * 60,
          timezone_type: 'ADVERTISER' // ✅ Fixed: Must be USER or ADVERTISER
        }));
      }

      const adSetResult = await creativeCampaignService.createAdSetStep({
        campaignId: campaignResult.campaignId,
        adSetName: state.partialData.campaignName, // Keep original name
        budgetType: isLifetime ? 'LIFETIME' : 'DAILY',
        dailyBudget: isLifetime ? undefined : state.partialData.budget,
        lifetimeBudget: isLifetime ? (state.partialData.lifetimeBudget || state.partialData.budget) : undefined,
        startTime: isLifetime ? state.partialData.startTime : undefined,
        endTime: isLifetime ? state.partialData.endTime : undefined,
        adsetSchedule,
        targeting: JSON.stringify(targeting),
        optimizationGoal: 'CONVERSATIONS',
        billingEvent: 'IMPRESSIONS',
        bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
        promotedObject: { page_id: pageId },
        adsToken,
        adAccountId,
        currency: 'VND',
        customAudienceIds: state.customAudienceIds // ✅ Pass custom audience IDs
      });

      if (!adSetResult.success || !adSetResult.adSetId) {
        throw new Error(adSetResult.error || 'Tạo nhóm quảng cáo thất bại');
      }



      // ===== STEP 3: Create Ad =====



      const adResult = await creativeCampaignService.createAdStep({
        adSetId: adSetResult.adSetId,
        adName: state.partialData.campaignName, // ✅ Giữ nguyên tên gốc, bỏ suffix " Ad"
        creativeType: state.mediaType!,
        imageHash: state.mediaType === 'image' ? state.uploadedHash : undefined,
        videoId: state.mediaType === 'video' ? state.uploadedVideoId : undefined,
        thumbnailUrl: state.thumbnailUrl, // ✅ DÙNG TRỰC TIẾP STATE
        headline: state.partialData.adHeadline,
        primaryText: state.partialData.adContent,
        pageId,
        adsToken,
        adAccountId,
        greetingMessage: state.partialData.greetingText,
        iceBreakers: state.partialData.iceBreakerQuestions || []
      });

      if (!adResult.success || !adResult.adId) {
        throw new Error(adResult.error || 'Tạo quảng cáo thất bại');
      }



      setState({
        stage: 'idle',
        partialData: undefined,
        mediaFile: undefined,
        uploadedHash: undefined,
        uploadedVideoId: undefined,
        mediaType: undefined,
        thumbnailUrl: undefined,
        thumbnailChoice: undefined,
        customThumbnailHash: undefined,
        customThumbnailUrl: undefined
      });

      return {
        success: true,
        message: 'Chiến dịch đã được tạo thành công!',
        ids: {
          campaignId: campaignResult.campaignId,
          adSetId: adSetResult.adSetId,
          creativeId: adResult.creativeId,
          adId: adResult.adId
        }
      };
    } catch (error: any) {
      console.error('[CreativeFlow] Error:', error);
      setState(prev => ({ ...prev, stage: 'confirming' }));
      return {
        success: false,
        message: error.message || 'Lỗi tạo chiến dịch',
        error: error.message
      };
    }
  }, [state]);

  const continueToUpload = useCallback(() => {

    setState(prev => ({
      ...prev,
      stage: 'awaiting_media'
    }));
  }, []);

  const selectThumbnailOption = useCallback((choice: 'default' | 'custom') => {

    setState(prev => ({
      ...prev,
      thumbnailChoice: choice,
      stage: choice === 'default' ? 'confirming' : 'awaiting_media'
    }));
  }, []);

  const uploadCustomThumbnail = useCallback(async (
    file: File,
    adAccountId: string,
    adsToken: string
  ) => {


    try {
      const { imageHash, imageUrl } = await quickCreativeFacebookService.uploadAdImage(adAccountId, adsToken, file);


      setState(prev => ({
        ...prev,
        customThumbnailHash: imageHash,
        customThumbnailUrl: imageUrl,
        stage: 'confirming'
      }));

      return {
        success: true,
        message: '✅ Upload thumbnail thành công!'
      };
    } catch (error: any) {
      console.error('[CreativeFlow] Thumbnail upload error:', error);
      return {
        success: false,
        message: `❌ Lỗi upload thumbnail: ${error.message}`
      };
    }
  }, []);

  const reset = useCallback(() => {

    setState({
      stage: 'idle',
      partialData: undefined,
      mediaFile: undefined,
      uploadedHash: undefined,
      uploadedVideoId: undefined,
      mediaType: undefined,
      thumbnailUrl: undefined,
      thumbnailChoice: undefined,
      customThumbnailHash: undefined,
      customThumbnailUrl: undefined
    });
  }, []);

  return {
    stage: state.stage,
    partialData: state.partialData,
    mediaFile: state.mediaFile,
    uploadedHash: state.uploadedHash,
    uploadedVideoId: state.uploadedVideoId,
    mediaType: state.mediaType,
    thumbnailUrl: state.thumbnailUrl,
    thumbnailChoice: state.thumbnailChoice,
    customThumbnailHash: state.customThumbnailHash,
    customThumbnailUrl: state.customThumbnailUrl,
    customAudienceIds: state.customAudienceIds,
    isActive: state.stage !== 'idle',
    start,
    handleRadiusInput,
    uploadMedia,
    setMediaFile,
    setThumbnailUrl,
    continueToUpload,
    confirmAndCreate,
    reset
  };
}
