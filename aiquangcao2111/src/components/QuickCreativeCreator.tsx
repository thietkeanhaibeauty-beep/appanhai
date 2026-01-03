import { useState, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { dispatchCampaignEvent, useCampaignEvents } from '@/utils/campaignEvents';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Sparkles, CheckCircle2, XCircle, Upload, Image, Video } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { getActiveAdAccounts } from '@/services/nocodb/facebookAdAccountsService';
import { getAllPages } from '@/services/nocodb/facebookPagesService';
import * as quickCreativeService from '@/services/quickCreativeService';
import * as quickCreativeFacebookService from '@/services/quickCreativeFacebookService';
import { creativeCampaignService } from '@/services/creativeCampaign.service';
import { updateObjectStatus } from '@/services/facebookInsightsService';
import MediaUploader from './MediaUploader';
import { trackUsage } from '@/services/usageTrackingService';
import LocationSearch, { LocationTarget } from './LocationSearch';

type Status =
  | 'idle'
  | 'parsing'
  | 'parsed'
  | 'uploading'
  | 'uploaded'
  | 'step1-creating'
  | 'step1-done'
  | 'step2-creating'
  | 'step2-done'
  | 'step3-creating'
  | 'completed'
  | 'error';

interface ParsedData extends quickCreativeService.QuickCreativeParseResult {
  interests: quickCreativeFacebookService.Interest[];
  // Thêm các field từ orchestrator để dùng trực tiếp như CreateQuickAd
  locationType?: 'coordinate' | 'country' | 'city';
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  resolvedLocation?: {
    key: string;
    name: string;
    type: string;
    country_code?: string;
    country_name?: string;
    minRadiusKm?: number;
  };
}

interface MediaData {
  type: 'image' | 'video';
  hash?: string;
  id?: string;
  preview: string;
  thumbnailUrl?: string; // Thêm thumbnail URL nếu user tự upload
}

interface CreatedIds {
  campaignId?: string;
  adSetId?: string;
  creativeId?: string;
  adId?: string;
}

const QuickCreativeCreator = () => {
  const { toast } = useToast();
  const [rawInput, setRawInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mediaData, setMediaData] = useState<MediaData | null>(null);
  const [createdIds, setCreatedIds] = useState<CreatedIds>({});
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [customRadius, setCustomRadius] = useState<number | null>(null);
  const [tokens, setTokens] = useState<{
    adsToken: string;
    adAccountId: string;
    pageToken: string;
    pageId: string;
  } | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [receivedFromAI, setReceivedFromAI] = useState(false);
  const [autoStart, setAutoStart] = useState(false); // Flag để trigger auto create
  const [selectedLocations, setSelectedLocations] = useState<LocationTarget[]>([]);
  // Missing info handling (hiển thị input inline thay vì toast góc phải)
  const [missingField, setMissingField] = useState<string | null>(null);
  const [missingPrompt, setMissingPrompt] = useState<string | null>(null);
  const [radiusInput, setRadiusInput] = useState<string>("");
  // Listen for data from AI Chat
  useCampaignEvents(useCallback((eventData) => {
    if (eventData.type === 'campaign-creation-requested') {
      const { rawInput } = eventData.data;



      // Điền raw text vào form
      setRawInput(rawInput);

      // Trigger phân tích
      setReceivedFromAI(true);

      toast({
        title: "Đã nhận thông tin từ AI",
        description: "Đang phân tích dữ liệu...",
      });
    }

    // AI đã validate xong, tự động tạo luôn
    if (eventData.type === 'campaign-creation-auto-start') {
      const { parsedData: aiParsedData, mediaData: aiMediaData } = eventData.data;

      // Set parsed data và media data từ AI
      setParsedData(aiParsedData);
      setMediaData(aiMediaData);
      setStatus('parsed');
      setAutoStart(true); // Trigger auto create

      toast({
        title: "🚀 Bắt đầu tạo tự động",
        description: "Đang tạo Campaign, Ad Set và Ad...",
      });
    }
  }, [toast]));

  const addLog = useCallback((message: string) => {
    const time = new Date().toLocaleTimeString('vi-VN');

    setLogs(prev => [...prev, `[${time}] ${message}`]);
  }, []);

  const resetState = useCallback(() => {
    setStatus('idle');
    setParsedData(null);
    setMediaData(null);
    setCreatedIds({});
    setLogs([]);
    setCustomRadius(null);
    setTokens(null);
    setLoadingTokens(false);
    setSelectedLocations([]);
  }, []);

  const { user } = useAuth();

  const getTokens = async () => {
    if (!user?.id) throw new Error('Vui lòng đăng nhập');
    const adAccounts = await getActiveAdAccounts(user.id);
    const pages = await getAllPages(user.id);

    const activeAdAccount = adAccounts.find(acc => acc.is_active);
    const activePage = pages.find(page => page.is_active);

    if (!activeAdAccount?.access_token || !activeAdAccount?.account_id) {
      throw new Error('Chưa cấu hình Facebook Ads Token. Vui lòng vào Settings.');
    }

    if (!activePage?.access_token || !activePage?.page_id) {
      throw new Error('Chưa cấu hình Facebook Page Token. Vui lòng vào Settings.');
    }

    return {
      adsToken: activeAdAccount.access_token,
      adAccountId: activeAdAccount.account_id,
      pageToken: activePage.access_token,
      pageId: activePage.page_id,
    };
  };

  // ========== REMOVED PARSING LOGIC ==========
  // Logic parsing đã được xử lý trong useCreativeCampaignFlow.ts và gọi từ AIChatPanel
  // QuickCreativeCreator chỉ nhận data đã parse sẵn từ AI Chat qua campaignEvents


  // Auto-populate selectedLocations from parsedData.locations
  useEffect(() => {
    if (parsedData && parsedData.locations && parsedData.locations.length > 0 && selectedLocations.length === 0) {


      const locations = parsedData.locations.map((loc: string, i: number) => {
        const trimmed = loc.trim();

        // 1️⃣ Detect TỌA ĐỘ (VD: "21.0285, 105.8542")
        const coordMatch = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
        if (coordMatch) {
          const [, lat, lng] = coordMatch;
          return {
            key: `${lat},${lng}`,
            name: `Tọa độ: ${lat}, ${lng}`,
            type: 'coordinates' as const,
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
            radius: parsedData.locationRadius || 17,
            distance_unit: 'kilometer' as const,
          };
        }

        // 2️⃣ Detect QUỐC GIA (VD: "Việt Nam", "Vietnam", "VN")
        if (/^(việt nam|vietnam|vn)$/i.test(trimmed)) {
          return {
            key: 'VN',
            name: 'Việt Nam',
            type: 'country' as const,
          };
        }

        // 3️⃣ THÀNH PHỐ
        if (parsedData.locationType === 'city' && parsedData.resolvedLocation && i === 0) {
          // Ưu tiên dùng location key (số) từ Facebook cho vị trí đầu tiên đã resolve
          return {
            key: String(parsedData.resolvedLocation.key),
            name: parsedData.resolvedLocation.name || trimmed,
            type: 'city' as const,
            radius: parsedData.radiusKm || parsedData.resolvedLocation.minRadiusKm || parsedData.locationRadius || 17,
            distance_unit: 'kilometer' as const,
          };
        }
        // Fallback: city theo tên (không khuyến nghị, chỉ dùng khi không có resolvedLocation)
        return {
          key: trimmed.toLowerCase(),
          name: trimmed,
          type: 'city' as const,
          radius: parsedData.locationRadius || 17,
          distance_unit: 'kilometer' as const,
        };
      });

      setSelectedLocations(locations);

    }
  }, [parsedData, selectedLocations.length]);

  // Load tokens when user wants to upload media
  const handleOpenMediaUploader = useCallback(async () => {
    if (!tokens && !loadingTokens) {
      setLoadingTokens(true);
      try {
        const tokensData = await getTokens();
        setTokens(tokensData);
        setShowMediaUploader(true);
      } catch (error: any) {
        toast({
          title: '❌ Lỗi',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoadingTokens(false);
      }
    } else {
      setShowMediaUploader(true);
    }
  }, [tokens, loadingTokens, toast]);

  // Step 2: Handle media upload success
  const handleMediaUploadSuccess = useCallback(async (result: MediaData) => {
    setMediaData(result);

    // Nếu là video, tự động lấy thumbnail mặc định
    if (result.type === 'video' && result.id && tokens?.pageToken) {
      addLog(`✅ Upload video thành công! Đang tự động lấy thumbnail...`);

      try {
        const thumbnailUrl = await quickCreativeFacebookService.getVideoThumbnails(
          result.id,
          tokens.pageToken
        );



        // Cập nhật mediaData với thumbnail
        const updatedMedia = { ...result, thumbnailUrl };
        setMediaData(updatedMedia);

        addLog('✅ Đã tự động lấy thumbnail mặc định!');
        toast({
          title: '✅ Upload video thành công',
          description: 'Đã tự động sử dụng thumbnail mặc định',
        });
      } catch (error: any) {
        console.error('[Auto thumbnail] Error:', error);
        addLog(`⚠️ Không lấy được thumbnail tự động, sẽ bỏ qua thumbnail`);
        toast({
          title: '✅ Upload video thành công',
          description: 'Sẽ tạo ad không có thumbnail',
        });
      }
    } else {
      // Ảnh thì không cần thumbnail
      addLog(`✅ Upload ảnh thành công!`);
      toast({
        title: '✅ Upload thành công',
        description: 'Vui lòng xem preview và xác nhận',
      });
    }
  }, [addLog, toast, tokens]);

  // Handler: Upload thumbnail (phải khai báo trước vì được gọi trong handleThumbnailChoice)
  const handleThumbnailUpload = useCallback(async (file: File) => {


    if (!file.type.startsWith('image/')) {
      toast({
        title: '❌ Lỗi',
        description: 'Vui lòng chọn file ảnh',
        variant: 'destructive',
      });
      return;
    }

    if (!tokens) {

      return;
    }

    addLog('⏳ Đang tải thumbnail lên...');

    try {
      // Upload ảnh lên Facebook Ads và lấy URL trực tiếp từ response
      const { imageHash, imageUrl } = await quickCreativeFacebookService.uploadAdImage(
        tokens.adAccountId,
        tokens.adsToken,
        file
      );



      if (!imageHash) {
        throw new Error('Không tìm thấy hash thumbnail từ Facebook');
      }

      setMediaData(prev => {
        const updated = prev ? { ...prev, thumbnailUrl: imageHash } : prev;

        return updated;
      });
      if (parsedData) {
        setStatus('parsed');

        addLog('✅ Upload thumbnail thành công!');
        toast({
          title: '✅ Upload thành công',
          description: 'Thumbnail đã sẵn sàng',
        });
      } else {
        setStatus('uploaded');
        addLog('✅ Upload thumbnail thành công!');
        toast({
          title: '✅ Upload thành công',
          description: 'Thumbnail đã sẵn sàng',
        });
      }
    } catch (error: any) {
      console.error('[handleThumbnailUpload] Error:', error);
      addLog(`❌ Lỗi upload thumbnail: ${error.message}`);
      toast({
        title: '❌ Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [tokens, addLog, toast, parsedData, rawInput]);

  // Handler: Chọn thumbnail (Mặc định / Tải lên)
  const handleThumbnailChoice = useCallback(async (choice: 'default' | 'upload') => {


    if (choice === 'default') {
      if (!mediaData?.id || !tokens?.pageToken) {

        return;
      }

      addLog('⏳ Đang lấy thumbnail mặc định...');
      try {
        const thumbnailUrl = await quickCreativeFacebookService.getVideoThumbnails(
          mediaData.id,
          tokens.pageToken
        );


        setMediaData(prev => {
          const updated = prev ? { ...prev, thumbnailUrl } : prev;

          return updated;
        });
        if (parsedData) {
          setStatus('parsed');

          addLog('✅ Đã lấy thumbnail mặc định!');
          toast({
            title: '✅ Thumbnail sẵn sàng',
            description: 'Có thể xem preview và xác nhận tạo campaign',
          });
        } else {
          setStatus('uploaded');
          addLog('✅ Đã lấy thumbnail mặc định!');
          toast({
            title: '✅ Thumbnail sẵn sàng',
            description: 'Thumbnail đã sẵn sàng',
          });
        }
      } catch (error: any) {
        console.error('[handleThumbnailChoice] Error:', error);
        addLog(`❌ Lỗi lấy thumbnail: ${error.message}`);
        toast({
          title: '❌ Lỗi',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      // Trigger file input

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];

        if (file) await handleThumbnailUpload(file);
      };
      fileInput.click();
    }
  }, [mediaData, tokens, addLog, toast, handleThumbnailUpload, parsedData, rawInput]);

  // Inline handler: áp dụng bán kính khi thiếu
  const applyRadiusInline = useCallback(() => {
    const val = parseFloat(radiusInput);
    if (isNaN(val) || val <= 0) {
      toast({ title: '❌ Bán kính không hợp lệ', description: 'Vui lòng nhập số km > 0', variant: 'destructive' });
      return;
    }
    // Cập nhật vào parsedData
    setParsedData(prev => prev ? { ...prev, locationRadius: val, radiusKm: val } as ParsedData : prev);
    // Cập nhật radius cho danh sách vị trí đã chọn
    setSelectedLocations(prev => prev.map(loc => ({
      ...loc,
      radius: val,
      distance_unit: loc.distance_unit || 'kilometer'
    })));
    setMissingField(null);
    setMissingPrompt(null);
    toast({ title: '✅ Đã áp dụng bán kính', description: `${val}km` });
  }, [radiusInput, toast]);

  // Step 1: Tạo Campaign (Lượt tương tác)
  const handleCreateCampaign = useCallback(async () => {
    if (!parsedData || !mediaData) return;



    setStatus('step1-creating');
    addLog('🚀 Bước 1: Đang tạo Campaign (Lượt tương tác)...');

    try {
      const { adsToken, adAccountId } = await getTokens();

      const result = await creativeCampaignService.createCampaignStep({
        campaignName: parsedData.campaignName,
        adsToken,
        adAccountId
      });

      const campaignId = result.campaignId;
      setCreatedIds({ campaignId });
      addLog(`✅ Tạo Campaign thành công! Campaign ID: ${campaignId}`);
      setStatus('step1-done');

      // Track usage
      await trackUsage('campaign_created', 'campaign', campaignId);
      await trackUsage('ai_creative_generated', 'campaign', campaignId, {
        source: 'quick_creative_creator',
        mediaType: mediaData.type
      });

      toast({
        title: '✅ Bước 1 hoàn tất',
        description: `Campaign ID: ${campaignId}`,
      });
    } catch (error: any) {
      console.error('Create campaign error:', error);
      addLog(`❌ Lỗi: ${error.message}`);
      setStatus('error');
      toast({
        title: '❌ Lỗi tạo Campaign',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [parsedData, mediaData, addLog, toast]);

  // Step 2: Tạo Ad Set (Đích đến: Tin nhắn, Tối ưu hóa: Cuộc trò chuyện)
  const handleCreateAdSet = useCallback(async () => {
    if (!parsedData || !mediaData || !createdIds.campaignId) return;

    setStatus('step2-creating');
    addLog('🎯 Bước 2: Đang tạo Ad Set (Đích đến: Tin nhắn, Tối ưu hóa: Cuộc trò chuyện)...');

    try {
      const { adsToken, adAccountId, pageId } = await getTokens();

      const genders = parsedData.gender === 'male' ? [1] :
        parsedData.gender === 'female' ? [2] : undefined;

      // Build geo_locations GIỐNG 100% CreateQuickAd.tsx và handleAutoCreate
      let geoLocations: any;

      // ✅ Trường hợp 1: CÓ TỌA ĐỘ từ parsedData → custom_locations (KHÔNG có location_types)
      if (parsedData.locationType === 'coordinate' && parsedData.latitude && parsedData.longitude) {
        geoLocations = {
          custom_locations: [
            {
              latitude: parsedData.latitude,
              longitude: parsedData.longitude,
              radius: parsedData.radiusKm || 25,
              distance_unit: 'kilometer',
            },
          ],
        };

      }
      // ✅ Trường hợp 2: QUỐC GIA
      else if (parsedData.locationType === 'country') {
        geoLocations = {
          location_types: ['home', 'recent'],
          countries: ['VN']
        };

      }
      // ✅ Trường hợp 3: THÀNH PHỐ (dùng resolvedLocation.key)
      else if (parsedData.locationType === 'city' && parsedData.resolvedLocation) {
        geoLocations = {
          location_types: ['home', 'recent'],
          cities: [
            {
              key: parsedData.resolvedLocation.key, // Đây là location key (số) từ Facebook
              radius: parsedData.radiusKm || parsedData.resolvedLocation.minRadiusKm || 17,
              distance_unit: 'kilometer'
            }
          ]
        };

      }
      // ✅ Trường hợp 4: Fallback
      else {
        // Fallback: ưu tiên selectedLocations nếu người dùng đã chọn
        const customFromSelected = selectedLocations
          .filter((loc) => loc.latitude && loc.longitude)
          .map((loc) => ({
            latitude: loc.latitude!,
            longitude: loc.longitude!,
            radius: loc.radius || (parsedData.locationRadius || 17),
            distance_unit: loc.distance_unit || 'kilometer',
          }));
        if (customFromSelected.length > 0) {
          geoLocations = { custom_locations: customFromSelected };

        } else {
          const countries = selectedLocations.filter((l) => l.type === 'country').map((l) => l.key);
          const cities = selectedLocations.filter((l) => l.type === 'city').map((l) => ({
            key: l.key,
            ...(l.radius && { radius: l.radius, distance_unit: l.distance_unit || 'kilometer' }),
          }));
          if (countries.length > 0 || cities.length > 0) {
            geoLocations = { location_types: ['home', 'recent'] } as any;
            if (countries.length > 0) (geoLocations as any).countries = countries;
            if (cities.length > 0) (geoLocations as any).cities = cities;

          } else {
            geoLocations = {
              location_types: ['home', 'recent'],
              countries: ['VN'],
            };

          }
        }
      }



      const result = await creativeCampaignService.createAdSetStep({
        campaignId: createdIds.campaignId,
        adSetName: `${parsedData.campaignName} - Ad Set`,
        dailyBudget: parsedData.budget,
        targeting: {
          geo_locations: geoLocations,
          age_min: parsedData.ageMin,
          age_max: parsedData.ageMax,
          genders,
          interests: parsedData.interests.map(i => i.id),
        },
        optimizationGoal: 'CONVERSATIONS',
        billingEvent: 'IMPRESSIONS',
        bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
        promotedObject: {
          page_id: pageId
        },
        adsToken,
        adAccountId,
        currency: 'VND'
      });

      const adSetId = result.adSetId;
      setCreatedIds(prev => ({ ...prev, adSetId }));
      addLog(`✅ Tạo Ad Set thành công! Ad Set ID: ${adSetId}`);
      setStatus('step2-done');

      toast({
        title: '✅ Bước 2 hoàn tất',
        description: `Ad Set ID: ${adSetId}`,
      });
    } catch (error: any) {
      console.error('Create adset error:', error);
      addLog(`❌ Lỗi: ${error.message}`);
      setStatus('error');
      toast({
        title: '❌ Lỗi tạo Ad Set',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [parsedData, mediaData, createdIds.campaignId, addLog, toast]);

  // Bước 3: Tạo Creative + Ad
  const handleCreateAd = useCallback(async () => {
    if (!parsedData || !mediaData || !createdIds.adSetId) return;

    setStatus('step3-creating');
    addLog('📝 Bước 3/3: Đang tạo Creative + Ad...');

    try {
      const { adAccountId, adsToken, pageToken, pageId } = await getTokens();

      // Build Message Template Data
      let messageTemplateData: any;
      if (parsedData.greetingText || (parsedData.iceBreakerQuestions && parsedData.iceBreakerQuestions.length > 0)) {
        messageTemplateData = {
          page_welcome_message: {
            type: 'VISUAL_EDITOR',
            version: 2,
            landing_screen_type: "welcome_message",
            media_type: 'text',
            text_format: {
              customer_action_type: "ice_breakers",
              message: {
                ice_breakers: (parsedData.iceBreakerQuestions || [])
                  .slice(0, 4)
                  .filter(q => q.trim())
                  .map(q => ({
                    title: q.trim(),
                    response: q.trim(),
                  })),
                quick_replies: [],
                text: (parsedData.greetingText || '').trim(),
              },
            },
            user_edit: false,
            surface: "visual_editor_new",
          },
        };
      }

      // Tạo Ad Creative (tạo mới từ media)
      let creativeId: string;
      if (mediaData.type === 'image') {
        if (!mediaData.hash) throw new Error('imageHash is required for image creative');
        creativeId = await quickCreativeFacebookService.createAdCreativeForImage(
          adAccountId,
          adsToken,
          {
            pageId,
            name: parsedData.adHeadline,
            message: parsedData.adContent,
            imageHash: mediaData.hash,
            messageTemplateData,
          }
        );
      } else {
        if (!mediaData.id) throw new Error('videoId is required for video creative');

        // Dùng thumbnail đã upload nếu có, không thì lấy mặc định
        const thumbnailUrl = mediaData.thumbnailUrl ||
          await quickCreativeFacebookService.getVideoThumbnails(mediaData.id, pageToken);

        creativeId = await quickCreativeFacebookService.createAdCreativeForVideo(
          adAccountId,
          adsToken,
          {
            pageId,
            title: parsedData.adHeadline,
            message: parsedData.adContent,
            videoId: mediaData.id,
            thumbnailUrl,
            messageTemplateData,
          }
        );
      }
      setCreatedIds(prev => ({ ...prev, creativeId }));
      addLog(`Tạo Creative thành công! ID: ${creativeId}`);

      // Tạo Ad
      const adId = await quickCreativeFacebookService.createAd(
        adAccountId,
        adsToken,
        {
          adSetId: createdIds.adSetId,
          name: `${parsedData.campaignName} Ad`,
          creativeId,
        }
      );
      setCreatedIds(prev => ({ ...prev, adId }));
      addLog(`Thành công! Ad ID: ${adId}`);

      setStatus('completed');
      toast({
        title: '🎉 Hoàn tất tất cả!',
        description: 'Chiến dịch đã được tạo thành công',
      });
    } catch (error: any) {
      console.error('Create ad error:', error);
      addLog(error.message || 'Không thể tạo Creative/Ad');
      setStatus('error');
      toast({
        title: '❌ Lỗi tạo Creative/Ad',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [parsedData, mediaData, createdIds.adSetId, addLog, toast]);

  // Auto Create: Tự động chạy toàn bộ quy trình 3 bước
  const handleAutoCreate = useCallback(async () => {
    if (!parsedData || !mediaData) return;

    try {
      // Emit start event
      dispatchCampaignEvent({
        type: 'campaign-creation-started',
        message: 'Bắt đầu tạo chiến dịch'
      });

      // === STEP 1: Tạo Campaign ===
      setStatus('step1-creating');
      addLog('🚀 Bước 1: Đang tạo Campaign...');
      dispatchCampaignEvent({
        type: 'campaign-creation-progress',
        message: 'Đang tạo Campaign...'
      });

      const { adsToken, adAccountId, pageId, pageToken } = await getTokens();

      const result = await creativeCampaignService.createCampaignStep({
        campaignName: parsedData.campaignName,
        adsToken,
        adAccountId
      });

      const campaignId = result.campaignId;
      setCreatedIds({ campaignId });
      addLog(`✅ Bước 1 hoàn tất! Campaign ID: ${campaignId}`);
      setStatus('step1-done');

      // === STEP 2: Tạo Ad Set ===
      setStatus('step2-creating');
      addLog('🎯 Bước 2: Đang tạo Ad Set...');
      dispatchCampaignEvent({
        type: 'campaign-creation-progress',
        message: 'Đang tạo Ad Set...'
      });

      const genders = parsedData.gender === 'male' ? [1] :
        parsedData.gender === 'female' ? [2] : undefined;

      // Build geo_locations GIỐNG 100% CreateQuickAd.tsx
      let geoLocations: any;

      // ✅ Trường hợp 1: CÓ TỌA ĐỘ từ parsedData → custom_locations (KHÔNG có location_types)
      if (parsedData.locationType === 'coordinate' && parsedData.latitude && parsedData.longitude) {
        geoLocations = {
          custom_locations: [
            {
              latitude: parsedData.latitude,
              longitude: parsedData.longitude,
              radius: parsedData.radiusKm || 25,
              distance_unit: 'kilometer',
            },
          ],
        };

      }
      // ✅ Trường hợp 2: QUỐC GIA
      else if (parsedData.locationType === 'country') {
        geoLocations = {
          location_types: ['home', 'recent'],
          countries: ['VN']
        };

      }
      // ✅ Trường hợp 3: THÀNH PHỐ với resolvedLocation.key
      else if (parsedData.locationType === 'city' && parsedData.resolvedLocation) {
        geoLocations = {
          location_types: ['home', 'recent'],
          cities: [
            {
              key: parsedData.resolvedLocation.key, // Location key (số) từ Facebook
              radius: parsedData.radiusKm || parsedData.resolvedLocation.minRadiusKm || 17,
              distance_unit: 'kilometer'
            }
          ]
        };

      }
      // ✅ Trường hợp 4: Fallback từ selectedLocations hoặc default VN
      else {
        const customLocations = selectedLocations
          .filter((loc) => loc.latitude && loc.longitude)
          .map((loc) => ({
            latitude: loc.latitude!,
            longitude: loc.longitude!,
            radius: loc.radius || (parsedData.locationRadius || 17),
            distance_unit: loc.distance_unit || 'kilometer',
          }));

        if (customLocations.length > 0) {
          // Nếu có custom_locations từ selectedLocations → dùng KHÔNG có location_types
          geoLocations = { custom_locations: customLocations };

        } else {
          const countries = selectedLocations
            .filter((loc) => loc.type === 'country')
            .map((loc) => loc.key);
          const cities = selectedLocations
            .filter((loc) => loc.type === 'city')
            .map((loc) => ({
              key: loc.key,
              ...(loc.radius && { radius: loc.radius, distance_unit: loc.distance_unit || 'kilometer' }),
            }));

          if (countries.length > 0 || cities.length > 0) {
            geoLocations = { location_types: ['home', 'recent'] } as any;
            if (countries.length > 0) (geoLocations as any).countries = countries;
            if (cities.length > 0) (geoLocations as any).cities = cities;

          } else {
            // Default: Vietnam
            geoLocations = {
              location_types: ['home', 'recent'],
              countries: ['VN'],
            };

          }
        }
      }



      const adSetResult = await creativeCampaignService.createAdSetStep({
        campaignId,
        adSetName: `${parsedData.campaignName} - Ad Set`,
        dailyBudget: parsedData.budget,
        targeting: {
          geo_locations: geoLocations,
          age_min: parsedData.ageMin,
          age_max: parsedData.ageMax,
          genders,
          interests: parsedData.interests.map(i => i.id),
        },
        optimizationGoal: 'CONVERSATIONS',
        billingEvent: 'IMPRESSIONS',
        bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
        promotedObject: {
          page_id: pageId
        },
        adsToken,
        adAccountId,
        currency: 'VND'
      });

      const adSetId = adSetResult.adSetId;
      setCreatedIds(prev => ({ ...prev, adSetId }));
      addLog(`✅ Bước 2 hoàn tất! Ad Set ID: ${adSetId}`);
      setStatus('step2-done');

      // === STEP 3: Tạo Creative + Ad ===
      setStatus('step3-creating');
      addLog('📝 Bước 3: Đang tạo Creative + Ad...');
      dispatchCampaignEvent({
        type: 'campaign-creation-progress',
        message: 'Đang tạo Creative và Ad...'
      });

      // Build Message Template
      let messageTemplateData: any;
      if (parsedData.greetingText || (parsedData.iceBreakerQuestions && parsedData.iceBreakerQuestions.length > 0)) {
        messageTemplateData = {
          page_welcome_message: {
            type: 'VISUAL_EDITOR',
            version: 2,
            landing_screen_type: "welcome_message",
            media_type: 'text',
            text_format: {
              customer_action_type: "ice_breakers",
              message: {
                ice_breakers: (parsedData.iceBreakerQuestions || [])
                  .slice(0, 4)
                  .filter(q => q.trim())
                  .map(q => ({
                    title: q.trim(),
                    response: q.trim(),
                  })),
                quick_replies: [],
                text: (parsedData.greetingText || '').trim(),
              },
            },
            user_edit: false,
            surface: "visual_editor_new",
          },
        };
      }

      // Tạo Creative
      let creativeId: string;
      if (mediaData.type === 'image') {
        if (!mediaData.hash) throw new Error('imageHash is required');
        creativeId = await quickCreativeFacebookService.createAdCreativeForImage(
          adAccountId,
          adsToken,
          {
            pageId,
            name: parsedData.adHeadline,
            message: parsedData.adContent,
            imageHash: mediaData.hash,
            messageTemplateData,
          }
        );
      } else {
        if (!mediaData.id) throw new Error('videoId is required');

        // Dùng thumbnail đã upload nếu có, không thì lấy mặc định
        const thumbnailUrl = mediaData.thumbnailUrl ||
          await quickCreativeFacebookService.getVideoThumbnails(mediaData.id, pageToken);

        creativeId = await quickCreativeFacebookService.createAdCreativeForVideo(
          adAccountId,
          adsToken,
          {
            pageId,
            title: parsedData.adHeadline,
            message: parsedData.adContent,
            videoId: mediaData.id,
            thumbnailUrl,
            messageTemplateData,
          }
        );
      }
      setCreatedIds(prev => ({ ...prev, creativeId }));
      addLog(`✅ Tạo Creative thành công! ID: ${creativeId}`);

      // Tạo Ad
      const adId = await quickCreativeFacebookService.createAd(
        adAccountId,
        adsToken,
        {
          adSetId, // Dùng adSetId từ bước 2
          name: `${parsedData.campaignName} Ad`,
          creativeId,
        }
      );
      setCreatedIds(prev => ({ ...prev, adId }));
      addLog(`✅ Bước 3 hoàn tất! Ad ID: ${adId}`);

      // === BẬT CAMPAIGN VÀ AD TỰ ĐỘNG ===
      addLog('🚀 Đang bật Campaign và Ad...');

      // Bật Campaign
      await updateObjectStatus(adsToken, campaignId, 'ACTIVE');
      addLog(`✅ Đã bật Campaign ID: ${campaignId}`);

      // Bật Ad
      await updateObjectStatus(adsToken, adId, 'ACTIVE');
      addLog(`✅ Đã bật Ad ID: ${adId}`);

      // Emit success
      dispatchCampaignEvent({
        type: 'campaign-creation-completed',
        data: { campaignId, adSetId, adId },
        message: 'Chiến dịch đã được tạo và đăng thành công!'
      });

      setStatus('completed');
      toast({
        title: '🎉 Đăng thành công!',
        description: 'Chiến dịch đã được tạo và đăng thành công!',
      });

    } catch (error: any) {
      console.error('Auto create error:', error);
      addLog(`❌ Lỗi: ${error.message}`);

      // Emit failure
      dispatchCampaignEvent({
        type: 'campaign-creation-failed',
        error: error.message
      });

      setStatus('error');
      toast({
        title: '❌ Lỗi tạo chiến dịch',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [parsedData, mediaData, addLog, toast]);

  // Auto-create when auto start flag is set (from AI confirmation)
  useEffect(() => {
    if (autoStart && parsedData && mediaData) {
      setAutoStart(false);
      handleAutoCreate();
    }
  }, [autoStart, parsedData, mediaData, handleAutoCreate]);

  const isBusy = status === 'parsing' || status === 'step1-creating' || status === 'step2-creating' || status === 'step3-creating';



  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            🎨 Tạo QC tin nhắn mới - Tạo nội dung quảng cáo mới
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Creating Status */}
          {(status === 'step1-creating' || status === 'step2-creating' || status === 'step3-creating') && (
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardContent className="py-8">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Đang tạo quảng cáo...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Parsing Status */}
          {status === 'parsing' && (
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardContent className="py-8">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Đang phân tích với AI...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Input & Parse */}
          {(status === 'idle' || status === 'error') && (
            <>
              <Textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={`Tên chiến dịch: Spa Hà Nội
Ngân sách: 400k/ngày
Độ tuổi: 25-40
Giới tính: nữ
Địa điểm: Hà Nội
Sở thích: làm đẹp, spa, thẩm mỹ viện

Nội dung quảng cáo:
Khuyến mãi 50% dịch vụ làm đẹp tháng 3! Đặt lịch ngay!

Tiêu đề: Giảm 50% - Spa Hà Nội

Lời chào tin nhắn: Xin chào! Cảm ơn bạn đã quan tâm. Mình có thể hỗ trợ bạn điều gì?

Câu hỏi gợi ý:
- Giá bao nhiêu?
- Địa chỉ ở đâu?
- Có khuyến mãi không?`}
                rows={16}
                className="font-mono text-sm"
                disabled={isBusy}
              />

              {/* Media Upload Buttons - Step 1 */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">📸 Tải media (tùy chọn):</p>
                    {mediaData && (
                      <div className="flex items-center gap-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                        {mediaData.type === 'image' ? (
                          <><Image className="w-3 h-3" /> Đã tải ảnh</>
                        ) : (
                          <><Video className="w-3 h-3" /> Đã tải video</>
                        )}
                        <Button
                          onClick={() => {
                            setMediaData(null);
                            setShowMediaUploader(false);
                          }}
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {!mediaData && (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleOpenMediaUploader}
                        variant="ghost"
                        size="icon"
                        disabled={isBusy || loadingTokens}
                        className="h-8 w-8"
                        title="Tải ảnh lên"
                      >
                        {loadingTokens ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                      </Button>
                      <Button
                        onClick={handleOpenMediaUploader}
                        variant="ghost"
                        size="icon"
                        disabled={isBusy || loadingTokens}
                        className="h-8 w-8"
                        title="Tải video lên"
                      >
                        {loadingTokens ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center p-8 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Vui lòng sử dụng Trợ lý AI để tạo chiến dịch creative</p>
              </div>
            </>
          )}

          {/* Step 2: Confirm & Upload if needed */}
          {parsedData && status === 'parsed' && (
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-md">📋 Thông tin đã phân tích:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Chiến dịch:</strong> {parsedData.campaignName}</div>
                  <div><strong>Ngân sách:</strong> {parsedData.budget.toLocaleString('vi-VN')} VND</div>
                  <div><strong>Độ tuổi:</strong> {parsedData.ageMin}-{parsedData.ageMax}</div>
                  <div><strong>Giới tính:</strong> {parsedData.gender === 'all' ? 'Tất cả' : parsedData.gender === 'male' ? 'Nam' : 'Nữ'}</div>
                </div>
                <div className="text-sm space-y-2">
                  <strong>🌍 Vị trí targeting:</strong>

                  {/* Hiển thị vị trí đã parse */}
                  {selectedLocations.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-xs space-y-1">
                      {selectedLocations.map((loc, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {loc.type === 'country' && <span>🌍 {loc.name}</span>}
                          {loc.type === 'city' && <span>🏙️ {loc.name} ({loc.radius}km)</span>}
                          {loc.type === 'coordinates' && (
                            <span>📍 Tọa độ: {loc.latitude}, {loc.longitude} ({loc.radius}km)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cho phép thêm/sửa vị trí */}
                  <LocationSearch
                    accessToken={tokens?.adsToken || ''}
                    adAccountId={tokens?.adAccountId || ''}
                    selectedLocations={selectedLocations}
                    onLocationChange={setSelectedLocations}
                  />

                  {missingField === 'locationRadius' && (
                    <div className="mt-2 p-3 rounded border border-orange-300 bg-orange-50 dark:bg-orange-900/20">
                      <p className="text-xs mb-2">{missingPrompt || 'Vui lòng nhập bán kính (km) cho vị trí đã chọn'}</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={parsedData?.locationType === 'coordinate' ? 1 : 17}
                          placeholder={parsedData?.locationType === 'coordinate' ? '>= 1km' : '>= 17km'}
                          value={radiusInput}
                          onChange={(e) => setRadiusInput(e.target.value)}
                          className="w-32"
                        />
                        <Button size="sm" onClick={applyRadiusInline}>Áp dụng</Button>
                      </div>
                    </div>
                  )}

                  {selectedLocations.length === 0 && (
                    <p className="text-xs text-orange-600">
                      ⚠️ Chưa chọn vị trí (mặc định sẽ dùng Việt Nam)
                    </p>
                  )}
                </div>
                <div className="text-sm">
                  <strong>Sở thích:</strong> {parsedData.interests.map(i => i.name).join(', ') || 'Không có'}
                </div>
                <div className="text-sm">
                  <strong>Nội dung:</strong>
                  <div className="mt-1 whitespace-pre-wrap bg-muted/30 p-2 rounded text-xs max-h-40 overflow-y-auto">
                    {parsedData.adContent}
                  </div>
                </div>
                <div className="text-sm">
                  <strong>Tiêu đề:</strong> {parsedData.adHeadline}
                </div>
                {parsedData.greetingText && (
                  <div className="text-sm">
                    <strong>Lời chào:</strong> {parsedData.greetingText}
                  </div>
                )}
                {parsedData.iceBreakerQuestions && parsedData.iceBreakerQuestions.length > 0 && (
                  <div className="text-sm">
                    <strong>Câu hỏi gợi ý:</strong>
                    <ul className="list-disc list-inside ml-2">
                      {parsedData.iceBreakerQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Show media if already uploaded in step 1, or allow upload */}
                {!mediaData ? (
                  <>
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-orange-600">⚠️ Chưa có media:</p>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleOpenMediaUploader}
                            variant="ghost"
                            size="icon"
                            disabled={loadingTokens}
                            className="h-8 w-8"
                            title="Tải ảnh lên"
                          >
                            {loadingTokens ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                          </Button>
                          <Button
                            onClick={handleOpenMediaUploader}
                            variant="ghost"
                            size="icon"
                            disabled={loadingTokens}
                            className="h-8 w-8"
                            title="Tải video lên"
                          >
                            {loadingTokens ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={resetState} variant="outline" size="lg" className="flex-1">
                        <XCircle className="w-4 h-4 mr-2" />
                        Sửa lại
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm font-medium mb-2">✅ Media đã tải lên:</p>
                      <div className="border rounded-lg overflow-hidden w-[30%]">
                        {mediaData.type === 'image' ? (
                          <div className="relative aspect-video flex items-center justify-center bg-muted">
                            <img src={mediaData.preview} alt="Preview" className="w-full h-full object-contain" />
                            <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                              <Image className="w-3 h-3" />
                              Ảnh
                            </div>
                          </div>
                        ) : (
                          <div className="relative aspect-video flex items-center justify-center bg-muted">
                            <video src={mediaData.preview} className="w-full h-full object-contain" controls />
                            <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                              <Video className="w-3 h-3" />
                              Video
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleOpenMediaUploader} variant="outline" size="lg" className="flex-1">
                        <Upload className="w-4 h-4 mr-2" />
                        Tải lại
                      </Button>
                      <Button
                        onClick={handleAutoCreate}
                        size="lg"
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Xác nhận & Đăng tự động
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 1 Done: Show Campaign ID + Button for Step 2 */}
          {status === 'step1-done' && (
            <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-md flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ✅ Bước 1 hoàn tất
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm"><strong>Campaign ID:</strong> {createdIds.campaignId}</div>
                <Button onClick={handleCreateAdSet} size="lg" className="w-full">
                  Bước 2: Tạo Ad Set
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2 Done: Show Ad Set ID + Button for Step 3 */}
          {status === 'step2-done' && (
            <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-md flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ✅ Bước 2 hoàn tất
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm"><strong>Campaign ID:</strong> {createdIds.campaignId}</div>
                <div className="text-sm"><strong>Ad Set ID:</strong> {createdIds.adSetId}</div>
                <Button onClick={handleCreateAd} size="lg" className="w-full">
                  Bước 3: Tạo Creative + Ad
                </Button>
              </CardContent>
            </Card>
          )}


          {/* Step 3: Review & Create - REMOVED, now handled by step buttons above */}
          {parsedData && mediaData && status === 'uploaded' && (
            <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-md flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ✅ Sẵn sàng tạo chiến dịch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Media Preview */}
                <div className="border rounded-lg overflow-hidden w-[30%]">
                  {mediaData.type === 'image' ? (
                    <div className="relative aspect-video flex items-center justify-center bg-muted">
                      <img src={mediaData.preview} alt="Preview" className="w-full h-full object-contain" />
                      <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <Image className="w-3 h-3" />
                        Ảnh
                      </div>
                    </div>
                  ) : (
                    <div className="relative aspect-video flex items-center justify-center bg-muted">
                      <video src={mediaData.preview} className="w-full h-full object-contain" controls />
                      <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        Video
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateCampaign} size="lg" className="flex-1">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Bước 1: Tạo Campaign
                  </Button>
                  <Button onClick={handleOpenMediaUploader} variant="outline" size="lg">
                    <Upload className="w-4 h-4 mr-2" />
                    Tải lại
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed */}
          {status === 'completed' && (
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-300 dark:border-green-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="w-6 h-6 animate-pulse" />
                  🎉 Đăng quảng cáo thành công!
                </CardTitle>
                <CardDescription className="text-green-600 dark:text-green-400 font-medium">
                  Campaign đã được tạo và đang chạy ACTIVE
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-white/70 dark:bg-black/20 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-muted-foreground">Campaign ID:</span>
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{createdIds.campaignId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-muted-foreground">Ad Set ID:</span>
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{createdIds.adSetId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-muted-foreground">Creative ID:</span>
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{createdIds.creativeId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-muted-foreground">Ad ID:</span>
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{createdIds.adId}</span>
                  </div>
                </div>

                <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3 text-sm">
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    ✅ Trạng thái: <span className="text-green-600 dark:text-green-400 font-bold">ĐANG CHẠY</span>
                  </p>
                  <p className="text-green-700 dark:text-green-300 text-xs mt-1">
                    Campaign và Ad đã được bật tự động. Bạn có thể kiểm tra trong Facebook Ads Manager.
                  </p>
                </div>

                <Button onClick={resetState} className="w-full mt-4" size="lg">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Tạo chiến dịch mới
                </Button>
              </CardContent>
            </Card>
          )}

        </CardContent>
      </Card>

      {/* Media Uploader Dialog */}
      {tokens && (
        <MediaUploader
          open={showMediaUploader}
          onClose={() => setShowMediaUploader(false)}
          adAccountId={tokens.adAccountId}
          adsToken={tokens.adsToken}
          pageToken={tokens.pageToken}
          onUploadSuccess={handleMediaUploadSuccess}
        />
      )}
    </div>
  );
};

export default QuickCreativeCreator;
