import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle2, ArrowRight, Upload, AlertCircle, Info, Send, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import * as facebookService from "@/services/facebook";
import type { CampaignObjective, Interest, TargetingSpec } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { getActiveAdAccounts } from "@/services/nocodb/facebookAdAccountsService";
import { getAllPages } from "@/services/nocodb/facebookPagesService";
import { getMinBudget, formatNumberWithSeparator, parseFormattedNumber, formatCurrencyDisplay, convertBudgetForAPI } from "@/utils/currencyHelpers";
import { UPLOAD_LIMITS } from "@/utils/constants";
import LocationSearch from "./LocationSearch";
import InterestSearch from "./InterestSearch";
import AdScheduling from "./AdScheduling";
import { trackUsage } from "@/services/usageTrackingService";

type WizardStep = 1 | 2 | 3;

const CampaignForm = () => {
  const { toast } = useToast();

  // Wizard State
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);

  // IDs from each step
  const [campaignId, setCampaignId] = useState<string>("");
  const [adSetId, setAdSetId] = useState<string>("");
  const [creativeId, setCreativeId] = useState<string>("");
  const [adId, setAdId] = useState<string>("");

  // Step 1: Campaign Data
  const [campaignName, setCampaignName] = useState("Chiến dịch mới");
  const [objective, setObjective] = useState<CampaignObjective>("OUTCOME_ENGAGEMENT");

  // Step 2: Ad Set Data
  const [adSetName, setAdSetName] = useState("");
  const [budgetType, setBudgetType] = useState<"DAILY" | "LIFETIME">("DAILY");
  const [budgetAmount, setBudgetAmount] = useState("100,000");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");
  const [gender, setGender] = useState<"all" | "male" | "female">("all");
  const [locations, setLocations] = useState<any[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [adSchedule, setAdSchedule] = useState<boolean>(false);
  const [schedulingGrid, setSchedulingGrid] = useState<boolean[][]>(() =>
    Array(7).fill(null).map(() => Array(24).fill(false))
  );

  // Account currency
  const [accountCurrency, setAccountCurrency] = useState<string>("VND");
  const [minBudget, setMinBudget] = useState<number>(25000);

  // Tokens for search components
  const [adsToken, setAdsToken] = useState<string>("");
  const [adAccountId, setAdAccountId] = useState<string>("");

  // Load tokens when entering step 2
  useEffect(() => {
    if (currentStep === 2 && !adsToken) {
      getTokens().then(tokens => {
        setAdsToken(tokens.adsToken);
        setAdAccountId(tokens.adAccountId);
      }).catch(console.error);
    }
  }, [currentStep]);

  // Auto-fill ad set name from campaign name
  useEffect(() => {
    if (campaignName && currentStep === 2) {
      setAdSetName(campaignName);
    }
  }, [campaignName, currentStep]);

  // Auto-fill ad name from ad set name
  useEffect(() => {
    if (adSetName && currentStep === 3) {
      setAdName(adSetName);
    }
  }, [adSetName, currentStep]);

  // Auto-set start/end dates when switching to lifetime budget
  useEffect(() => {
    if (budgetType === 'LIFETIME') {
      const now = new Date();
      // Default start time is 30 minutes in the future to prevent race conditions
      const startTime = new Date(now.getTime() + 30 * 60 * 1000);
      const endTime = new Date(startTime);
      endTime.setMonth(endTime.getMonth() + 1);

      // Format datetime for HTML datetime-local input (requires 'yyyy-MM-ddTHH:mm' without timezone)
      const toLocalISOString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        // datetime-local input expects format: yyyy-MM-ddTHH:mm (no timezone, no seconds)
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      if (!startDate) setStartDate(toLocalISOString(startTime));
      if (!endDate) setEndDate(toLocalISOString(endTime));
    }
  }, [budgetType, startDate, endDate]);

  // Step 3: Ad Data
  const [adName, setAdName] = useState("");
  const [creativeSource, setCreativeSource] = useState<"existing" | "new">("existing");
  const [postUrl, setPostUrl] = useState("");
  const [objectStoryId, setObjectStoryId] = useState("");
  const [validationResult, setValidationResult] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageHash, setImageHash] = useState("");

  // NEW STATES cho chế độ "Tạo mới"
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoId, setVideoId] = useState("");
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState("");
  const [headline, setHeadline] = useState("");
  const [ctaType, setCtaType] = useState<string>("MESSAGE_PAGE");

  // Message Template States (giống code cũ 100%)
  const [messageTemplateEnabled, setMessageTemplateEnabled] = useState(false);
  const [creationMode, setCreationMode] = useState<'start_conversation' | 'json'>('start_conversation');
  const [greetingType, setGreetingType] = useState<'text_only' | 'text_image' | 'text_video'>('text_only');
  const [greetingMessage, setGreetingMessage] = useState("Xin chào! Chúng tôi có thể giúp gì cho bạn?");
  const [greetingMediaId, setGreetingMediaId] = useState("");
  const [greetingMediaFile, setGreetingMediaFile] = useState<File | null>(null);
  const [customJson, setCustomJson] = useState("");
  const [iceBreakerType] = useState<'custom'>('custom'); // Always custom for now
  const [iceBreakers, setIceBreakers] = useState<Array<{ question: string; payload?: string }>>([
    { question: "Xem sản phẩm", payload: "VIEW_PRODUCTS" },
    { question: "Tư vấn giá", payload: "PRICE_INQUIRY" },
    { question: "Chính sách đổi trả", payload: "RETURN_POLICY" }
  ]);

  const { user } = useAuth();

  // Get tokens from NocoDB
  const getTokens = async () => {
    if (!user?.id) throw new Error('Vui lòng đăng nhập');
    // Get active ad account
    const adAccounts = await getActiveAdAccounts(user.id);
    const adAccount = adAccounts.find(acc => acc.is_active);

    if (!adAccount) {
      throw new Error("Vui lòng cấu hình token và ad account trong Settings");
    }

    // Get active page
    const pages = await getAllPages(user.id);
    const page = pages.find(p => p.is_active);

    // Fetch currency from ad account via API (through proxy)
    try {
      const { fbProxy } = await import('@/services/facebookProxyService');
      const data = await fbProxy.request<any>({
        accessToken: adAccount.access_token,
        endpoint: adAccount.account_id,
        params: { fields: 'currency' }
      });
      const currency = data.currency || "VND";
      setAccountCurrency(currency);
      setMinBudget(getMinBudget(currency));
    } catch (error) {
      console.error("Failed to fetch currency:", error);
    }

    return {
      adsToken: adAccount.access_token,
      adAccountId: adAccount.account_id,
      pageId: page?.page_id || "",
      pageToken: page?.access_token || "",
    };
  };

  // Step 1: Create Campaign
  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên chiến dịch",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { adsToken, adAccountId } = await getTokens();

      const result = await facebookService.createCampaign(
        {
          name: campaignName,
          objective: objective,
          special_ad_categories: [],
          status: "PAUSED",
        },
        adsToken,
        adAccountId
      );

      setCampaignId(result.id);

      // Track usage
      await trackUsage('campaign_created', 'campaign', result.id);

      toast({
        title: "Thành công",
        description: `Đã tạo chiến dịch! ID: ${result.id}`,
      });
      setCurrentStep(2);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo chiến dịch",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create Ad Set
  const handleCreateAdSet = async () => {
    if (!adSetName.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên nhóm quảng cáo",
        variant: "destructive",
      });
      return;
    }

    const budgetAmountNum = parseFormattedNumber(budgetAmount);
    if (!budgetAmountNum || budgetAmountNum < minBudget) {
      toast({
        title: "Lỗi",
        description: `Ngân sách tối thiểu ${formatCurrencyDisplay(minBudget, accountCurrency)}`,
        variant: "destructive",
      });
      return;
    }

    if (locations.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một vị trí",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Validate start date for lifetime budget
      if (budgetType === "LIFETIME") {
        if (!startDate || !endDate) {
          toast({
            title: "Lỗi",
            description: "Vui lòng chọn ngày bắt đầu và kết thúc cho ngân sách trọn đời",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000);

        if (startDateObj < thirtyMinutesFromNow) {
          toast({
            title: "Lỗi",
            description: `Giờ bắt đầu (${startDateObj.toLocaleString('vi-VN')}) quá gần. Vui lòng chọn một thời điểm trong tương lai (khuyến nghị cách 30 phút) để đảm bảo chiến dịch được tạo.`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (endDateObj <= startDateObj) {
          toast({
            title: "Lỗi",
            description: "Ngày kết thúc phải sau ngày bắt đầu",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      const { adsToken, adAccountId, pageId } = await getTokens();

      // Build targeting with locations
      const targeting: TargetingSpec = {
        geo_locations: {} as any,
        age_min: parseInt(ageMin),
        age_max: parseInt(ageMax),
      };

      // Process locations
      const countries: string[] = [];
      const regions: any[] = [];
      const cities: any[] = [];
      const customLocations: any[] = [];

      locations.forEach(loc => {
        if (loc.type === 'country') {
          countries.push(loc.country_code);
        } else if (loc.type === 'region') {
          regions.push({ key: loc.key });
        } else if (loc.type === 'city') {
          if (loc.radius) {
            cities.push({
              key: loc.key,
              radius: loc.radius,
              distance_unit: loc.distance_unit || 'kilometer',
            });
          } else {
            cities.push({ key: loc.key });
          }
        } else if (loc.type === 'coordinates') {
          customLocations.push({
            latitude: loc.latitude,
            longitude: loc.longitude,
            radius: loc.radius,
            distance_unit: loc.distance_unit || 'kilometer',
          });
        }
      });

      if (countries.length > 0) targeting.geo_locations.countries = countries;
      if (regions.length > 0) targeting.geo_locations.regions = regions;
      if (cities.length > 0) targeting.geo_locations.cities = cities;
      if (customLocations.length > 0) targeting.geo_locations.custom_locations = customLocations;

      if (gender !== "all") {
        targeting.genders = [gender === "male" ? 1 : 2];
      }

      if (interests.length > 0) {
        targeting.flexible_spec = [{
          interests: interests.map(i => ({ id: i.id, name: i.name })),
        }];
      }

      // Helper function to convert datetime-local format to ISO format for Facebook API
      const toAPIDateFormat = (dateTimeLocalValue: string) => {
        const date = new Date(dateTimeLocalValue);
        return date.toISOString();
      };

      // Build params
      const params: any = {
        name: adSetName,
        campaign_id: campaignId,
        start_time: startDate ? toAPIDateFormat(startDate) : new Date().toISOString(),
        targeting: targeting,
        billing_event: "IMPRESSIONS",
        optimization_goal: "CONVERSATIONS",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        status: "PAUSED",
        destination_type: "MESSENGER",
      };

      if (pageId) {
        params.promoted_object = { page_id: pageId };
      }

      if (budgetType === "DAILY") {
        params.daily_budget = convertBudgetForAPI(budgetAmountNum, accountCurrency);
      } else {
        params.lifetime_budget = convertBudgetForAPI(budgetAmountNum, accountCurrency);
        if (endDate) {
          params.end_time = toAPIDateFormat(endDate);
        }
      }

      // Add ad scheduling if enabled (only works with lifetime budget)
      if (adSchedule && budgetType === "LIFETIME") {
        params.pacing_type = ['day_parting'];

        // OPTIMIZED: Group days with same time slots together
        const timeSlotToDays: Map<string, number[]> = new Map();

        for (let day = 0; day < 7; day++) {
          let startHour = -1;
          for (let hour = 0; hour <= 24; hour++) {
            const isActive = hour < 24 && schedulingGrid[day][hour];
            if (isActive && startHour === -1) {
              startHour = hour;
            } else if (!isActive && startHour !== -1) {
              const startMinute = startHour * 60;
              const endMinute = hour * 60;
              if (endMinute - startMinute >= 60) {
                const key = `${startMinute}:${endMinute}`;
                if (timeSlotToDays.has(key)) {
                  timeSlotToDays.get(key)!.push(day);
                } else {
                  timeSlotToDays.set(key, [day]);
                }
              }
              startHour = -1;
            }
          }
        }

        const adset_schedule: any[] = [];
        timeSlotToDays.forEach((days, timeSlot) => {
          const [startMinute, endMinute] = timeSlot.split(':').map(Number);
          adset_schedule.push({
            days: days.sort(),
            start_minute: startMinute,
            end_minute: endMinute,
          });
        });

        if (adset_schedule.length > 0) {
          params.adset_schedule = adset_schedule;
          console.log('📅 Ad Schedule (optimized):', JSON.stringify(adset_schedule, null, 2));
        } else {
          delete params.pacing_type;
        }
      }

      const result = await facebookService.createAdSet(
        params,
        adsToken,
        adAccountId
      );

      setAdSetId(result.id);
      toast({
        title: "Thành công",
        description: `Đã tạo nhóm quảng cáo! ID: ${result.id}`,
      });
      setCurrentStep(3);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo nhóm quảng cáo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Validate post URL using fetch-facebook-id edge function
  const handleValidatePost = async () => {
    if (!postUrl.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập link bài viết Facebook",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setValidationResult(null);
    setObjectStoryId("");

    try {
      // 1. Lấy pageToken từ settings (optional, used for private posts)
      const { pageToken } = await getTokens();

      // 2. Gọi API validate-facebook-post để lấy Post ID
      const { data, error } = await supabase.functions.invoke('validate-facebook-post', {
        body: { postUrl, pageToken }
      });

      if (error) throw error;
      if (!data.success) {
        throw new Error(data.error || 'Không thể lấy ID từ link');
      }

      // 3. Lấy fullPostId từ validator
      const postId = data.fullPostId || data.postId;

      if (!postId) {
        throw new Error('API không trả về Post ID hợp lệ');
      }



      // 3. Lấy Page ID từ NocoDB
      if (!user?.id) throw new Error('Vui lòng đăng nhập');
      const pages = await getAllPages(user.id);
      const activePage = pages.find(p => p.is_active);

      if (!activePage) {
        throw new Error('Không tìm thấy Page ID trong hệ thống. Vui lòng kết nối Facebook Page trước.');
      }

      const pageId = activePage.page_id;


      // 4. Ghép thành objectStoryId
      const finalObjectStoryId = `${pageId}_${postId}`;


      setObjectStoryId(finalObjectStoryId);
      setValidationResult({
        name: data.data?.name || '',
        type: data.data?.type || '',
        is_public: data.is_public,
        is_die: data.is_die,
        rawId: postId,
        pageId: pageId
      });

      // 5. Thông báo kết quả
      if (data.is_die) {
        toast({
          title: "⚠️ Cảnh báo",
          description: "Link này có thể đã bị xóa hoặc không khả dụng",
          variant: "destructive",
        });
      } else if (!data.is_public) {
        toast({
          title: "⚠️ Lưu ý",
          description: "Bài viết không công khai, có thể ảnh hưởng đến quảng cáo",
        });
      } else {
        toast({
          title: "✅ Thành công",
          description: `Post ID: ${postId}`,
        });
      }
    } catch (error: any) {
      console.error("❌ Lỗi validate post:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xác thực bài viết",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Upload media (image or video) for new creative
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file before upload
    if (mediaType === 'image') {
      // Validate image using constants
      if (file.size > UPLOAD_LIMITS.IMAGE_MAX_SIZE) {
        toast({
          title: "❌ File quá lớn",
          description: `Ảnh không được vượt quá ${UPLOAD_LIMITS.IMAGE_MAX_SIZE / 1024 / 1024}MB`,
          variant: "destructive",
        });
        return;
      }

      if (!(UPLOAD_LIMITS.IMAGE_FORMATS as readonly string[]).includes(file.type)) {
        toast({
          title: "❌ Định dạng không hợp lệ",
          description: "Chỉ chấp nhận file JPG, JPEG, PNG",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Validate video using constants
      if (file.size > UPLOAD_LIMITS.VIDEO_MAX_SIZE) {
        toast({
          title: "❌ File quá lớn",
          description: `Video không được vượt quá ${UPLOAD_LIMITS.VIDEO_MAX_SIZE / 1024 / 1024}MB`,
          variant: "destructive",
        });
        return;
      }

      if (!(UPLOAD_LIMITS.VIDEO_FORMATS as readonly string[]).includes(file.type)) {
        toast({
          title: "❌ Định dạng không hợp lệ",
          description: "Chỉ chấp nhận file MP4, MOV, AVI",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const { adsToken, adAccountId } = await getTokens();

      if (mediaType === 'image') {
        setImageFile(file);
        const result = await facebookService.uploadImage(file, adsToken, adAccountId);
        setImageHash(result.hash);
        toast({
          title: "✅ Thành công",
          description: "Đã tải ảnh lên Facebook!",
        });
      } else {
        // Upload video with retry logic
        setVideoFile(file);
        toast({
          title: "⏳ Đang tải video...",
          description: `Đang upload ${(file.size / 1024 / 1024).toFixed(2)} MB. Vui lòng đợi...`,
        });

        const result = await facebookService.uploadVideo(file, adsToken, adAccountId);
        setVideoId(result.id);

        toast({
          title: "✅ Video đã tải lên",
          description: "Đang tự động lấy thumbnail...",
        });

        // Lấy thumbnail tự động với retry (Facebook cần thời gian generate)
        try {
          const thumbnailUrl = await facebookService.getVideoThumbnail(result.id, adsToken, 5);
          setVideoThumbnailUrl(thumbnailUrl);

          if (thumbnailUrl) {
            toast({
              title: "✅ Hoàn tất",
              description: "Đã tải video và lấy thumbnail thành công!",
            });
          } else {
            toast({
              title: "⚠️ Chú ý",
              description: "Video đã tải lên nhưng chưa có thumbnail. Facebook sẽ tự động dùng frame đầu tiên.",
            });
          }
        } catch (thumbError) {
          console.error('Thumbnail fetch error:', thumbError);
          // Không báo lỗi vì video vẫn có thể dùng được (Facebook dùng frame đầu)
          toast({
            title: "⚠️ Chú ý",
            description: "Video đã tải lên nhưng không lấy được thumbnail. Facebook sẽ tự động dùng frame đầu tiên.",
          });
        }
      }
    } catch (error: any) {
      console.error('Media upload error:', error);
      toast({
        title: "❌ Lỗi",
        description: error.message || "Không thể tải media lên",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Upload media cho greeting message (ảnh/video chào)
  const handleGreetingMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (greetingType === 'text_image') {
      if (file.size > UPLOAD_LIMITS.IMAGE_MAX_SIZE) {
        toast({
          title: "❌ File quá lớn",
          description: `Ảnh không được vượt quá ${UPLOAD_LIMITS.IMAGE_MAX_SIZE / 1024 / 1024}MB`,
          variant: "destructive",
        });
        return;
      }
      if (!(UPLOAD_LIMITS.IMAGE_FORMATS as readonly string[]).includes(file.type)) {
        toast({
          title: "❌ Định dạng không hợp lệ",
          description: "Chỉ chấp nhận file JPG, JPEG, PNG",
          variant: "destructive",
        });
        return;
      }
    } else if (greetingType === 'text_video') {
      if (file.size > UPLOAD_LIMITS.VIDEO_MAX_SIZE) {
        toast({
          title: "❌ File quá lớn",
          description: `Video không được vượt quá ${UPLOAD_LIMITS.VIDEO_MAX_SIZE / 1024 / 1024}MB`,
          variant: "destructive",
        });
        return;
      }
      if (!(UPLOAD_LIMITS.VIDEO_FORMATS as readonly string[]).includes(file.type)) {
        toast({
          title: "❌ Định dạng không hợp lệ",
          description: "Chỉ chấp nhận file MP4, MOV, AVI",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const { adsToken, adAccountId } = await getTokens();

      if (greetingType === 'text_image') {
        const result = await facebookService.uploadImage(file, adsToken, adAccountId);
        setGreetingMediaId(result.hash);
        setGreetingMediaFile(file);
        toast({
          title: "✅ Thành công",
          description: "Đã tải ảnh chào lên Facebook!",
        });
      } else {
        setGreetingMediaFile(file);
        toast({
          title: "⏳ Đang tải video chào...",
          description: `Đang upload ${(file.size / 1024 / 1024).toFixed(2)} MB. Vui lòng đợi...`,
        });

        const result = await facebookService.uploadVideo(file, adsToken, adAccountId);
        setGreetingMediaId(result.id);

        toast({
          title: "✅ Thành công",
          description: "Đã tải video chào lên Facebook! (Thumbnail sẽ tự động được Facebook generate)",
        });
      }
    } catch (error: any) {
      console.error('Greeting media upload error:', error);
      toast({
        title: "❌ Lỗi",
        description: error.message || "Không thể tải media chào lên",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate message template payload giống 100% code cũ
  const getMessageTemplatePayload = (): any | null => {
    // Nếu CTA không phải là tin nhắn thì không cần payload
    if (ctaType !== 'MESSAGE_PAGE' || !messageTemplateEnabled) {
      return null;
    }

    // --- Trường hợp 1: Dùng JSON tùy chỉnh ---
    if (creationMode === 'json') {
      if (!customJson.trim()) return null;
      try {
        const parsedJson = JSON.parse(customJson);
        return { page_welcome_message: parsedJson };
      } catch (e) {
        throw new Error("JSON ở Thiết lập nâng cao không hợp lệ. Vui lòng kiểm tra lại cú pháp.");
      }
    }

    // --- Trường hợp 2: Dùng trình tạo giao diện ---
    if (creationMode === 'start_conversation') {
      const isMediaGreeting = (greetingType === 'text_image' || greetingType === 'text_video');
      const hasMedia = isMediaGreeting && greetingMediaId;
      const hasText = greetingMessage.trim() !== '';
      const hasIceBreakers = iceBreakerType === 'custom' && iceBreakers.some(ib => ib.question.trim());

      // Nếu không có nội dung gì thì không tạo payload
      if (!hasMedia && !hasText && !hasIceBreakers) return null;

      // --- 2a. Nếu có Media (Ảnh/Video) ---
      if (hasMedia) {
        const mediaType = greetingType === 'text_image' ? 'image' : 'video';

        const payload = {
          greeting_text: greetingMessage.trim(),
          media: {
            type: mediaType,
            attachment_id: greetingMediaId,
          },
          ctas: hasIceBreakers
            ? iceBreakers
              .filter(ib => ib.question.trim())
              .map(ib => ({
                type: 'QUICK_REPLY',
                title: ib.question.trim().slice(0, 20),
                payload: ib.payload?.trim() || ib.question.trim()
              }))
            : []
        };
        return { page_welcome_message: payload };
      } else {
        // --- 2b. Nếu chỉ có Text (VISUAL_EDITOR) ---
        const payload = buildStartConversationPayload();
        return payload ? { page_welcome_message: payload } : null;
      }
    }

    return null;
  };

  // Build VISUAL_EDITOR payload giống 100% code cũ (9 fields đầy đủ)
  const buildStartConversationPayload = (): any | null => {
    if (greetingType !== 'text_only' || (!greetingMessage.trim() && (iceBreakerType !== 'custom' || !iceBreakers.some(ib => ib.question.trim())))) {
      return null;
    }

    return {
      type: "VISUAL_EDITOR",
      version: 2, // ⚠️ NUMBER, không phải string
      landing_screen_type: "welcome_message",
      media_type: 'text',
      text_format: {
        customer_action_type: "ice_breakers",
        message: {
          ice_breakers: (iceBreakerType === 'custom')
            ? iceBreakers
              .filter(ib => ib.question.trim())
              .map(ib => ({
                title: ib.question.trim().slice(0, 20),
                response: ib.payload?.trim() || ib.question.trim()
              }))
            : [],
          quick_replies: [], // ⚠️ Thêm field này
          text: greetingMessage.trim()
        }
      },
      user_edit: false,
      surface: "visual_editor_new"
    };
  };

  // Step 3: Create Ad (Bước A + Bước B)
  const handleCreateDraftCreative = async () => {
    // Validation
    if (creativeSource === "existing" && !objectStoryId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng xác thực bài viết trước",
        variant: "destructive",
      });
      return;
    }

    if (creativeSource === "new") {
      if (mediaType === 'image' && !imageHash) {
        toast({
          title: "Lỗi",
          description: "Vui lòng tải ảnh lên",
          variant: "destructive",
        });
        return;
      }
      if (mediaType === 'video' && !videoId) {
        toast({
          title: "Lỗi",
          description: "Vui lòng tải video lên",
          variant: "destructive",
        });
        return;
      }
      if (!message.trim()) {
        toast({
          title: "Lỗi",
          description: "Vui lòng nhập nội dung quảng cáo",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const { adsToken, adAccountId, pageId } = await getTokens();


      let creativeResult;

      if (creativeSource === "existing") {
        creativeResult = await facebookService.createAdCreative({
          name: `Creative - ${adName}`,
          object_story_id: objectStoryId,
        }, adsToken, adAccountId);
      } else {
        // Build message template payload giống code cũ 100%
        let messageTemplateData: any = null;
        try {
          messageTemplateData = getMessageTemplatePayload();
        } catch (error: any) {
          toast({
            title: "❌ Lỗi",
            description: error.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Validate message template if enabled
        if (messageTemplateEnabled && creationMode === 'start_conversation' && greetingType === 'text_only') {
          const validIceBreakers = iceBreakers.filter(
            ib => ib.question && ib.question.trim() !== ''
          );

          // Validate ice breakers length (max 20 chars each)
          for (const ib of validIceBreakers) {
            if (ib.question.length > 20) {
              toast({
                title: "❌ Lỗi",
                description: `Câu hỏi "${ib.question}" vượt quá 20 ký tự. Vui lòng rút ngắn.`,
                variant: "destructive",
              });
              setLoading(false);
              return;
            }
          }

          // Must have at least 1 valid ice breaker
          if (validIceBreakers.length === 0) {
            toast({
              title: "❌ Lỗi",
              description: "Vui lòng thêm ít nhất 1 câu hỏi gợi ý hợp lệ.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          // Must have greeting text
          if (!greetingMessage.trim()) {
            toast({
              title: "❌ Lỗi",
              description: "Vui lòng nhập lời chào.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }

        if (mediaType === 'image') {
          creativeResult = await facebookService.createAdCreativeWithImageSpec({
            name: `Creative - ${adName}`,
            pageId: pageId,
            message: message,
            headline: headline,
            imageHash: imageHash,
            ctaType: ctaType,
            messageTemplateData: messageTemplateData,
          }, adsToken, adAccountId);
        } else {
          creativeResult = await facebookService.createAdCreativeWithVideoSpec({
            name: `Creative - ${adName}`,
            pageId: pageId,
            message: message,
            videoTitle: headline,
            videoId: videoId,
            thumbnailUrl: videoThumbnailUrl,
            ctaType: ctaType,
            messageTemplateData: messageTemplateData,
          }, adsToken, adAccountId);
        }
      }


      setCreativeId(creativeResult.id);
      toast({
        title: "✅ Đã tạo Creative",
        description: `Creative ID: ${creativeResult.id}`,
      });
    } catch (error: any) {
      console.error("❌ Lỗi tạo Creative:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo creative",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePublishAd = async () => {
    if (!creativeId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng tạo Creative trước",
        variant: "destructive",
      });
      return;
    }

    if (!adName.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên quảng cáo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { adsToken, adAccountId } = await getTokens();


      const adResult = await facebookService.createAd({
        name: adName,
        adset_id: adSetId,
        creative: {
          creative_id: creativeId,
        },
        status: "PAUSED",
      }, adsToken, adAccountId);


      setAdId(adResult.id);
      toast({
        title: "🎉 Hoàn thành!",
        description: `Campaign: ${campaignId} | AdSet: ${adSetId} | Ad: ${adResult.id}`,
      });
    } catch (error: any) {
      console.error("❌ Lỗi đăng Ad:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo quảng cáo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Render Step 1: Campaign
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="campaignName">Tên chiến dịch</Label>
        <Input
          id="campaignName"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="VD: Khuyến mãi tháng 7"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="objective">Mục tiêu</Label>
        <div className="p-3 border rounded-md bg-muted/20">
          <span className="font-medium">Lượt tương tác</span>
          <p className="text-sm text-muted-foreground mt-1">
            Mục tiêu tối ưu hóa để tăng tin nhắn và tương tác với khách hàng
          </p>
        </div>
      </div>

      <Button onClick={handleCreateCampaign} disabled={loading} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Tạo Campaign & Tiếp tục
      </Button>
    </div>
  );

  // Render Step 2: Ad Set
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="w-4 h-4 text-green-600" />
        Campaign ID: {campaignId}
      </div>

      <div className="space-y-2">
        <Label>Tên nhóm quảng cáo</Label>
        <Input
          value={adSetName}
          onChange={(e) => setAdSetName(e.target.value)}
          placeholder="VD: Nhóm quảng cáo A, Quảng cáo Hà Nội..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Loại ngân sách</Label>
          <Select value={budgetType} onValueChange={(v) => setBudgetType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Hàng ngày</SelectItem>
              <SelectItem value="LIFETIME">Trọn đời</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Số tiền ({accountCurrency})</Label>
          <Input
            value={budgetAmount}
            onChange={(e) => {
              const formatted = formatNumberWithSeparator(e.target.value);
              setBudgetAmount(formatted);
            }}
            placeholder={formatNumberWithSeparator(minBudget)}
          />
          <p className="text-xs text-muted-foreground">
            Tối thiểu: {formatCurrencyDisplay(minBudget, accountCurrency)}
          </p>
        </div>
      </div>

      {budgetType === "LIFETIME" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ngày bắt đầu</Label>
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Ngày kết thúc</Label>
            <Input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {budgetType === "LIFETIME" && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
          <Label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={adSchedule}
              onChange={(e) => {
                setAdSchedule(e.target.checked);
                if (!e.target.checked) {
                  setSchedulingGrid(Array(7).fill(null).map(() => Array(24).fill(true)));
                }
              }}
              className="rounded"
            />
            Lên lịch phân phối nhóm quảng cáo
          </Label>
          {adSchedule && (
            <AdScheduling
              schedulingGrid={schedulingGrid}
              onGridChange={setSchedulingGrid}
            />
          )}
        </div>
      )}

      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="font-semibold text-sm">Đối tượng mục tiêu</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tuổi tối thiểu</Label>
            <Input value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tuổi tối đa</Label>
            <Input value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Giới tính</Label>
          <Select value={gender} onValueChange={(v) => setGender(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="male">Nam</SelectItem>
              <SelectItem value="female">Nữ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {adsToken && (
          <>
            <LocationSearch
              accessToken={adsToken}
              adAccountId={adAccountId}
              selectedLocations={locations}
              onLocationChange={setLocations}
            />

            <InterestSearch
              accessToken={adsToken}
              selectedInterests={interests}
              onInterestChange={setInterests}
            />
          </>
        )}
      </div>

      <Button onClick={handleCreateAdSet} disabled={loading} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Tạo Ad Set & Tiếp tục
      </Button>
    </div>
  );

  // Render Step 3: Ad
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          Campaign ID: {campaignId}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          Ad Set ID: {adSetId}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tên quảng cáo</Label>
        <Input
          value={adName}
          onChange={(e) => setAdName(e.target.value)}
          placeholder="VD: Quảng cáo 1, Quảng cáo khuyến mãi..."
        />
      </div>

      <div className="space-y-2">
        <Label>Nguồn nội dung</Label>
        <Select value={creativeSource} onValueChange={(v) => setCreativeSource(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="existing">Bài viết có sẵn</SelectItem>
            <SelectItem value="new">Tạo mới</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {creativeSource === "existing" ? (
        <div className="space-y-4">
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Label htmlFor="postUrl">Link bài viết Facebook</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="text-xs space-y-1">
                      <p className="font-semibold mb-1">Hỗ trợ 11 loại link Facebook:</p>
                      <p>✅ Post chuẩn: /posts/123456</p>
                      <p>✅ PFBID: /posts/pfbid...</p>
                      <p>✅ PCB: /permalink.php?pcb=...</p>
                      <p>✅ Video: /videos/123456</p>
                      <p>✅ Reel: /reel/123456</p>
                      <p>✅ Watch: /watch/?v=123456</p>
                      <p>✅ Share (v): /share/v/...</p>
                      <p>✅ Share (p): /share/p/...</p>
                      <p>✅ Story: /stories/123456</p>
                      <p>✅ Permalink: /permalink.php?story_fbid=...</p>
                      <p>✅ PFBID URL dài</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex gap-2">
              <Input
                id="postUrl"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://facebook.com/... (Paste bất kỳ link Facebook nào)"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleValidatePost();
                  }
                }}
              />
              <Button
                onClick={handleValidatePost}
                disabled={loading || !postUrl.trim()}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Đang xử lý...
                  </>
                ) : (
                  "Kiểm tra"
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              💡 Hỗ trợ: Post, Video, Reel, Share link, Story, PFBID, PCB và nhiều loại link khác
            </p>
          </div>

          {/* Results Section */}
          {validationResult && objectStoryId && (
            <div className={`border rounded-lg ${validationResult.is_die
              ? "border-orange-300 bg-orange-50 dark:bg-orange-950/30"
              : validationResult.is_public
                ? "border-green-300 bg-green-50 dark:bg-green-950/30"
                : "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30"
              }`}>
              <div className="p-4 pb-3">
                <div className="text-lg flex items-center gap-2 font-semibold mb-4">
                  {validationResult.is_die ? (
                    <>
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <span className="text-orange-900 dark:text-orange-100">
                        Cảnh báo: Post có vấn đề
                      </span>
                    </>
                  ) : validationResult.is_public ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-green-900 dark:text-green-100">
                        Thành công! Post hợp lệ
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <span className="text-yellow-900 dark:text-yellow-100">
                        Post không công khai
                      </span>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Object Story ID */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Object Story ID (dùng cho quảng cáo)</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 font-mono text-sm bg-white dark:bg-gray-900 p-3 rounded border break-all">
                        {objectStoryId}
                      </div>
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(objectStoryId);
                          toast({
                            title: "Đã sao chép",
                            description: "Object Story ID đã được sao chép vào clipboard",
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Sao chép
                      </Button>
                    </div>
                  </div>

                  {/* Post Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {validationResult.type && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Loại nội dung</Label>
                        <div className="font-medium mt-1">📄 {validationResult.type}</div>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                      <div className="font-medium mt-1">
                        {validationResult.is_public ? "🌐 Công khai ✓" : "🔒 Riêng tư ✗"}
                      </div>
                    </div>

                    {validationResult.rawId && (
                      <div>
                        <Label className="text-xs text-muted-foreground">ID gốc</Label>
                        <div className="font-mono text-xs mt-1 truncate">{validationResult.rawId}</div>
                      </div>
                    )}

                    {validationResult.pageId && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Page ID</Label>
                        <div className="font-mono text-xs mt-1 truncate">{validationResult.pageId}</div>
                      </div>
                    )}
                  </div>

                  {validationResult.name && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Tên / Mô tả</Label>
                      <div className="mt-1 p-3 bg-white dark:bg-gray-900 rounded border text-sm">
                        {validationResult.name}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {validationResult.is_die && (
                    <div className="flex items-start gap-2 p-3 bg-orange-100 dark:bg-orange-900/50 rounded border border-orange-300 dark:border-orange-800 text-sm">
                      <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-orange-900 dark:text-orange-100">
                          Link có thể đã bị xóa hoặc không khả dụng
                        </div>
                        <div className="text-orange-800 dark:text-orange-200 mt-1">
                          Bài viết này có thể không còn tồn tại trên Facebook. Vui lòng kiểm tra lại link hoặc chọn bài viết khác.
                        </div>
                      </div>
                    </div>
                  )}

                  {!validationResult.is_public && !validationResult.is_die && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded border border-yellow-300 dark:border-yellow-800 text-sm">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-yellow-900 dark:text-yellow-100">
                          Bài viết không công khai
                        </div>
                        <div className="text-yellow-800 dark:text-yellow-200 mt-1">
                          Bài viết riêng tư có thể ảnh hưởng đến hiệu suất quảng cáo. Khuyến nghị sử dụng bài viết công khai.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
          <h3 className="font-semibold text-sm">Tạo nội dung quảng cáo mới</h3>

          {/* Chọn loại media */}
          <div className="space-y-2">
            <Label>Loại media</Label>
            <Select value={mediaType} onValueChange={(v) => setMediaType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">📷 Ảnh</SelectItem>
                <SelectItem value="video">🎥 Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload media */}
          <div className="space-y-2">
            <Label>Tải {mediaType === 'image' ? 'ảnh' : 'video'} lên</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                onChange={handleMediaUpload}
                disabled={loading}
              />
              {(imageHash || videoId) && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            </div>
            {imageFile && (
              <p className="text-xs text-muted-foreground">
                ✅ Đã tải: {imageFile.name}
              </p>
            )}
            {videoFile && (
              <p className="text-xs text-muted-foreground">
                ✅ Đã tải: {videoFile.name}
              </p>
            )}
          </div>

          {/* Nội dung chính */}
          <div className="space-y-2">
            <Label>Nội dung chính (Primary Text)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="VD: Khuyến mãi đặc biệt - Giảm giá 50%..."
              rows={3}
            />
          </div>

          {/* Tiêu đề */}
          <div className="space-y-2">
            <Label>Tiêu đề (Headline)</Label>
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="VD: Mua ngay hôm nay!"
            />
          </div>

          {/* CTA */}
          <div className="space-y-2">
            <Label>Kêu gọi hành động (CTA)</Label>
            <Select value={ctaType} onValueChange={setCtaType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MESSAGE_PAGE">💬 Gửi tin nhắn</SelectItem>
                <SelectItem value="LEARN_MORE">📖 Tìm hiểu thêm</SelectItem>
                <SelectItem value="SHOP_NOW">🛒 Mua ngay</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message Template (chỉ hiện khi CTA = MESSAGE_PAGE) - GIỐNG CODE CŨ 100% */}
          {ctaType === 'MESSAGE_PAGE' && (
            <div className="space-y-3 p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={messageTemplateEnabled}
                  onChange={(e) => setMessageTemplateEnabled(e.target.checked)}
                  className="rounded"
                />
                <Label>Kích hoạt mẫu tin nhắn chào</Label>
              </div>

              {messageTemplateEnabled && (
                <>
                  {/* Tab: Tạo mới / JSON tùy chỉnh */}
                  <div className="flex gap-2 border-b">
                    <button
                      type="button"
                      className={`px-3 py-2 text-sm ${creationMode === 'start_conversation' ? 'border-b-2 border-blue-600 font-semibold' : 'text-muted-foreground'}`}
                      onClick={() => setCreationMode('start_conversation')}
                    >
                      🎨 Giao diện
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-2 text-sm ${creationMode === 'json' ? 'border-b-2 border-blue-600 font-semibold' : 'text-muted-foreground'}`}
                      onClick={() => setCreationMode('json')}
                    >
                      📝 JSON tùy chỉnh
                    </button>
                  </div>

                  {creationMode === 'start_conversation' ? (
                    <>
                      {/* Loại lời chào (text_only, text_image, text_video) */}
                      <div className="space-y-2">
                        <Label className="text-xs">Loại lời chào</Label>
                        <Select value={greetingType} onValueChange={(v) => setGreetingType(v as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text_only">💬 Chỉ văn bản</SelectItem>
                            <SelectItem value="text_image">🖼️ Văn bản + Ảnh</SelectItem>
                            <SelectItem value="text_video">🎥 Văn bản + Video</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Upload media cho greeting (nếu chọn image/video) */}
                      {(greetingType === 'text_image' || greetingType === 'text_video') && (
                        <div className="space-y-2">
                          <Label className="text-xs">
                            Tải {greetingType === 'text_image' ? 'ảnh' : 'video'} chào lên
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept={greetingType === 'text_image' ? 'image/*' : 'video/*'}
                              onChange={handleGreetingMediaUpload}
                              disabled={loading}
                              className="text-xs"
                            />
                            {greetingMediaId && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                          </div>
                          {greetingMediaFile && (
                            <p className="text-xs text-muted-foreground">
                              ✅ Đã tải: {greetingMediaFile.name}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Lời chào */}
                      <div className="space-y-2">
                        <Label className="text-xs">Lời chào</Label>
                        <Textarea
                          value={greetingMessage}
                          onChange={(e) => setGreetingMessage(e.target.value)}
                          placeholder="Xin chào {{full_name}}! Chúng tôi có thể giúp gì cho bạn?"
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground">
                          Dùng {`{{full_name}}`} để chèn tên người dùng
                        </p>
                      </div>

                      {/* Ice Breakers - chỉ hiển thị input câu hỏi */}
                      <div className="space-y-2">
                        <Label className="text-xs">Câu hỏi gợi ý (Ice Breakers)</Label>
                        {iceBreakers.map((ib, idx) => (
                          <div key={idx} className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Câu hỏi {idx + 1}</Label>
                            <Input
                              value={ib.question}
                              onChange={(e) => {
                                const updated = [...iceBreakers];
                                updated[idx].question = e.target.value;
                                // Tự động set payload = question (ẩn không hiển thị)
                                updated[idx].payload = e.target.value;
                                setIceBreakers(updated);
                              }}
                              placeholder={`VD: Xem sản phẩm`}
                              maxLength={20}
                            />
                            <p className="text-xs text-muted-foreground">
                              {ib.question.length}/20 ký tự
                            </p>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIceBreakers([...iceBreakers, { question: '', payload: '' }])}
                          className="w-full text-xs"
                        >
                          + Thêm câu hỏi
                        </Button>
                      </div>
                    </>
                  ) : (
                    /* Custom JSON Mode */
                    <div className="space-y-2">
                      <Label className="text-xs">JSON tùy chỉnh</Label>
                      <Textarea
                        value={customJson}
                        onChange={(e) => setCustomJson(e.target.value)}
                        placeholder={`{\n  "type": "VISUAL_EDITOR",\n  "version": 2,\n  ...\n}`}
                        rows={8}
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        Nhập payload JSON đầy đủ theo chuẩn Facebook API
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
        <h4 className="font-semibold text-sm">Quy trình đăng quảng cáo</h4>

        {/* Bước 1: Tạo Creative */}
        <div className="space-y-2">
          <Button
            onClick={handleCreateDraftCreative}
            disabled={loading || creativeId !== ""}
            className="w-full"
            variant="outline"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            {creativeId ? "✅ Đã tạo Creative" : "1. Tạo Creative (Bản nháp)"}
          </Button>

          {creativeId && (
            <div className="p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded text-xs">
              <strong className="text-green-900 dark:text-green-100">Creative ID:</strong>{" "}
              <code className="font-mono">{creativeId}</code>
            </div>
          )}
        </div>

        {/* Bước 2: Đăng Ad */}
        <div className="space-y-2">
          <Button
            onClick={handlePublishAd}
            disabled={loading || !creativeId || adId !== ""}
            className="w-full"
            variant={adId ? "outline" : "default"}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : adId ? (
              <Send className="w-4 h-4 mr-2 opacity-50" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {adId ? "✅ Đã đăng Quảng Cáo" : "2. Đăng Quảng Cáo"}
          </Button>
        </div>
      </div>

      {adId && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">🎉 Hoàn thành!</h3>
          <div className="text-sm text-green-800 space-y-1">
            <div>Campaign ID: {campaignId}</div>
            <div>Ad Set ID: {adSetId}</div>
            <div>Ad ID: {adId}</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep >= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
                  }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${currentStep > step ? "bg-primary" : "bg-muted"
                    }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className={currentStep >= 1 ? "text-foreground font-medium" : "text-muted-foreground"}>
            Campaign
          </span>
          <span className={currentStep >= 2 ? "text-foreground font-medium" : "text-muted-foreground"}>
            Ad Set
          </span>
          <span className={currentStep >= 3 ? "text-foreground font-medium" : "text-muted-foreground"}>
            Ad
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="bg-card rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold mb-6">
          Bước {currentStep}: {currentStep === 1 ? "Tạo Chiến dịch" : currentStep === 2 ? "Tạo Nhóm quảng cáo" : "Tạo Quảng cáo"}
        </h2>

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  );
};

export default CampaignForm;
