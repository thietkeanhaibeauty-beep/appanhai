import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type {
  QuickPostStage,
  ParsedCampaignData,
  QuickPostTokens,
  QuickPostResult
} from '../types';
import {
  parseQuickPost,
  validatePost,
  createCampaignStep,
  createAdSetStep,
  createAdStep,
  buildTargetingObject,
} from '../services/quickPost.service';

// ✨ NEW: Budget options type for lifetime support
interface BudgetOptions {
  budgetType: 'DAILY' | 'LIFETIME';
  lifetimeBudget?: number;
  startTime?: string;
  endTime?: string;
}

interface UseQuickPostFlowReturn {
  stage: QuickPostStage;
  data: Partial<ParsedCampaignData>;
  lastMessage: string;
  isLoading: boolean;

  // Created IDs
  campaignId: string | null;
  adSetId: string | null;
  adId: string | null;

  // ✨ NEW: Budget options state
  budgetOptions: BudgetOptions;
  setBudgetOptions: (options: BudgetOptions) => void;

  // Methods
  start: (input: string, tokens: QuickPostTokens) => Promise<{ message: string; stage: QuickPostStage }>;
  handleInput: (text: string) => Promise<{ message: string; stage: QuickPostStage }>;

  // Individual step methods (can be called independently)
  createCampaign: (tokens: { adsToken: string; adAccountId: string }) => Promise<{ campaignId: string }>;
  createAdSet: (campaignId: string, tokens: QuickPostTokens) => Promise<{ adSetId: string }>;
  createAd: (adSetId: string, tokens: QuickPostTokens) => Promise<{ adId: string; creativeId: string }>;

  // Full flow method
  confirmAndCreate: (tokens: QuickPostTokens) => Promise<QuickPostResult | null>;
  reset: () => void;
  updateData: (updater: (prev: Partial<ParsedCampaignData>) => Partial<ParsedCampaignData>) => void;
}

const MESSAGES = {
  parsing: '🤖 Đang phân tích yêu cầu của bạn...',
  awaiting_budget: '💰 Bạn muốn ngân sách bao nhiêu VND/ngày? (Tối thiểu 40,000 VND)',
  awaiting_age: '👤 Độ tuổi mục tiêu? (Ví dụ: 18-35)',
  awaiting_gender: '⚥ Giới tính? (nam/nữ/tất cả)',
  awaiting_location: '📍 Vị trí targeting? (Ví dụ: Hồ Chí Minh, Hà Nội)',
  awaiting_radius: '📏 Bán kính targeting (km)? (Tối thiểu 17km cho thành phố)',
  awaiting_interests: '🎯 Sở thích mục tiêu? (Ví dụ: Du lịch, Ẩm thực)',
  confirming: '✅ Dữ liệu đã đầy đủ. Xem lại thông tin và nhấn "Xác nhận" để tạo.',
  creating: '⚙️ Đang tạo chiến dịch...',
  done: '🎉 Tạo thành công!',
  error: '❌ Có lỗi xảy ra. Vui lòng thử lại.',
};

export function useQuickPostFlow(): UseQuickPostFlowReturn {
  const { user } = useAuth();
  const [stage, setStage] = useState<QuickPostStage>('idle');
  const [data, setData] = useState<Partial<ParsedCampaignData>>({});
  const [lastMessage, setLastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // State for created IDs (each step)
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [adSetId, setAdSetId] = useState<string | null>(null);
  const [adId, setAdId] = useState<string | null>(null);

  // ✨ NEW: Budget options state
  const [budgetOptions, setBudgetOptions] = useState<BudgetOptions>({
    budgetType: 'DAILY',
  });

  /**
   * Start flow: Parse input with AI
   */
  const start = useCallback(async (input: string, tokens: QuickPostTokens) => {

    if (!user?.id) {
      throw new Error('❌ Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.');
    }

    setIsLoading(true);
    setStage('parsing');
    setLastMessage(MESSAGES.parsing);



    try {
      // Parse with AI
      const parsed = await parseQuickPost(input, tokens, user.id);



      // ✅ Only validate post if we DON'T have resolvedPostId from Edge Function
      // OR if resolvedPostId contains 'pfbid' (needs to be resolved to numeric ID)
      // Edge Function already resolves video → post ID correctly
      const needsPostValidation = parsed.postUrl && tokens.pageId && (
        !parsed.resolvedPostId ||
        parsed.resolvedPostId.includes('pfbid') // ⭐ Force re-validate if pfbid not resolved
      );
      if (needsPostValidation) {
        try {
          // Pass adsToken for better resolution (video/pfbid)
          const postData = await validatePost(parsed.postUrl, tokens.pageId, tokens.adsToken);
          parsed.pageId = postData.pageId;
          parsed.resolvedPostId = postData.resolvedPostId;
        } catch (postError) {
          toast.error('❌ Link bài viết không hợp lệ hoặc không công khai');
          throw postError;
        }
      }


      setData(parsed);

      // ✅ Determine next stage and message
      let nextStage: QuickPostStage;
      let nextMessage: string;

      // Check what's missing and move to next stage
      // Radius rules:
      // - country: ignore radius
      // - city: radius >= 17km
      // - coordinate: radius can be any value >= 1km (extracted from user text if available)
      const isCountry = parsed.locationType === 'country';
      const isCity = parsed.locationType === 'city';
      const isCoordinate = parsed.locationType === 'coordinate' || (!!parsed.latitude && !!parsed.longitude);

      // ✅ Try to extract radius from input text for coordinates
      let extractedRadius: number | null = null;
      if (isCoordinate) {
        const kmMatch = input.match(/(\d+)\s*km/i);
        if (kmMatch) {
          extractedRadius = parseInt(kmMatch[1]);

          if (extractedRadius >= 1) {
            parsed.radiusKm = extractedRadius;
          }
        }
      }

      const needsRadius = (
        (isCity && (!parsed.radiusKm || parsed.radiusKm < 17)) ||
        (isCoordinate && !parsed.radiusKm)
      );

      if (!parsed.budget) {
        nextStage = 'awaiting_budget';
        nextMessage = MESSAGES.awaiting_budget;
      } else if (!parsed.age || !parsed.age.min || !parsed.age.max) {
        nextStage = 'awaiting_age';
        nextMessage = MESSAGES.awaiting_age;
      } else if (!parsed.gender) {
        nextStage = 'awaiting_gender';
        nextMessage = MESSAGES.awaiting_gender;
      } else if (needsRadius) {
        nextStage = 'awaiting_radius';
        nextMessage = isCoordinate
          ? '📏 Tọa độ yêu cầu bán kính tối thiểu 1km. Vui lòng nhập số km (>=1) rồi gửi để xác nhận.'
          : '📏 Bán kính cho thành phố tối thiểu 17km. Vui lòng nhập số km (>=17) rồi gửi để xác nhận.';
      } else {
        // ✅ Full data → confirming
        nextStage = 'confirming';
        nextMessage = '__SHOW_CONFIRM_CARD__';

      }

      setStage(nextStage);
      setLastMessage(nextMessage);



      return { message: nextMessage, stage: nextStage };
    } catch (error) {

      // ✅ Detailed error messages
      let errorMsg = MESSAGES.error;
      if (error instanceof Error) {
        // ✅ Check for insufficient balance - show clean message
        if (error.message.includes('Số dư') || error.message.includes('nạp tiền')) {
          errorMsg = error.message;  // Just show the simple message, no checklist
        } else if (error.message.includes('Failed to parse')) {
          errorMsg = '❌ Không thể phân tích yêu cầu.\n\n**Vui lòng kiểm tra:**\n• Edge function `parse-campaign-with-user-api` có hoạt động?\n• OpenAI API key còn hợp lệ?';
        } else if (error.message.includes('No parsed data')) {
          errorMsg = '❌ Edge function không trả về dữ liệu. Vui lòng kiểm tra logs.';
        } else if (error.message.includes('validate') || error.message.includes('Link bài viết')) {
          errorMsg = '❌ Link bài viết không hợp lệ hoặc không công khai.\n\n**Gợi ý:**\n• Đảm bảo bài viết có quyền công khai\n• Kiểm tra link có đúng định dạng không';
        } else {
          errorMsg = `❌ **Lỗi:** ${error.message}`;
        }
      }

      setLastMessage(errorMsg);
      toast.error('Không thể phân tích yêu cầu');

      // ✅ Re-throw so AIChatPanel can catch
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Handle user input based on current stage
   */
  const handleInput = useCallback(async (text: string) => {

    setIsLoading(true);



    try {
      let nextStage: QuickPostStage;
      let nextMessage: string;

      switch (stage) {
        case 'awaiting_budget': {
          const budget = parseInt(text.replace(/\D/g, ''));
          if (budget < 40000) {
            toast.error('Ngân sách tối thiểu 40,000 VND');
            return { message: MESSAGES.awaiting_budget, stage: 'awaiting_budget' as QuickPostStage };
          }
          setData(prev => ({ ...prev, budget }));
          nextStage = 'awaiting_age';
          nextMessage = MESSAGES.awaiting_age;
          break;
        }

        case 'awaiting_age': {
          const match = text.match(/(\d+)\s*-\s*(\d+)/);
          if (!match) {
            toast.error('Vui lòng nhập định dạng: 18-35');
            return { message: MESSAGES.awaiting_age, stage: 'awaiting_age' as QuickPostStage };
          }
          const [, min, max] = match;
          setData(prev => ({ ...prev, age: { min: parseInt(min), max: parseInt(max) } }));
          nextStage = 'awaiting_gender';
          nextMessage = MESSAGES.awaiting_gender;
          break;
        }

        case 'awaiting_gender': {
          const gender = text.toLowerCase().includes('nam')
            ? 'male'
            : text.toLowerCase().includes('nữ')
              ? 'female'
              : 'all';
          setData(prev => ({ ...prev, gender }));
          nextStage = 'awaiting_location';
          nextMessage = MESSAGES.awaiting_location;
          break;
        }

        case 'awaiting_location': {
          // Parse location (simplified - in real app, call search API)
          const locations = text.split(',').map(loc => ({
            name: loc.trim(),
            type: 'city',
            key: '1566083690260941', // Placeholder - should search
            radius: undefined,
            distance_unit: 'kilometer',
          }));
          setData(prev => ({ ...prev, location: locations }));
          nextStage = 'awaiting_radius';
          nextMessage = MESSAGES.awaiting_radius;
          break;
        }

        case 'awaiting_radius': {
          // ✅ Extract radius from text (handle both "7" and "7km")
          const kmMatch = text.match(/(\d+)\s*(?:km)?/i);
          if (!kmMatch) {
            toast.error('Vui lòng nhập số km hợp lệ');
            return { message: '📏 Vui lòng nhập số km (ví dụ: 7 hoặc 7km).', stage: 'awaiting_radius' as QuickPostStage };
          }

          const radius = parseInt(kmMatch[1]);
          const locType = (data.locationType as string) || '';

          if (locType === 'coordinate' || (!!data.latitude && !!data.longitude)) {
            // ✅ Coordinate: minimum 1km (can be higher)
            if (!radius || radius < 1) {
              toast.error('Bán kính tối thiểu 1km cho tọa độ');
              return { message: '📏 Tọa độ yêu cầu bán kính tối thiểu 1km. Vui lòng nhập số km (>=1).', stage: 'awaiting_radius' as QuickPostStage };
            }
          } else {
            // ✅ City: minimum 17km
            if (!radius || radius < 17) {
              toast.error('Bán kính tối thiểu 17km cho thành phố');
              return { message: '📏 Vui lòng nhập bán kính (>=17km).', stage: 'awaiting_radius' as QuickPostStage };
            }
          }

          setData(prev => ({
            ...prev,
            radiusKm: radius,
            location: prev.location?.map(loc => ({ ...loc, radius })),
          }));
          nextStage = 'confirming';
          nextMessage = '__SHOW_CONFIRM_CARD__';
          break;
        }

        case 'awaiting_interests': {
          // Parse interests (simplified)
          const interests = text.split(',').map((int, idx) => ({
            id: `interest_${idx}`,
            name: int.trim(),
          }));
          setData(prev => ({ ...prev, interests }));
          nextStage = 'confirming';
          nextMessage = MESSAGES.confirming;
          break;
        }

        default:

          return { message: '', stage: 'idle' as QuickPostStage };
      }

      setStage(nextStage);
      setLastMessage(nextMessage);



      return { message: nextMessage, stage: nextStage };
    } catch (error) {

      toast.error('Không thể xử lý input');
      return { message: '', stage: stage as QuickPostStage };
    } finally {
      setIsLoading(false);
    }
  }, [stage, data]);

  // ===== INDEPENDENT STEP METHODS =====

  /**
   * Step 1: Create Campaign (can be called independently)
   */
  const createCampaign = useCallback(async (tokens: { adsToken: string; adAccountId: string }): Promise<{ campaignId: string }> => {
    try {
      setIsLoading(true);


      const result = await createCampaignStep(
        data.name!,
        tokens.adsToken,
        tokens.adAccountId,
        'OUTCOME_ENGAGEMENT'
      );

      setCampaignId(result.campaignId);


      return { campaignId: result.campaignId };
    } catch (error) {

      toast.error('Lỗi tạo Campaign');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  /**
   * Step 2: Create AdSet (can be called independently)
   */
  const createAdSet = useCallback(async (campaignId: string, tokens: QuickPostTokens): Promise<{ adSetId: string }> => {
    try {
      setIsLoading(true);


      const targeting = buildTargetingObject(data as ParsedCampaignData);

      // ✅ Debug logs for interests


      // ✨ Pass budget options to createAdSetStep
      // ✅ Build lifetimeOptions from parsed data (not separate state)
      const isLifetime = String(data.budgetType || '').toLowerCase() === 'lifetime';

      const lifetimeOptions = isLifetime ? {
        budgetType: 'lifetime' as const,
        lifetimeBudget: data.lifetimeBudget || data.budget,
        startTime: data.startTime,
        endTime: data.endTime,
        adsetSchedule: data.scheduleSlots && data.scheduleSlots.length > 0
          ? data.scheduleSlots.map((slot: any) => ({
            days: slot.days,
            start_minute: slot.startHour * 60,
            end_minute: slot.endHour * 60,
            timezone_type: 'USER'
          }))
          : undefined
      } : undefined;

      const result = await createAdSetStep(
        campaignId,
        data.name!,
        data.budget!,
        targeting,
        tokens,
        'CONVERSATIONS',
        lifetimeOptions  // ✅ Pass lifetime options from parsed data
      );

      setAdSetId(result.adSetId);


      return { adSetId: result.adSetId };
    } catch (error) {

      toast.error('Lỗi tạo AdSet');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  /**
   * Step 3: Create Ad (can be called independently)
   */
  const createAd = useCallback(async (adSetId: string, tokens: QuickPostTokens): Promise<{ adId: string; creativeId: string }> => {
    try {
      setIsLoading(true);


      // ✅ Xác định finalResolvedPostId
      let finalResolvedPostId = data.resolvedPostId;

      // ✅ Nếu chưa có resolvedPostId → GỌI LẠI validatePost
      if (!finalResolvedPostId && data.postUrl && tokens.pageId) {

        try {
          // Pass adsToken for better resolution
          const validated = await validatePost(data.postUrl, tokens.pageId, tokens.adsToken);
          finalResolvedPostId = validated.resolvedPostId;

        } catch (validateError) {

          throw new Error('Không thể xác thực link bài viết. Vui lòng kiểm tra lại link.');
        }
      }

      // ✅ Final check
      if (!finalResolvedPostId) {
        throw new Error('Không tìm thấy Post ID hợp lệ. Vui lòng kiểm tra lại link.');
      }

      // ✅ Validate format pageId_postId
      if (!/^\d+_\d+$/.test(finalResolvedPostId)) {
        throw new Error(`Post ID không đúng format. Nhận được: ${finalResolvedPostId}`);
      }



      const result = await createAdStep(
        adSetId,
        data.name!,
        finalResolvedPostId,
        tokens
      );

      setAdId(result.adId);


      return { adId: result.adId, creativeId: result.creativeId };
    } catch (error) {


      // ✅ Handle specific error: Missing CTA button
      if (error instanceof Error && error.message.includes('nút gửi tin nhắn')) {
        toast.error(error.message, {
          duration: 6000,
          description: 'Vui lòng thêm nút "Send Message" vào bài viết Facebook trước khi tạo quảng cáo tin nhắn.'
        });
        throw error;
      }

      // ✅ Generic error
      toast.error('Lỗi tạo Ad');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  /**
   * Full flow: Create all 3 steps sequentially
   */
  const confirmAndCreate = useCallback(async (tokens: QuickPostTokens): Promise<QuickPostResult | null> => {

    setIsLoading(true);
    setStage('creating');
    setLastMessage(MESSAGES.creating);

    try {


      // Step 1: Campaign
      const campaign = await createCampaign(tokens);

      // Step 2: AdSet
      const adset = await createAdSet(campaign.campaignId, tokens);

      // Step 3: Ad
      const ad = await createAd(adset.adSetId, tokens);


      setStage('done');
      setLastMessage(MESSAGES.done);
      toast.success('✅ Tạo chiến dịch thành công!');

      return {
        campaignId: campaign.campaignId,
        adSetId: adset.adSetId,
        adId: ad.adId,
      };
    } catch (error) {
      console.error('[QuickPost] Create error:', error);
      setStage('error');
      const errorMsg = error instanceof Error ? error.message : MESSAGES.error;
      setLastMessage(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [data, createCampaign, createAdSet, createAd]);

  /**
   * Reset flow
   */
  const reset = useCallback(() => {
    setStage('idle');
    setData({});
    setLastMessage('');
    setIsLoading(false);
    setCampaignId(null);
    setAdSetId(null);
    setAdId(null);
  }, []);

  return {
    stage,
    data,
    lastMessage,
    isLoading,

    // Created IDs
    campaignId,
    adSetId,
    adId,

    // ✨ NEW: Budget options
    budgetOptions,
    setBudgetOptions,

    // Methods
    start,
    handleInput,

    // Individual step methods (can be called independently)
    createCampaign,
    createAdSet,
    createAd,

    // Full flow method
    confirmAndCreate,
    reset,
    updateData: setData,
  };
}
