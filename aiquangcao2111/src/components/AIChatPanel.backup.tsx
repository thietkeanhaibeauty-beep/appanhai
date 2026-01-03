import { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, ArrowUp, Loader2, X, Minimize2, RotateCcw, Paperclip, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { streamAIChat } from "@/utils/aiStream";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabaseSettings } from "@/hooks/useSupabaseSettings";
import { detectChatIntent } from "@/services/aiChatOrchestratorService";
import { useCreativeCampaignFlow } from "@/hooks/useCreativeCampaignFlow";
import { useAudienceFlow } from "@/hooks/useAudienceFlow";
import { useCloneFlow } from "@/hooks/useCloneFlow";
import { useQuickPostFlow } from "@/features/quick-post-isolated/hooks/useQuickPostFlow";
import { getUserProfile } from "@/services/nocodb/profilesService";
import { getAllPages } from "@/services/nocodb/facebookPagesService";
import {
  parseAudienceInput,
  validateAudienceData,
  getCustomAudiences
} from '@/services/aiChatAudienceOrchestratorService';
import { QuickPostConfirmCard } from "@/features/quick-post-isolated/components/QuickPostConfirmCard";
import { QuickCreativeConfirmCard } from "./QuickCreativeConfirmCard";
import { CloneItemSelectorCard } from "./CloneItemSelectorCard";
import { CloneConfirmCard } from "./CloneConfirmCard";
import { CampaignSelector } from "./CampaignSelector";
import { CloneListChoiceButtons } from "./CloneListChoiceButtons";
import { CloneConfirmIntentButtons } from "./CloneConfirmIntentButtons";
import { CloneTypeSelector } from "./CloneTypeSelector";
import { useAIFeatures, AI_FEATURES } from "@/hooks/useAIFeatures";
import * as advancedAdsService from "@/services/advancedAdsService";
import type { ParsedCampaignData } from "@/features/quick-post-isolated/types";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useCampaignControlFlow } from "@/assistant/hooks/useCampaignControlFlow";
import { parseCampaignIntent } from "@/assistant/services/campaignControl.service";
import { CampaignListCard } from "@/assistant/components/CampaignListCard";
import { getInsightsByUserAndDate } from "@/services/nocodb/facebookInsightsAutoService";
import { ConfirmationCard } from "@/assistant/components/ConfirmationCard";
import { useRuleFlow } from "@/assistant/hooks/useRuleFlow";
import { parseRuleIntent } from "@/assistant/services/ruleControl.service";
import { RuleCard } from "./automation/RuleCard";

type Message = { role: "user" | "assistant"; content: string };

interface AIChatPanelProps {
  fullWidth?: boolean;
}

import { getCampaigns, getAdSets, getAds } from "@/services/facebookInsightsService";
import { ItemSelectorCard } from "@/assistant/components/ItemSelectorCard";

const AIChatPanel = ({ fullWidth = false }: AIChatPanelProps = {}) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isResetRef = useRef(false);

  // Hooks for campaign flows
  const creative = useCreativeCampaignFlow();
  const audience = useAudienceFlow();
  const clone = useCloneFlow();
  const quickPost = useQuickPostFlow();
  const ruleFlow = useRuleFlow();

  const [campaignCatalog, setCampaignCatalog] = useState<any[]>([]);
  const [selectableItems, setSelectableItems] = useState<any[]>([]); // New: For rule label application

  // ✅ Fetch items when entering selecting_items stage
  useEffect(() => {
    const fetchItems = async () => {
      if (ruleFlow.stage === 'selecting_items' && ruleFlow.proposedRule?.scope) {
        setIsLoading(true);
        try {
          const { adsToken, adAccountId } = getTokens();
          let items = [];

          if (ruleFlow.proposedRule.scope === 'campaign') {
            items = await getCampaigns(adsToken, adAccountId);
          } else if (ruleFlow.proposedRule.scope === 'adset') {
            items = await getAdSets(adsToken, adAccountId);
          } else if (ruleFlow.proposedRule.scope === 'ad') {
            items = await getAds(adsToken, adAccountId);
          }

          setSelectableItems(items);
        } catch (error) {
          console.error('Failed to fetch items for selection:', error);
          addMessage('assistant', '❌ Lỗi khi tải danh sách. Vui lòng thử lại.');
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchItems();
  }, [ruleFlow.stage, ruleFlow.proposedRule?.scope]);

  const campaignControl = useCampaignControlFlow(campaignCatalog, async (id, status) => {
    // Toggle handler
    // We need to call the API.
    // We can use the service `updateObjectStatus` here.
    const { updateObjectStatus } = await import('@/services/facebookInsightsService');
    const { adsToken } = getTokens(); // We need to handle this safely
    await updateObjectStatus(adsToken, id, status ? 'ACTIVE' : 'PAUSED');
  });
  // AI Features hook
  const aiFeatures = useAIFeatures();

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useSupabaseSettings();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState<string>("");
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Helper to truncate filename
  const truncateFilename = (filename: string, maxChars: number = 3) => {
    const parts = filename.split('.');
    const ext = parts.pop() || '';
    const name = parts.join('.');

    if (filename.length <= maxChars + ext.length + 4) return filename;

    return `${name.substring(0, maxChars)}...${ext}`;
  };

  // CollapsibleUserMessage component
  const CollapsibleUserMessage = ({ content }: { content: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const shouldCollapse = content.split('\n').length > 3 || content.length > 200;

    return (
      <div>
        <p className={cn(!isExpanded && shouldCollapse && "line-clamp-3 whitespace-pre-wrap")}>
          {content}
        </p>
        {shouldCollapse && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs underline mt-1 hover:text-primary-foreground/80"
          >
            {isExpanded ? "Thu gọn" : "Xem thêm"}
          </button>
        )}
      </div>
    );
  };

  // Load user profile name
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;

      try {
        const profile = await getUserProfile(user.id);
        if (profile?.full_name) {
          setUserName(profile.full_name);
        } else {
          setUserName(user.email?.split('@')[0] || "");
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        setUserName(user.email?.split('@')[0] || "");
      }
    };

    loadUserProfile();
  }, [user]);

  useEffect(() => {
    if (isResetRef.current || messages.length === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Filter upload messages when reaching reviewing_data stage
  useEffect(() => {
    if (creative.stage === 'reviewing_data') {
      setMessages(prev => prev.filter(m =>
        !m.content.includes('Media hợp lệ! Đang upload lên Facebook') &&
        !m.content.includes('Upload video thành công! Đang phân tích') &&
        !m.content.includes('Upload ảnh thành công! Đang phân tích')
      ));
    }
  }, [creative.stage]);

  // ✅ Check for pending intent from other pages (e.g. Create Rule from AdsReport)
  useEffect(() => {
    const pendingIntent = sessionStorage.getItem('pending_ai_intent');
    if (pendingIntent) {
      try {
        const intent = JSON.parse(pendingIntent);
        if (intent.type === 'CREATE_RULE') {
          // Clear intent immediately
          sessionStorage.removeItem('pending_ai_intent');

          // Start Rule Flow
          // Use a small timeout to ensure UI is ready
          setTimeout(async () => {
            addMessage('assistant', '🤖 Đang khởi tạo quy trình tạo quy tắc...');
            const result = await ruleFlow.start("Tạo quy tắc mới", []);
            addMessage('assistant', result.message);
          }, 500);
        }
      } catch (e) {
        console.error('Failed to parse pending AI intent', e);
      }
    }
  }, []);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    if (isResetRef.current) {

      return;
    }
    setMessages(prev => [...prev, { role, content }]);
  }, []);

  const getTokens = () => {
    if (settingsLoading || !settings) {
      throw new Error('⏳ Đang tải cấu hình, vui lòng đợi...');
    }

    if (!settings?.adsToken || !settings?.adAccountId) {
      throw new Error('❌ Chưa cấu hình Facebook Ads Token.\n\nVui lòng:\n1. Mở Settings (biểu tượng ⚙️)\n2. Nhập Ads Token\n3. Nhấn "Kiểm tra"\n4. Chọn tài khoản và nhấn "Lưu"\n\n💡 Token được lưu trong NocoDB.');
    }

    if (!settings?.pageToken || !settings?.pageId) {
      throw new Error('❌ Chưa cấu hình Facebook Page Token.\n\nVui lòng:\n1. Mở Settings (biểu tượng ⚙️)\n2. Nhập Page Token\n3. Nhấn "Kiểm tra"\n4. Chọn trang và nhấn "Lưu"\n\n💡 Token được lưu trong NocoDB.');
    }

    return {
      adsToken: settings.adsToken,
      pageToken: settings.pageToken,
      adAccountId: settings.adAccountId,
      pageId: settings.pageId
    };
  };

  const handleCancel = useCallback(() => {
    creative.reset();
    audience.reset();
    clone.reset();
    clone.reset();
    quickPost.reset();
    ruleFlow.reset();
    setAttachedFile(null);

    addMessage('assistant',
      '✅ Đã hủy.\n\n' +
      '💡 Anh có thể:\n' +
      '• Gửi thông tin chiến dịch mới\n' +
      '• Hỏi em về báo cáo quảng cáo\n' +
      '• Tạo đối tượng mới\n\n' +
      'Em sẵn sàng hỗ trợ anh nhé! 😊'
    );
  }, [creative, audience, clone, quickPost, addMessage]);

  // Helper: Format campaign list
  const formatCampaignList = (items: any[]) => {
    const formatNum = (n: number) => {
      if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
      if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
      return n.toFixed(0);
    };

    return `📋 **Danh sách chiến dịch** (${items.length} chiến dịch)\n\n` +
      items.slice(0, 10).map((item, i) =>
        `**${i + 1}. ${item.name}**\n` +
        `   💰 ${formatNum(item.spend)} VNĐ | 🎯 ${item.results} ${item.result_label || 'kết quả'}`
      ).join('\n\n') +
      (items.length > 10 ? `\n\n_...và ${items.length - 10} chiến dịch khác_` : '') +
      `\n\n💡 **Cách chọn:** Nhập số (\`1\`) hoặc tên chiến dịch`;
  };

  const formatSelectedCampaign = (item: any) => {
    return `✅ **Đã chọn chiến dịch** 📢 ${item.name}`;
  };

  const handleQuickReply = async (text: string) => {
    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const result = await ruleFlow.handleInput(text);
      addMessage('assistant', result.message);
    } catch (error: any) {
      addMessage('assistant', `❌ Lỗi: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    console.log('[TRACE_QUICK_POST] AIChatPanel handleSend:', message);
    if ((!message.trim() && !attachedFile) || isLoading) return;



    abortControllerRef.current = new AbortController();

    const userMessage = message.trim();
    const currentAttachedFile = attachedFile;

    // Display user message + file indicator
    let displayContent = userMessage;
    if (currentAttachedFile) {
      const fileType = currentAttachedFile.type.startsWith('image/') ? '🖼️' : '🎥';
      const truncatedName = truncateFilename(currentAttachedFile.name);
      displayContent = displayContent
        ? `${displayContent}\n\n[${fileType} ${truncatedName}]`
        : `[${fileType} ${truncatedName}]`;
    }

    const userMsg: Message = { role: "user", content: displayContent };
    setMessages(prev => [...prev, userMsg]);
    setMessage("");
    setAttachedFile(null);
    setIsLoading(true);

    try {
      // Media validation helper (used by creative flow)
      const validateMediaFile = (file: File): { valid: boolean; error?: string } => {
        const maxImageSize = 20 * 1024 * 1024; // 20MB
        const maxVideoSize = 1024 * 1024 * 1024; // 1GB

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
          return { valid: false, error: '❌ Chỉ hỗ trợ file ảnh (JPG, PNG) hoặc video (MP4)!' };
        }

        if (isImage && file.size > maxImageSize) {
          return { valid: false, error: `❌ Ảnh quá lớn! Tối đa 20MB (file này: ${(file.size / 1024 / 1024).toFixed(2)}MB)` };
        }

        if (isVideo && file.size > maxVideoSize) {
          return { valid: false, error: `❌ Video quá lớn! Tối đa 1GB (file này: ${(file.size / 1024 / 1024).toFixed(2)}MB)` };
        }

        return { valid: true };
      };

      // === PRIORITY 0: Campaign Control Flow ===
      if (campaignControl.state.stage !== 'idle') {
        if (campaignControl.state.stage === 'confirming') {
          // Handle confirmation text (Yes/No) if user types instead of clicking
          // But we have UI cards for this.
          // If user types "ok" or "yes", we can handle it.
          if (userMessage.toLowerCase().includes('ok') || userMessage.toLowerCase().includes('có') || userMessage.toLowerCase().includes('yes')) {
            if (campaignControl.state.targetAction && campaignControl.state.foundCampaigns.length === 1) {
              const campaign = campaignControl.state.foundCampaigns[0];
              await campaignControl.handleToggleAction(campaign.id, campaignControl.state.targetAction);
              addMessage('assistant', `✅ Đã ${campaignControl.state.targetAction === 'PAUSE' ? 'tắt' : 'bật'} chiến dịch "${campaign.name}" thành công!`);
              campaignControl.reset();
            }
          } else if (userMessage.toLowerCase().includes('hủy') || userMessage.toLowerCase().includes('no') || userMessage.toLowerCase().includes('không')) {
            addMessage('assistant', 'Đã hủy thao tác.');
            campaignControl.reset();
          }
          setIsLoading(false);
          return;
        }
      }

      // === PRIORITY 0.5: Rule Flow ===
      // Check for Rule Intent (PRIORITY OVER EXISTING FLOW if it's a clear start command)
      const ruleIntent = parseRuleIntent(userMessage);
      if (ruleIntent.type === 'CREATE_RULE') {
        addMessage('assistant', '🤖 Đang khởi tạo quy trình tạo quy tắc...');

        // Reset all flows to ensure clean state
        creative.reset();
        audience.reset();
        clone.reset();
        quickPost.reset();
        ruleFlow.reset();

        // Use a small timeout to ensure state update if needed, though start() should handle it
        const result = await ruleFlow.start(userMessage, messages);
        addMessage('assistant', result.message);
        setIsLoading(false);
        return;
      }

      if (ruleFlow.stage !== 'idle') {
        if (ruleFlow.stage === 'confirming') {
          if (userMessage.toLowerCase().includes('ok') || userMessage.toLowerCase().includes('có') || userMessage.toLowerCase().includes('yes') || userMessage.toLowerCase().includes('xác nhận')) {
            addMessage('assistant', '⏳ Đang lưu quy tắc...');
            const success = await ruleFlow.confirmAndCreate();
            // confirmAndCreate handles toast and lastMessage
            // We just need to ensure UI updates
            setIsLoading(false);
            return;
          } else if (userMessage.toLowerCase().includes('hủy') || userMessage.toLowerCase().includes('no') || userMessage.toLowerCase().includes('không')) {
            addMessage('assistant', 'Đã hủy tạo quy tắc.');
            ruleFlow.reset();
            setIsLoading(false);
            return;
          }
        } else {
          // Handle other stages (naming, defining_logic, defining_scope)
          const result = await ruleFlow.handleInput(userMessage);
          addMessage('assistant', result.message);
          setIsLoading(false);
          return;
        }
      }

      // Check for Rule Intent (if not in other flows)
      if (creative.stage === 'idle' && audience.stage === 'idle' && clone.stage === 'idle' && quickPost.stage === 'idle' && ruleFlow.stage === 'idle') {
        const ruleIntent = parseRuleIntent(userMessage);
        if (ruleIntent.type === 'CREATE_RULE') {
          addMessage('assistant', '🤖 Đang phân tích yêu cầu tạo quy tắc...');
          const result = await ruleFlow.start(userMessage, messages);
          addMessage('assistant', result.message);
          setIsLoading(false);
          return;
        }
      }

      // Check for Campaign Control Intent (if not in other flows)
      if (creative.stage === 'idle' && audience.stage === 'idle' && clone.stage === 'idle' && quickPost.stage === 'idle') {
        const detectedIntent = parseCampaignIntent(userMessage);
        if (detectedIntent.type !== 'UNKNOWN') {

          // Optimization: Try to use cached catalog from AdsReportAuto first
          let currentCatalog = campaignCatalog;
          let campaignsToUse: any[] = [];

          // 1. Try to get from cache
          const cachedCatalogJson = localStorage.getItem('cached_campaign_catalog');
          if (cachedCatalogJson) {
            try {
              campaignsToUse = JSON.parse(cachedCatalogJson);
              console.log('[AIChatPanel] Using cached catalog:', campaignsToUse.length);
            } catch (e) {
              console.error('[AIChatPanel] Failed to parse cached catalog', e);
            }
          }

          // 2. If no cache, fetch fresh (fallback)
          if (campaignsToUse.length === 0) {
            try {
              const { getCampaigns } = await import('@/services/facebookInsightsService');
              const { adsToken, adAccountId } = getTokens();

              if (!adsToken || !adAccountId) {
                addMessage('assistant', '⚠️ Lỗi: Không tìm thấy thông tin tài khoản quảng cáo.');
                setIsLoading(false);
                return;
              }

              campaignsToUse = await getCampaigns(adsToken, adAccountId);
              // Update cache
              localStorage.setItem('cached_campaign_catalog', JSON.stringify(campaignsToUse));
            } catch (e) {
              console.error('[AIChatPanel] Failed to fetch campaigns', e);
              addMessage('assistant', '⚠️ Lỗi: Không thể tải danh sách chiến dịch.');
              setIsLoading(false);
              return;
            }
          }



          // 3. Fetch Insights from NocoDB (Today)
          try {
            const { adAccountId } = getTokens();
            if (user?.id && adAccountId) {
              // Fetch today's insights using the same service as Ads Report
              const today = new Date();
              const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

              const insights = await getInsightsByUserAndDate(user.id, todayStr, todayStr, adAccountId);

              // Merge insights into campaigns
              campaignsToUse = campaignsToUse.map(c => {
                const insight = insights.find(i => String(i.campaign_id) === String(c.id));
                if (insight) {
                  // STRICTLY prioritize Messaging metrics (Started 7d) as requested by user
                  // "onsite_conversion.messaging_conversation_started_7d"
                  const results = insight.started_7d ?? insight.results_messaging_replied_7d ?? 0;

                  // Use the specific Cost per Started 7d metric
                  const costPerResult = insight.cost_per_started_7d ?? insight.cost_per_messaging_replied_7d ?? 0;

                  return {
                    ...c,
                    spend: insight.spend || 0,
                    results: results,
                    cost_per_result: costPerResult
                  };
                }
                // If no insight found for today, metrics are 0
                return {
                  ...c,
                  spend: 0,
                  results: 0,
                  cost_per_result: 0
                };
              });
            }
          } catch (e) {
            console.error('[AIChatPanel] Failed to fetch insights from NocoDB', e);
          }

          // 4. Merge with local toggles (rowStatuses) to ensure latest status
          const savedStatuses = localStorage.getItem('ads_report_row_statuses');
          const localStatuses = savedStatuses ? JSON.parse(savedStatuses) : {};

          const mergedCampaigns = campaignsToUse.map((c: any) => {
            if (localStatuses[c.id] !== undefined) {
              const isActive = localStatuses[c.id];
              // Override effective_status based on local toggle
              if (isActive && c.effective_status === 'PAUSED') return { ...c, effective_status: 'ACTIVE' };
              if (!isActive && c.effective_status === 'ACTIVE') return { ...c, effective_status: 'PAUSED' };
            }
            return c;
          });

          setCampaignCatalog(mergedCampaigns);
          currentCatalog = mergedCampaigns;

          const handled = await campaignControl.start(userMessage, currentCatalog);
          if (handled) {
            setIsLoading(false);
            return;
          }
        }
      }

      // === PRIORITY 1: Check if any hook is active ===

      // Quick Post Flow
      if (quickPost.stage !== 'idle') {
        console.log('[TRACE_QUICK_POST] AIChatPanel in QuickPost flow, stage:', quickPost.stage);

        if (quickPost.stage === 'confirming') {
          if (userMessage.toLowerCase().includes('ok') || userMessage.toLowerCase().includes('xác nhận')) {
            const tokens = getTokens();
            addMessage('assistant', '⏳ Đang tạo quick post campaign...');

            const result = await quickPost.confirmAndCreate(tokens);
            if (result) {
              addMessage('assistant',
                `✅ Tạo thành công!\n\n` +
                `📊 Campaign ID: ${result.campaignId}\n` +
                `🎯 Ad Set ID: ${result.adSetId}\n` +
                `📢 Ad ID: ${result.adId}\n\n` +
                `Kiểm tra trong Facebook Ads Manager nhé!`
              );
            }
            setIsLoading(false);
            return;
          } else {
            addMessage('assistant', '⚠️ Vui lòng nhập "ok" hoặc "xác nhận" để tạo campaign.');
            setIsLoading(false);
            return;
          }
        } else {
          // Handle input for other stages
          const { message: nextMsg } = await quickPost.handleInput(userMessage);
          addMessage('assistant', nextMsg);
          setIsLoading(false);
          return;
        }
      }

      // Creative Flow
      if (creative.stage !== 'idle') {


        if (creative.stage === 'awaiting_radius') {
          const result = await creative.handleRadiusInput(userMessage);
          if (result.success) {
            addMessage('assistant', result.message);
          } else {
            addMessage('assistant', `❌ ${result.message}`);
          }
          setIsLoading(false);
          return;
        }


        if (creative.stage === 'awaiting_media' && currentAttachedFile) {
          const { adsToken, adAccountId } = getTokens();

          addMessage('assistant', '⏳ Đang upload file...');

          const uploadResult = await creative.uploadMedia(currentAttachedFile, adAccountId, adsToken);
          if (uploadResult.success) {
            addMessage('assistant', uploadResult.message);
          } else {
            addMessage('assistant', `❌ ${uploadResult.message}`);
          }
          setIsLoading(false);
          return;
        }

        if (creative.stage === 'confirming') {
          if (userMessage.toLowerCase().includes('ok') || userMessage.toLowerCase().includes('xác nhận')) {
            const { adsToken, pageToken, adAccountId, pageId } = getTokens();
            addMessage('assistant', '⏳ Đang tạo campaign...');

            const result = await creative.confirmAndCreate(
              user!.id,
              adsToken,
              pageToken,
              adAccountId,
              pageId
            );

            if (result.success && result.ids) {
              addMessage('assistant',
                `✅ Tạo thành công!\n\n` +
                `📊 Campaign ID: ${result.ids.campaignId}\n` +
                `🎯 Ad Set ID: ${result.ids.adSetId}\n` +
                `📢 Ad ID: ${result.ids.adId}\n\n` +
                `Kiểm tra trong Facebook Ads Manager nhé!`
              );
            } else {
              addMessage('assistant', result.message);
            }
            setIsLoading(false);
            return;
          }
        }
      }

      // Audience Flow
      if (audience.stage !== 'idle') {


        if (audience.stage === 'selecting_type') {
          // User should select type via buttons, but handle text input
          const lowerMsg = userMessage.toLowerCase();
          if (lowerMsg.includes('file') || lowerMsg.includes('danh sách')) {
            audience.selectType('phone_numbers');
            addMessage('assistant', '📋 Vui lòng cung cấp tên đối tượng:');
          } else if (lowerMsg.includes('messenger') || lowerMsg.includes('tin nhắn')) {
            audience.selectType('page_messenger');
            addMessage('assistant', '📋 Vui lòng cung cấp tên đối tượng:');
          } else if (lowerMsg.includes('lookalike') || lowerMsg.includes('tương tự')) {
            audience.selectType('lookalike');
            addMessage('assistant', '📋 Vui lòng cung cấp tên đối tượng:');
          } else {
            addMessage('assistant', '⚠️ Vui lòng chọn loại audience bằng nút bên dưới.');
          }
          setIsLoading(false);
          return;
        }

        // Phone numbers: collecting name
        if (audience.stage === 'collecting_file') {
          audience.setData({ audienceName: userMessage });
          addMessage('assistant', '📄 Vui lòng upload file CSV chứa số điện thoại.');
          setIsLoading(false);
          return;
        }

        // Messenger: collecting name
        if (audience.stage === 'collecting_messenger_name') {
          audience.setData({ audienceName: userMessage });

          // Load pages
          try {
            const pages = await getAllPages(user!.id);
            const activePages = pages.filter(p => p.is_active);

            if (activePages.length === 0) {
              addMessage('assistant', '⚠️ Không tìm thấy Page nào. Vui lòng kết nối Page trong Settings trước ạ.');
              audience.reset();
            } else {
              audience.setData({ availablePages: activePages });
              audience.setStage('collecting_messenger_page');
              addMessage('assistant', '📄 Vui lòng chọn Page muốn lấy người nhắn tin:');
            }
          } catch (error) {
            addMessage('assistant', '❌ Lỗi khi tải danh sách Page. Vui lòng thử lại.');
            audience.reset();
          }

          setIsLoading(false);
          return;
        }

        // Messenger: collecting retention days
        if (audience.stage === 'collecting_messenger_days') {
          const days = parseInt(userMessage.trim());

          if (isNaN(days) || days < 1 || days > 365) {
            addMessage('assistant', '⚠️ Vui lòng nhập số ngày hợp lệ từ 1 đến 365 ạ.\n\nVí dụ: 30, 90, hoặc 365');
            setIsLoading(false);
            return;
          }

          audience.setData({ retentionDays: days });

          addMessage('assistant',
            `✅ Đã đủ thông tin!\n\n` +
            `📋 Tên: ${audience.data?.audienceName}\n` +
            `📄 Page: ${audience.data?.pageName}\n` +
            `📅 Số ngày: ${days} ngày\n\n` +
            `Anh xác nhận tạo đối tượng này không?`
          );

          setIsLoading(false);
          return;
        }

        // Lookalike: AI-powered flow
        if (audience.stage === 'collecting_lookalike') {
          // CRITICAL FIX: If we don't have audienceName yet and user just sent text, use it as name
          if (!audience.data?.audienceName && userMessage.trim().length > 0) {

            audience.setData({ audienceName: userMessage.trim() });

            // Ask for next missing field
            const validation = validateAudienceData('lookalike', { ...audience.data, audienceName: userMessage.trim() });

            if (validation.needsMoreInfo) {
              if (validation.missingField === 'sourceId') {
                // Load custom audiences for user selection
                const { adsToken, adAccountId } = getTokens();
                try {
                  const audiences = await getCustomAudiences(adAccountId, adsToken);

                  if (audiences.length === 0) {
                    addMessage('assistant', '⚠️ Không tìm thấy đối tượng nguồn nào. Vui lòng tạo Custom Audience trước ạ.');
                    audience.reset();
                  } else {
                    audience.setData({ availableAudiences: audiences });
                    addMessage('assistant', validation.missingFieldPrompt!);
                  }
                } catch (error) {
                  addMessage('assistant', '❌ Lỗi khi tải danh sách đối tượng. Vui lòng thử lại.');
                  audience.reset();
                }
              } else if (validation.missingField === 'country') {
                audience.setData({ showCountryButtons: true });
                addMessage('assistant', validation.missingFieldPrompt!);
              } else if (validation.missingField === 'ratio') {
                audience.setData({ showRatioButtons: true });
                addMessage('assistant', validation.missingFieldPrompt!);
              } else {
                addMessage('assistant', validation.missingFieldPrompt!);
              }
            }

            setIsLoading(false);
            return;
          }

          // Step 1: AI Parse user input for other fields (ratio, country, etc.)
          const parsed = await parseAudienceInput(
            userMessage,
            audience.stage,
            audience.data
          );

          // FALLBACK: Manually parse ratio if AI missed it (common for short inputs like "1%")
          if (!parsed.ratio && audience.data?.country && audience.data?.sourceId) {
            const ratioMatch = userMessage.match(/(\d+)/);
            if (ratioMatch) {
              const ratio = parseInt(ratioMatch[1]);
              if (ratio >= 1 && ratio <= 20) {
                parsed.ratio = ratio;
              }
            }
          }

          // Merge parsed data with current data (only non-null values to preserve existing data)
          const updatedData = {
            ...audience.data,
            ...Object.fromEntries(
              Object.entries(parsed).filter(([_, value]) => value !== null && value !== undefined)
            )
          };

          audience.setData(updatedData);

          // Step 2: Validate data
          const validation = validateAudienceData('lookalike', updatedData);


          if (validation.needsMoreInfo) {
            // Missing information
            if (validation.missingField === 'sourceId') {
              // Load custom audiences for user selection
              const { adsToken, adAccountId } = getTokens();
              try {
                const audiences = await getCustomAudiences(adAccountId, adsToken);

                if (audiences.length === 0) {
                  addMessage('assistant', '⚠️ Không tìm thấy đối tượng nguồn nào. Vui lòng tạo Custom Audience trước ạ.');
                  audience.reset();
                } else {
                  audience.setData({ availableAudiences: audiences });
                  addMessage('assistant', validation.missingFieldPrompt!);
                }
              } catch (error) {
                addMessage('assistant', '❌ Lỗi khi tải danh sách đối tượng. Vui lòng thử lại.');
                audience.reset();
              }
            } else if (validation.missingField === 'country') {
              // Show country selection prompt
              audience.setData({ showCountryButtons: true });
              addMessage('assistant', validation.missingFieldPrompt!);
            } else if (validation.missingField === 'ratio') {
              // Show ratio selection buttons
              audience.setData({ showRatioButtons: true });
              addMessage('assistant', validation.missingFieldPrompt!);
            } else {
              // Missing name - just prompt
              addMessage('assistant', validation.missingFieldPrompt!);
            }
          } else {
            // All data collected - show confirmation

            addMessage('assistant',
              `✅ Đã đủ thông tin!\n\n` +
              `📋 Tên: ${updatedData.audienceName}\n` +
              `🎯 Nguồn: ${updatedData.sourceName}\n` +
              `🌍 Quốc gia: ${updatedData.countryName}\n` +
              `📊 Tỷ lệ: ${updatedData.ratio}%\n\n` +
              `Anh xác nhận tạo đối tượng Lookalike này không?`
            );
            audience.setData({ showConfirmButtons: true });
          }

          setIsLoading(false);
          return;
        }

        if (audience.stage === 'creating') {
          const { adsToken, adAccountId } = getTokens();
          addMessage('assistant', '⏳ Đang tạo audience...');

          const result = await audience.createAudience(adAccountId, adsToken);
          addMessage('assistant', result.message);
          setIsLoading(false);
          return;
        }
      }

      // ===== CLONE FLOW: Handle different stages =====

      // Stage 1: Awaiting confirmation - handled by CloneConfirmIntentButtons component
      // No text input needed, user clicks buttons

      // Stage 2: Awaiting list choice
      if (clone.stage === 'awaiting_list_choice') {
        const lowerMsg = userMessage.toLowerCase();
        if (lowerMsg.includes('1') || lowerMsg.includes('danh sách') || lowerMsg.includes('hiển thị')) {
          clone.chooseListOption();
          const { adsToken, adAccountId } = getTokens();
          const result = await clone.fetchCampaignsForListing(user!.id, adAccountId, adsToken);

          if (result.success && result.items && result.items.length > 0) {
            // Don't add text message - CampaignSelector component will handle display
            addMessage('assistant', '📋 Vui lòng chọn chiến dịch từ danh sách bên dưới:');
          } else {
            addMessage('assistant', '⚠️ Không tìm thấy chiến dịch nào.');
            clone.reset();
          }
        } else if (lowerMsg.includes('2') || lowerMsg.includes('tìm') || lowerMsg.includes('search')) {
          clone.chooseSearchOption();
          addMessage('assistant', '🔍 Vui lòng nhập tên chiến dịch hoặc từ khóa để tìm kiếm:');
        } else {
          addMessage('assistant', '⚠️ Vui lòng chọn 1 hoặc 2');
        }
        setIsLoading(false);
        return;
      }

      // Stage 3: Awaiting campaign selection - handled by CampaignSelector component
      // User interaction happens through the UI component, not text input

      // Stage 4: Selecting type - handled by CloneTypeSelector component
      // User clicks buttons instead of typing

      // Stage 5: Awaiting child selection
      if (clone.stage === 'awaiting_child_selection' && clone.childItems.length > 0) {
        const numberMatch = userMessage.match(/(\d+)/);

        if (numberMatch) {
          const index = parseInt(numberMatch[1]) - 1;
          const result = clone.selectChildByIndex(index);

          if (result.success) {
            const typeLabel = clone.selectedType === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo';
            addMessage('assistant',
              `✅ Đã chọn ${typeLabel}: **${result.item.name}**\n\n` +
              `📝 Bạn muốn đặt tên mới cho ${typeLabel} nhân bản là gì?`
            );
          } else {
            addMessage('assistant', '❌ Số thứ tự không hợp lệ. Vui lòng thử lại.');
          }
        } else {
          addMessage('assistant', '⚠️ Vui lòng nhập số thứ tự (VD: `1`, `2`)');
        }
        setIsLoading(false);
        return;
      }

      // Stage 6: Awaiting name
      if (clone.stage === 'awaiting_name') {
        const name = userMessage.trim();

        if (name.length === 0) {
          addMessage('assistant', '⚠️ Tên không được để trống. Vui lòng nhập lại:');
          setIsLoading(false);
          return;
        }

        if (name.length > 100) {
          addMessage('assistant', '⚠️ Tên quá dài (tối đa 100 ký tự). Vui lòng nhập lại:');
          setIsLoading(false);
          return;
        }

        clone.setNewName(name);
        clone.proceedToAwaitingQuantity();

        const typeLabel = clone.selectedType === 'campaign' ? 'chiến dịch' :
          clone.selectedType === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo';

        addMessage('assistant',
          `✅ Tên mới: **${name}**\n\n` +
          `🔢 Bạn muốn nhân bản bao nhiêu ${typeLabel}? (Nhập số từ 1-50)`
        );

        setIsLoading(false);
        return;
      }

      // Stage 7: Awaiting quantity
      if (clone.stage === 'awaiting_quantity') {
        const quantityMatch = userMessage.match(/(\d+)/);

        if (!quantityMatch) {
          addMessage('assistant', '⚠️ Vui lòng nhập số lượng (VD: 3, 5, 10):');
          setIsLoading(false);
          return;
        }

        const quantity = parseInt(quantityMatch[1]);

        if (quantity < 1 || quantity > 50) {
          addMessage('assistant', '⚠️ Số lượng phải từ 1 đến 50. Vui lòng nhập lại:');
          setIsLoading(false);
          return;
        }

        clone.setQuantities({
          campaigns: clone.selectedType === 'campaign' ? quantity : 1,
          adsets: clone.selectedType === 'adset' ? quantity : 1,
          ads: clone.selectedType === 'ad' ? quantity : 1
        });

        clone.proceedToConfirming();
        setIsLoading(false);
        return;
      }

      // Stage 7: Confirming - handled by CloneConfirmCard buttons, no text input needed

      // === PRIORITY 2: Check settings loaded ===
      if (settingsLoading) {
        addMessage('assistant', '⏳ Đang tải cấu hình từ NocoDB, vui lòng đợi một chút rồi thử lại nhé...');
        setIsLoading(false);
        return;
      }

      // === PRIORITY 3: Detect intent for new flows ===

      // Detect Facebook post link for Quick Post flow (comprehensive regex)
      const FB_LINK_REGEX = /https?:\/\/(?:www\.)?(?:m\.)?(?:business\.)?(?:l\.)?(?:lm\.)?(?:facebook\.com|fb\.com|fb\.watch)\/(?:(?:share\/[pv]\/)|(?:watch\/\?v=)|(?:story\.php)|(?:permalink\.php)|(?:photo\.php)|(?:posts\/)|(?:videos\/)|(?:reel\/)|(?:.*?(?:pfbid|fbid)=))[^\s)]+/i;
      const hasFacebookLink = FB_LINK_REGEX.test(userMessage);

      if (hasFacebookLink && quickPost.stage === 'idle') {
        if (!aiFeatures.canUseQuickPost) {
          addMessage('assistant',
            '⚠️ Tính năng "Quick Post" chưa được kích hoạt cho tài khoản của anh.\n\n' +
            'Vui lòng liên hệ quản trị viên để được hỗ trợ kích hoạt tính năng này.'
          );
          setIsLoading(false);
          return;
        }



        const tokens = getTokens();

        try {
          // ✅ Show simple loading message
          addMessage('assistant',
            'Em đang xử lý bài viết, anh đợi xử lý ạ.\n\n' +
            '⏱️ Vui lòng đợi 5-10 giây...'
          );

          const { message: resultMsg, stage: resultStage } = await quickPost.start(userMessage, tokens);

          // ✅ Only add message to chat if it's not the confirm card placeholder
          if (resultMsg !== '__SHOW_CONFIRM_CARD__') {
            setMessages(prev => {
              const filtered = prev.filter(m => !m.content.includes('⏳ **Đang xử lý'));
              return [...filtered, { role: 'assistant', content: resultMsg }];
            });
          }
        } catch (error) {
          // ✅ Replace loading message with error
          setMessages(prev => {
            const filtered = prev.filter(m => !m.content.includes('⏳ **Đang xử lý'));
            return [...filtered, {
              role: 'assistant',
              content: `❌ **Lỗi xử lý bài viết:**\n\n${error instanceof Error ? error.message : 'Lỗi không xác định'}\n\n**Vui lòng kiểm tra:**\n• Link bài viết có công khai không?\n• Tokens Facebook còn hợp lệ không?\n• NocoDB API có hoạt động không?`
            }];
          });
        } finally {
          setIsLoading(false);
        }

        return;
      }

      // ===== SEQUENTIAL VALIDATION: File + Text =====
      const hasFile = !!currentAttachedFile;
      const hasText = userMessage.trim().length > 0;

      if (hasFile && hasText) {


        // Check feature permission first
        if (!aiFeatures.canUseCreativeCampaign) {
          addMessage('assistant',
            '⚠️ Tính năng "Creative Campaign" chưa được kích hoạt cho tài khoản của anh.\n\n' +
            'Vui lòng liên hệ quản trị viên để được hỗ trợ kích hoạt tính năng này.'
          );
          removeAttachedFile();
          setIsLoading(false);
          return;
        }

        // Step 1: Detect intent
        addMessage('assistant', '🔍 Đang phát hiện ý định...');
        const intent = await detectChatIntent(userMessage, messages);
        console.log('[TRACE_QUICK_POST] Intent detected:', intent);

        if (intent.intent !== 'create_creative_campaign') {
          setMessages(prev => prev.filter(m => !m.content.includes('🔍 Đang phát hiện')));
          addMessage('assistant', '❌ Em không hiểu rõ ý định. Anh có muốn tạo chiến dịch quảng cáo không?\n\nVui lòng mô tả rõ hơn nhé!');
          setIsLoading(false);
          return;
        }

        // Step 2: Validate media
        setMessages(prev => prev.filter(m => !m.content.includes('🔍 Đang phát hiện')));
        addMessage('assistant', '✅ Đã phát hiện! Đang kiểm tra media...');

        const mediaValidation = validateMediaFile(currentAttachedFile);
        if (!mediaValidation.valid) {
          setMessages(prev => prev.filter(m => !m.content.includes('Đang kiểm tra media')));
          addMessage('assistant', mediaValidation.error!);
          removeAttachedFile();
          setIsLoading(false);
          return;
        }

        // Step 3: Upload media
        setMessages(prev => prev.filter(m => !m.content.includes('Đang kiểm tra media')));
        addMessage('assistant', '✅ Media hợp lệ! Đang upload lên Facebook...');

        const { adsToken, adAccountId } = getTokens();
        const uploadResult = await creative.uploadMedia(currentAttachedFile, adAccountId, adsToken);

        if (!uploadResult.success) {
          setMessages(prev => prev.filter(m => !m.content.includes('Đang upload')));
          addMessage('assistant', `❌ Upload thất bại: ${uploadResult.message}`);
          removeAttachedFile();
          setIsLoading(false);
          return;
        }

        // Step 4: Parse text (after media uploaded)
        setMessages(prev => prev.filter(m => !m.content.includes('Đang upload')));

        if (uploadResult.videoId) {
          addMessage('assistant', '✅ Upload video thành công! Đang phân tích thông tin chiến dịch...');
        } else {
          addMessage('assistant', '✅ Upload ảnh thành công! Đang phân tích thông tin chiến dịch...');
          removeAttachedFile(); // ✅ Images can be removed now
        }

        // ✅ Pass flag that media is already uploaded
        const parseResult = await creative.start(
          userMessage,
          adsToken,
          false // Always false, we'll handle media separately
        );

        // ✅ Clean up loading messages
        setMessages(prev => prev.filter(m => !m.content.includes('Đang phân tích')));

        if (parseResult.success) {
          // ✅ Display confirm card (stage is now 'reviewing_data')
          if (parseResult.message !== '__SHOW_CREATIVE_CONFIRM_CARD__') {
            addMessage('assistant', parseResult.message);
          }
        } else {
          addMessage('assistant', `❌ ${parseResult.message}`);
          if (uploadResult.videoId) {
            removeAttachedFile(); // ✅ Remove video on parse error
          }
        }

        setIsLoading(false);
        return;
      }

      // ===== CASE: File only, no text =====
      if (hasFile && !hasText) {
        addMessage('assistant',
          '📋 Em đã nhận được media rồi ạ! Anh vui lòng cung cấp thông tin chiến dịch:\n\n' +
          '1. Tên chiến dịch\n' +
          '2. Độ tuổi (VD: 20-40)\n' +
          '3. Giới tính (Nam/Nữ/Tất cả)\n' +
          '4. Ngân sách hàng ngày (VD: 400k)\n' +
          '5. Vị trí (tọa độ + bán kính)\n' +
          '6. Sở thích\n' +
          '7. Nội dung content\n' +
          '8. Tiêu đề\n' +
          '9. Mẫu chào hỏi (tùy chọn)'
        );
        setIsLoading(false);
        return;
      }

      // ===== CASE: Text only, no file (existing AI chat logic) =====
      const intent = await detectChatIntent(userMessage, messages);


      if (intent.intent === 'create_quick_campaign' && quickPost.stage === 'idle') {
        if (!aiFeatures.canUseQuickPost) {
          addMessage('assistant',
            '⚠️ Tính năng "Quick Post" chưa được kích hoạt cho tài khoản của anh.\n\n' +
            'Vui lòng liên hệ quản trị viên để được hỗ trợ kích hoạt tính năng này.'
          );
          setIsLoading(false);
          return;
        }



        const tokens = getTokens();

        try {
          addMessage('assistant',
            'Em đang xử lý bài viết, anh đợi xử lý ạ.\n\n' +
            '⏱️ Vui lòng đợi 5-10 giây...'
          );

          const { message: resultMsg } = await quickPost.start(userMessage, tokens);

          if (resultMsg !== '__SHOW_CONFIRM_CARD__') {
            setMessages(prev => {
              const filtered = prev.filter(m => !m.content.includes('⏳ **Đang xử lý'));
              return [...filtered, { role: 'assistant', content: resultMsg }];
            });
          }
        } catch (error) {
          setMessages(prev => {
            const filtered = prev.filter(m => !m.content.includes('⏳ **Đang xử lý'));
            return [...filtered, {
              role: 'assistant',
              content: `❌ **Lỗi xử lý bài viết:**\n\n${error instanceof Error ? error.message : 'Lỗi không xác định'}\n\n**Vui lòng kiểm tra:**\n• Link bài viết có công khai không?\n• Tokens Facebook còn hợp lệ không?\n• NocoDB API có hoạt động không?`
            }];
          });
        } finally {
          setIsLoading(false);
        }
        return;
      }

      if (intent.intent === 'create_creative_campaign' && creative.stage === 'idle') {
        if (!aiFeatures.canUseCreativeCampaign) {
          addMessage('assistant',
            '⚠️ Tính năng "Creative Campaign" chưa được kích hoạt cho tài khoản của anh.\n\n' +
            'Vui lòng liên hệ quản trị viên để được hỗ trợ kích hoạt tính năng này.'
          );
          setIsLoading(false);
          return;
        }
        const { adsToken } = getTokens();
        const result = await creative.start(userMessage, adsToken);
        addMessage('assistant', result.message);
        setIsLoading(false);
        return;
      }

      if (intent.intent === 'create_audience' && audience.stage === 'idle') {
        if (!aiFeatures.canUseAudienceCreator) {
          addMessage('assistant',
            '⚠️ Tính năng "Audience Creator" chưa được kích hoạt cho tài khoản của anh.\n\n' +
            'Vui lòng liên hệ quản trị viên để được hỗ trợ kích hoạt tính năng này.'
          );
          setIsLoading(false);
          return;
        }
        audience.start();
        addMessage('assistant',
          '🎯 Anh muốn tạo loại đối tượng nào?'
        );
        setIsLoading(false);
        return;
      }

      // ========== 🎯 CLONE CAMPAIGN FLOW ==========
      if (intent.intent === 'clone_campaign' && clone.stage === 'idle') {
        if (!aiFeatures.canUseCloneTool) {
          addMessage('assistant',
            '⚠️ Tính năng "Clone Tool" chưa được kích hoạt cho tài khoản của anh.\n\n' +
            'Vui lòng liên hệ quản trị viên để được hỗ trợ kích hoạt tính năng này.'
          );
          setIsLoading(false);
          return;
        }



        // Start confirmation flow - don't add text message, show buttons instead
        clone.start();
        setIsLoading(false);
        return;
      }


      // General chat

      // ✅ Check if adAccountId is available
      if (!settings?.adAccountId) {
        addMessage('assistant', '⚠️ Vui lòng chọn **Tài khoản quảng cáo** trong phần Cài đặt (Settings) để bắt đầu chat.');
        setIsLoading(false);
        return;
      }

      let assistantMsg = "";
      await streamAIChat({
        messages: [...messages, { role: "user", content: userMessage }],
        accountId: settings?.adAccountId,
        userName,
        onDelta: (delta) => {
          assistantMsg += delta;
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.role === 'assistant' && !lastMsg.content.startsWith('⏳')) {
              return [...prev.slice(0, -1), { role: 'assistant', content: assistantMsg }];
            }
            return [...prev, { role: 'assistant', content: assistantMsg }];
          });
        },
        onDone: () => {
          setIsLoading(false);
        },
        onError: (error) => {
          addMessage('assistant', `❌ Lỗi: ${error}`);
          setIsLoading(false);
        }
      });

    } catch (error: any) {
      console.error('[handleSend] Error:', error);
      addMessage('assistant', `❌ Lỗi: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleResetChat = useCallback(() => {


    isResetRef.current = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    creative.reset();
    audience.reset();
    clone.reset();
    quickPost.reset();
    campaignControl.reset();
    ruleFlow.reset();

    setMessages([]);
    setMessage("");
    setAttachedFile(null);
    setIsLoading(false);

    setTimeout(() => {
      isResetRef.current = false;
    }, 100);

    toast({ title: "✅ Đã xóa", description: "Cuộc trò chuyện đã được xóa" });
  }, [creative, audience, clone, quickPost, toast]);

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      toast({ title: "📎 Đã đính kèm", description: file.name });
    }
    e.target.value = '';
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    toast({ title: "✅ Đã xóa", description: "File đính kèm đã được xóa" });
  };

  const isAnyFlowActive = creative.isActive || audience.isActive || clone.isActive || quickPost.stage !== 'idle';

  return (
    <div className={cn(
      "flex flex-col bg-card border border-border rounded-xl shadow-sm h-full",
      fullWidth ? "w-full" : "max-w-2xl mx-auto"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">AI Assistant</h2>
            <p className="text-xs text-muted-foreground">
              {isAnyFlowActive ? '🟢 Đang xử lý...' : 'Sẵn sàng hỗ trợ'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAnyFlowActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 px-3"
            >
              <X className="h-4 w-4 mr-1" />
              Hủy
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetChat}
            className="h-8 px-3"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Xóa
          </Button>
        </div>
      </div>

      {/* Messages + Actions Container - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 inline-block">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">
                  Xin chào {userName || 'bạn'}! 👋
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Em có thể giúp anh tạo chiến dịch, đối tượng, hoặc trả lời câu hỏi về quảng cáo
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          // Filter out special card trigger messages
          if (msg.content === '__SHOW_CREATIVE_CONFIRM_CARD__' || msg.content === '__SHOW_CONFIRM_CARD__' || msg.content === '__SHOW_THUMBNAIL_OPTIONS__') {
            return null;
          }

          return (
            <div
              key={idx}
              className={cn(
                "flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="p-2 rounded-lg bg-primary/10 h-fit">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "px-4 py-2 rounded-lg max-w-[80%]",
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}
              >
                {msg.role === "user" ? (
                  <CollapsibleUserMessage content={msg.content} />
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          );
        })}

        {/* ✅ Show QuickPostConfirmCard separately when stage is confirming */}
        {quickPost.stage === 'confirming' && (
          <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
            <div className="p-2 rounded-lg bg-primary/10 h-fit">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="w-full max-w-lg">
              <QuickPostConfirmCard
                data={quickPost.data as ParsedCampaignData}
                onConfirm={async () => {
                  setIsLoading(true);
                  try {
                    const tokens = getTokens();
                    const result = await quickPost.confirmAndCreate(tokens);
                    if (result) {
                      addMessage('assistant',
                        `✅ Tạo thành công!\n\n` +
                        `📊 Campaign ID: ${result.campaignId}\n` +
                        `🎯 Ad Set ID: ${result.adSetId}\n` +
                        `📢 Ad ID: ${result.adId}\n\n` +
                        `Kiểm tra trong Facebook Ads Manager nhé!`
                      );
                    }
                  } catch (error) {
                    addMessage('assistant', `❌ Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                onCancel={() => {
                  quickPost.reset();
                  addMessage('assistant', '🔄 Đã hủy. Anh có thể thử lại với chiến dịch khác nhé!');
                }}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}

        {/* ✅ Show QuickCreativeConfirmCard when stage is reviewing_data */}
        {creative.stage === 'reviewing_data' && (
          <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
            <div className="p-2 rounded-lg bg-primary/10 h-fit">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="w-full max-w-lg">
              <QuickCreativeConfirmCard
                parsedData={creative.partialData}
                userMessage={messages.find(m => m.role === 'user')?.content}
                uploadedHash={creative.uploadedHash}
                uploadedVideoId={creative.uploadedVideoId}
                onContinue={async () => {
                  // ✅ Nếu media đã upload, tạo campaign ngay
                  if (creative.uploadedHash || creative.uploadedVideoId) {
                    setIsLoading(true);
                    try {
                      const { adsToken, pageToken, adAccountId, pageId } = getTokens();
                      addMessage('assistant', '⏳ Đang tạo campaign...');

                      const result = await creative.confirmAndCreate(
                        user!.id,
                        adsToken,
                        pageToken,
                        adAccountId,
                        pageId
                      );

                      if (result.success && result.ids) {
                        addMessage('assistant',
                          `✅ Tạo thành công!\n\n` +
                          `📊 Campaign ID: ${result.ids.campaignId}\n` +
                          `🎯 Ad Set ID: ${result.ids.adSetId}\n` +
                          `📢 Ad ID: ${result.ids.adId}\n\n` +
                          `Kiểm tra trong Facebook Ads Manager nhé!`
                        );
                      } else {
                        addMessage('assistant', result.message);
                      }
                    } catch (error) {
                      addMessage('assistant', `❌ Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`);
                    } finally {
                      setIsLoading(false);
                    }
                  } else {
                    // ✅ Nếu chưa có media, chuyển sang awaiting_media
                    creative.continueToUpload();
                    removeAttachedFile();
                    addMessage('assistant', '✅ Tuyệt vời! Giờ hãy tải ảnh hoặc video lên nhé!');
                  }
                }}
                onCancel={() => {
                  creative.reset();
                  removeAttachedFile();
                  addMessage('assistant', '🔄 Đã hủy. Anh có thể thử lại với chiến dịch khác nhé!');
                }}
              />
            </div>
          </div>
        )}


        {/* Clone Flow: Show confirm intent buttons */}
        {clone.stage === 'awaiting_confirmation' && (
          <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
            <div className="p-2 rounded-lg bg-primary/10 h-fit">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <CloneConfirmIntentButtons
              onConfirm={() => {
                clone.confirmIntent();
                addMessage('assistant',
                  '✅ Được rồi ạ! Anh muốn:\n\n' +
                  '1️⃣ **Hiển thị danh sách** chiến dịch\n' +
                  '2️⃣ **Tìm kiếm** bằng tên chiến dịch\n\n' +
                  '💡 Anh chọn cách nào nhé?'
                );
              }}
              onCancel={() => {
                clone.reset();
                addMessage('assistant', '✅ Đã hủy. Em sẵn sàng hỗ trợ anh nhé!');
              }}
            />
          </div>
        )}

        {/* Clone Flow: Show list/search choice buttons */}
        {clone.stage === 'awaiting_list_choice' && (
          <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
            <div className="p-2 rounded-lg bg-primary/10 h-fit">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <CloneListChoiceButtons
              onChooseList={async () => {
                clone.chooseListOption();
                setIsLoading(true);
                try {
                  const { adsToken, adAccountId } = getTokens();
                  const result = await clone.fetchCampaignsForListing(user!.id, adAccountId, adsToken);

                  if (result.success && result.items && result.items.length > 0) {
                    addMessage('assistant', '📋 Vui lòng chọn chiến dịch từ danh sách bên dưới:');
                  } else {
                    addMessage('assistant', '⚠️ Không tìm thấy chiến dịch nào.');
                    clone.reset();
                  }
                } catch (error) {
                  addMessage('assistant', `❌ Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`);
                  clone.reset();
                } finally {
                  setIsLoading(false);
                }
              }}
              onChooseSearch={() => {
                clone.chooseSearchOption();
                addMessage('assistant', '🔍 Vui lòng nhập tên chiến dịch hoặc từ khóa để tìm kiếm:');
              }}
              onCancel={() => {
                clone.reset();
                addMessage('assistant', '✅ Đã hủy.');
              }}
            />
          </div>
        )}

        {/* Clone Flow: Show campaign selector when awaiting selection */}
        {clone.stage === 'awaiting_campaign_selection' && clone.effectiveItems.length > 0 && (
          <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
            <div className="p-2 rounded-lg bg-primary/10 h-fit">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="w-full max-w-lg">
              <CampaignSelector
                campaigns={clone.effectiveItems}
                onSelect={(campaign, index) => {
                  const result = clone.selectCampaignByIndex(index);
                  if (result.success) {
                    addMessage('assistant', formatSelectedCampaign(campaign));
                  }
                }}
                onCancel={() => {
                  clone.reset();
                  addMessage('assistant', '✅ Đã hủy.');
                }}
              />
            </div>
          </div>
        )}

        {/* Clone Flow: Show type selector when selecting type */}
        {clone.stage === 'selecting_type' && clone.selectedItem && (
          <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
            <div className="p-2 rounded-lg bg-primary/10 h-fit">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <CloneTypeSelector
              onSelect={async (type) => {
                clone.selectType(type);

                if (type === 'campaign') {
                  clone.proceedToAwaitingName();
                  addMessage('assistant',
                    '✅ Đã chọn nhân bản **chiến dịch**\n\n' +
                    '📝 Bạn muốn đặt tên mới cho chiến dịch là gì?'
                  );
                } else {
                  setIsLoading(true);
                  try {
                    const { adsToken, adAccountId } = getTokens();
                    const result = await clone.fetchChildItems(adAccountId, adsToken);

                    if (result.success && result.items) {
                      if (result.items.length === 1) {
                        const itemType = type === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo';
                        addMessage('assistant',
                          `✅ Tìm thấy 1 ${itemType}: **${result.items[0].name}**\n\n` +
                          `📝 **Tên mới:** Nhập tên cho ${itemType} mới\n` +
                          '🔢 **Số lượng:** Nhập số lượng cần nhân bản'
                        );
                      } else {
                        const itemType = type === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo';
                        const list = result.items.map((item, i) =>
                          `${i + 1}. **${item.name}** (${item.status})`
                        ).join('\n');
                        addMessage('assistant',
                          `📋 **Danh sách ${itemType}** (${result.items.length} ${itemType}):\n\n${list}\n\n` +
                          `💡 **Chọn ${itemType}:** Nhập số thứ tự`
                        );
                      }
                    } else {
                      const itemType = type === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo';
                      addMessage('assistant', `⚠️ Không tìm thấy ${itemType} nào.`);
                      clone.reset();
                    }
                  } catch (error) {
                    addMessage('assistant', `❌ Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`);
                    clone.reset();
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              onCancel={() => {
                clone.reset();
                addMessage('assistant', '✅ Đã hủy.');
              }}
            />
          </div>
        )}

        {/* Clone Flow: Show CloneConfirmCard when confirming */}
        {clone.stage === 'confirming' && clone.selectedItem && (
          <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
            <div className="p-2 rounded-lg bg-primary/10 h-fit">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="w-full max-w-lg">
              <CloneConfirmCard
                selectedItem={clone.selectedItem}
                cloneType={clone.selectedType!}
                suggestedName={clone.newName || advancedAdsService.suggestCloneName(clone.selectedItem.name)}
                quantities={clone.quantities || { campaigns: 1, adsets: 1, ads: 1 }}
                onChangeQuantities={(q) => clone.setQuantities(q)}
                statusOption={clone.statusOption || 'PAUSED'}
                onChangeStatus={(s) => clone.setStatusOption(s)}
                onConfirm={async () => {
                  setIsLoading(true);
                  const { adsToken, adAccountId } = getTokens();
                  addMessage('assistant', '⏳ Đang nhân bản...');

                  const result = await clone.confirmAndClone(adAccountId, adsToken);

                  setMessages(prev => prev.filter(m => !m.content.includes('⏳ Đang nhân bản')));

                  if (result.success) {
                    addMessage('assistant', result.message);
                  } else {
                    addMessage('assistant', `❌ ${result.message}`);
                  }
                  setIsLoading(false);
                }}
                onCancel={() => {
                  clone.reset();
                  addMessage('assistant', '🔄 Đã hủy.');
                }}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="p-2 rounded-lg bg-primary/10 h-fit">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="px-4 py-2 rounded-lg bg-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}

        {/* Audience Type Selection Buttons */}
        {audience.stage === 'selecting_type' && (
          <div className="pb-2">
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  audience.selectType('phone_numbers');
                  addMessage('assistant', '📋 Vui lòng cung cấp tên đối tượng:');
                }}
                className="w-full justify-start"
              >
                📞 Danh sách số điện thoại
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  audience.selectType('page_messenger');
                  addMessage('assistant', '📋 Vui lòng cung cấp tên đối tượng:');
                }}
                className="w-full justify-start"
              >
                💬 Messenger Page
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  audience.selectType('lookalike');
                  addMessage('assistant', '📋 Vui lòng cung cấp tên đối tượng:');
                }}
                className="w-full justify-start"
              >
                🎯 Lookalike Audience
              </Button>
            </div>
          </div>
        )}

        {/* Page Selection for Messenger Audience */}
        {audience.stage === 'collecting_messenger_page' && audience.data?.availablePages && (
          <div className="pb-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="page-select">Chọn Page</Label>
              <Select
                onValueChange={(value) => {
                  const selectedPage = audience.data.availablePages?.find((p: any) => p.page_id === value);
                  if (!selectedPage) return;

                  audience.setData({ pageId: selectedPage.page_id, pageName: selectedPage.page_name });
                  audience.setStage('collecting_messenger_days');
                  addMessage('assistant', `✅ Đã chọn Page: **${selectedPage.page_name}**`);
                  addMessage('assistant', '📅 Vui lòng nhập số ngày lưu trữ (1-365 ngày):\n\n💡 Ví dụ: nhập "30" để lấy người nhắn tin trong 30 ngày qua');
                }}
              >
                <SelectTrigger id="page-select" className="bg-background">
                  <SelectValue placeholder="Chọn Page..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {audience.data.availablePages.map((page: any) => (
                    <SelectItem key={page.page_id} value={page.page_id}>
                      📄 {page.page_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Messenger Audience Confirmation Buttons */}
        {audience.stage === 'collecting_messenger_days' &&
          audience.data?.audienceName &&
          audience.data?.pageId &&
          audience.data?.retentionDays && (
            <div className="pb-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    setIsLoading(true);
                    const { adsToken, adAccountId } = getTokens();
                    addMessage('assistant', '⏳ Đang tạo đối tượng Messenger...');

                    const result = await audience.createAudience(adAccountId, adsToken);

                    if (result.success) {
                      addMessage('assistant', `✅ ${result.message}`);
                    } else {
                      addMessage('assistant', `❌ ${result.error || result.message}`);
                      // Only reset on error, otherwise let flow handle post-creation options
                      audience.reset();
                    }

                    setIsLoading(false);
                  }}
                  disabled={isLoading}
                >
                  ✅ Xác nhận tạo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    audience.reset();
                    addMessage('assistant', '❌ Đã hủy tạo đối tượng');
                  }}
                  disabled={isLoading}
                >
                  ❌ Hủy
                </Button>
              </div>
            </div>
          )}

        {/* Source Audience Selection for Lookalike */}
        {audience.stage === 'collecting_lookalike' && audience.data?.availableAudiences && (
          <div className="pb-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="source-audience">Chọn đối tượng nguồn</Label>
              <Select
                onValueChange={async (value) => {
                  setIsLoading(true);

                  const selectedAudience = audience.data.availableAudiences?.find((a: any) => a.id === value);
                  if (!selectedAudience) return;

                  // Store source info
                  const sourceData = {
                    sourceId: selectedAudience.id,
                    sourceName: selectedAudience.name,
                    availableAudiences: undefined
                  };
                  audience.setData(sourceData);

                  // Re-validate after adding sourceId
                  const updatedData = { ...audience.data, ...sourceData };
                  const validation = validateAudienceData('lookalike', updatedData);

                  if (validation.needsMoreInfo) {
                    if (validation.missingField === 'country') {
                      audience.setData({ showCountryButtons: true });
                    }
                    addMessage('assistant', validation.missingFieldPrompt!);
                  } else {
                    // Show confirmation
                    addMessage('assistant',
                      `✅ Đã đủ thông tin!\n\n` +
                      `📋 Tên: ${updatedData.audienceName}\n` +
                      `🎯 Nguồn: ${updatedData.sourceName}\n` +
                      `🌍 Quốc gia: ${updatedData.countryName}\n` +
                      `📊 Tỷ lệ: ${updatedData.ratio}%\n\n` +
                      `Anh xác nhận tạo không?`
                    );
                    audience.setData({ showConfirmButtons: true });
                  }

                  setIsLoading(false);
                }}
              >
                <SelectTrigger id="source-audience" className="bg-background">
                  <SelectValue placeholder="Chọn đối tượng nguồn..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {audience.data.availableAudiences.map((aud: any) => (
                    <SelectItem key={aud.id} value={aud.id}>
                      🎯 {aud.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Country Selection for Lookalike */}
        {audience.stage === 'collecting_lookalike' && audience.data?.showCountryButtons && (
          <div className="pb-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="country-select">Chọn quốc gia</Label>
              <Select
                onValueChange={async (value) => {
                  setIsLoading(true);

                  const countries = [
                    { code: 'VN', name: 'Việt Nam', flag: '🇻🇳' },
                    { code: 'US', name: 'United States', flag: '🇺🇸' },
                    { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
                    { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
                    { code: 'MY', name: 'Malaysia', flag: '🇲🇾' }
                  ];

                  const country = countries.find(c => c.code === value);
                  if (!country) return;

                  // Store country info
                  const countryData = {
                    country: country.code,
                    countryName: `${country.flag} ${country.name}`,
                    showCountryButtons: false
                  };
                  audience.setData(countryData);

                  // Re-validate after adding country
                  const updatedData = {
                    ...audience.data,
                    ...countryData
                  };
                  const validation = validateAudienceData('lookalike', updatedData);

                  if (validation.needsMoreInfo) {
                    if (validation.missingField === 'ratio') {
                      audience.setData({ showRatioButtons: true });
                    }
                    addMessage('assistant', validation.missingFieldPrompt!);
                  } else {
                    // Show confirmation
                    addMessage('assistant',
                      `✅ Đã đủ thông tin!\n\n` +
                      `📋 Tên: ${updatedData.audienceName}\n` +
                      `🎯 Nguồn: ${updatedData.sourceName}\n` +
                      `🌍 Quốc gia: ${updatedData.countryName}\n` +
                      `📊 Tỷ lệ: ${updatedData.ratio}%\n\n` +
                      `Anh xác nhận tạo không?`
                    );
                    audience.setData({ showConfirmButtons: true });
                  }

                  setIsLoading(false);
                }}
              >
                <SelectTrigger id="country-select" className="bg-background">
                  <SelectValue placeholder="Chọn quốc gia..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="VN">🇻🇳 Việt Nam</SelectItem>
                  <SelectItem value="US">🇺🇸 United States</SelectItem>
                  <SelectItem value="TH">🇹🇭 Thailand</SelectItem>
                  <SelectItem value="SG">🇸🇬 Singapore</SelectItem>
                  <SelectItem value="MY">🇲🇾 Malaysia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Ratio Selection for Lookalike */}
        {audience.stage === 'collecting_lookalike' && audience.data?.showRatioButtons && (
          <div className="pb-2">
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((ratio) => (
                <Button
                  key={ratio}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsLoading(true);

                    // Store ratio info
                    const ratioData = {
                      ratio: ratio,
                      showRatioButtons: false
                    };
                    audience.setData(ratioData);

                    // Re-validate after adding ratio
                    const updatedData = {
                      ...audience.data,
                      ...ratioData
                    };
                    const validation = validateAudienceData('lookalike', updatedData);

                    if (validation.needsMoreInfo) {
                      addMessage('assistant', validation.missingFieldPrompt!);
                    } else {
                      // Show confirmation
                      addMessage('assistant',
                        `✅ Đã đủ thông tin!\n\n` +
                        `📋 Tên: ${updatedData.audienceName}\n` +
                        `🎯 Nguồn: ${updatedData.sourceName}\n` +
                        `🌍 Quốc gia: ${updatedData.countryName}\n` +
                        `📊 Tỷ lệ: ${updatedData.ratio}%\n\n` +
                        `Anh xác nhận tạo không?`
                      );
                      audience.setData({ showConfirmButtons: true });
                    }

                    setIsLoading(false);
                  }}
                >
                  {ratio}%
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Lookalike Confirmation Buttons */}
        {audience.stage === 'collecting_lookalike' && audience.data?.showConfirmButtons && (
          <div className="pb-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  setIsLoading(true);


                  const { adsToken, adAccountId } = getTokens();
                  addMessage('assistant', '⏳ Đang tạo Lookalike Audience...');

                  const result = await audience.createAudience(adAccountId, adsToken);

                  if (result.success) {
                    addMessage('assistant', `✅ ${result.message}`);
                  } else {
                    addMessage('assistant', `❌ ${result.error || result.message}`);
                    audience.reset();
                  }

                  setIsLoading(false);
                }}
                disabled={isLoading}
              >
                ✅ Xác nhận tạo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  audience.reset();
                  addMessage('assistant', '❌ Đã hủy tạo đối tượng');
                }}
                disabled={isLoading}
              >
                ❌ Hủy
              </Button>
            </div>
          </div>
        )}

        {/* Post-Creation Options (Create Lookalike or Done) */}
        {audience.stage === 'post_creation_options' && (
          <div className="pb-2 animate-in fade-in-50 slide-in-from-bottom-2">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Anh có muốn tạo đối tượng tương tự (Lookalike) từ tệp này luôn không ạ?</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    // Transition to lookalike creation with pre-filled source
                    audience.selectType('lookalike');

                    const sourceData = {
                      sourceId: audience.data.createdAudienceId,
                      sourceName: audience.data.createdAudienceName,
                      audienceName: `Lookalike of ${audience.data.createdAudienceName}`, // Save the suggested name
                      // Clear previous data that might conflict
                      country: undefined,
                      ratio: undefined,
                      showCountryButtons: undefined,
                      showRatioButtons: undefined,
                      showConfirmButtons: undefined
                    };

                    audience.setData(sourceData);

                    // Trigger validation to prompt for next step (Country)
                    const validation = validateAudienceData('lookalike', {
                      ...audience.data,
                      ...sourceData
                    });

                    if (validation.needsMoreInfo) {
                      if (validation.missingField === 'country') {
                        audience.setData({ showCountryButtons: true });
                      }
                      addMessage('assistant', `📝 Đã chọn nguồn: **${audience.data.createdAudienceName}**\n\n${validation.missingFieldPrompt}`);
                    }
                  }}
                >
                  🎯 Tạo Lookalike ngay
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    audience.reset();
                    addMessage('assistant', '✅ Đã hoàn tất.');
                  }}
                >
                  ❌ Đóng
                </Button>
              </div>
            </div>
          </div>
        )}


        {creative.stage === 'confirming' && (
          <div className="pb-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={isLoading}
                onClick={async () => {
                  setIsLoading(true);
                  const { adsToken, pageToken, adAccountId, pageId } = getTokens();
                  addMessage('assistant', '⏳ Đang tạo campaign...');

                  const result = await creative.confirmAndCreate(
                    user!.id,
                    adsToken,
                    pageToken,
                    adAccountId,
                    pageId
                  );

                  if (result.success && result.ids) {
                    addMessage('assistant',
                      `✅ Tạo thành công!\n\n` +
                      `📊 Campaign ID: ${result.ids.campaignId}\n` +
                      `🎯 Ad Set ID: ${result.ids.adSetId}\n` +
                      `📢 Ad ID: ${result.ids.adId}\n\n` +
                      `Kiểm tra trong Facebook Ads Manager nhé!`
                    );
                  } else {
                    addMessage('assistant', result.message);
                  }
                  setIsLoading(false);
                }}
              >
                ✅ Xác nhận & Tạo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                ❌ Hủy
              </Button>
            </div>
          </div>
        )}

        {/* Campaign Control Cards */}
        {campaignControl.state.stage === 'done' && campaignControl.state.intent === 'LIST' && (
          <div className="mb-4">
            <CampaignListCard
              campaigns={campaignControl.state.foundCampaigns}
              onToggle={async (id, action) => {
                await campaignControl.handleToggleAction(id, action);
                toast({ title: `Đã ${action === 'PAUSE' ? 'tắt' : 'bật'} chiến dịch` });
              }}
            />
          </div>
        )}

        {campaignControl.state.stage === 'confirming' && campaignControl.state.intent === 'TOGGLE' && campaignControl.state.foundCampaigns.length === 1 && (
          <div className="mb-4">
            <ConfirmationCard
              campaign={campaignControl.state.foundCampaigns[0]}
              action={campaignControl.state.targetAction!}
              onConfirm={async () => {
                const campaign = campaignControl.state.foundCampaigns[0];
                await campaignControl.handleToggleAction(campaign.id, campaignControl.state.targetAction!);
                addMessage('assistant', `✅ Đã ${campaignControl.state.targetAction === 'PAUSE' ? 'tắt' : 'bật'} chiến dịch "${campaign.name}" thành công!`);
                campaignControl.reset();
              }}
              onCancel={() => {
                addMessage('assistant', 'Đã hủy thao tác.');
                campaignControl.reset();
              }}
            />
          </div>
        )}

        {/* Rule Flow: Show RuleCard when confirming */}
        {ruleFlow.stage === 'confirming' && ruleFlow.proposedRule && (
          <div className="mb-4 animate-in fade-in-50 slide-in-from-bottom-2">
            <RuleCard
              rule={ruleFlow.proposedRule as any} // Cast to any to avoid strict type issues if partial
              labels={[]} // ✅ Fix: Pass empty labels to prevent crash
              onToggleActive={() => { }} // Dummy handler
              onEdit={() => { }} // Dummy handler
              onDelete={() => { }} // Dummy handler
              onRun={() => { }} // Dummy handler
              onConfirm={async () => {
                addMessage('assistant', '⏳ Đang lưu quy tắc...');
                await ruleFlow.confirmAndCreate();
              }}
              onCancel={() => {
                addMessage('assistant', 'Đã hủy tạo quy tắc.');
                ruleFlow.reset();
              }}
            />
          </div>
        )}

        {/* Rule Flow: Scope Suggestions */}
        {ruleFlow.stage === 'defining_scope' && (
          <div className="pb-2 animate-in fade-in-50 slide-in-from-bottom-2">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleQuickReply("Chiến dịch")}>Chiến dịch</Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickReply("Nhóm quảng cáo")}>Nhóm quảng cáo</Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickReply("Quảng cáo")}>Quảng cáo</Button>
            </div>
          </div>
        )}



        {/* Rule Flow: Post Create Options */}
        {ruleFlow.stage === 'post_create_options' && (
          <div className="pb-2 animate-in fade-in-50 slide-in-from-bottom-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => ruleFlow.handlePostCreateOption('continue')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Tiếp tục (Gắn nhãn)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => ruleFlow.handlePostCreateOption('cancel')}
              >
                Hủy (Chỉ tạo quy tắc)
              </Button>
            </div>
          </div>
        )}

        {/* Rule Flow: Item Selection */}
        {ruleFlow.stage === 'selecting_items' && (
          <div className="mb-4 animate-in fade-in-50 slide-in-from-bottom-2">
            <ItemSelectorCard
              items={selectableItems}
              type={ruleFlow.proposedRule?.scope as any || 'campaign'}
              onConfirm={async (selectedIds) => {
                addMessage('assistant', '⏳ Đang gắn nhãn...');
                await ruleFlow.handleApplyLabel(selectedIds);
              }}
              onCancel={() => {
                addMessage('assistant', 'Đã hủy gắn nhãn.');
                ruleFlow.handlePostCreateOption('cancel');
              }}
            />
          </div>
        )}

        {/* Campaign Control List for Multiple Matches in Toggle Intent */}
        {campaignControl.state.stage === 'confirming' && campaignControl.state.intent === 'TOGGLE' && campaignControl.state.foundCampaigns.length > 1 && (
          <div className="mb-4">
            <div className="text-sm text-muted-foreground mb-2">Tìm thấy nhiều chiến dịch phù hợp:</div>
            <CampaignListCard
              campaigns={campaignControl.state.foundCampaigns}
              onToggle={async (id, action) => {
                await campaignControl.handleToggleAction(id, action);
                toast({ title: `Đã ${action === 'PAUSE' ? 'tắt' : 'bật'} chiến dịch` });
              }}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="p-4 border-t border-border bg-muted/30 flex-shrink-0">
        {attachedFile && (
          <div className="mb-2 p-2 bg-card border border-border rounded-lg flex items-center gap-2">
            <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground truncate flex-1">
              {truncateFilename(attachedFile.name)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeAttachedFile}
              className="h-6 w-6 p-0 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*"
            className="hidden"
          />

          <Button
            variant="outline"
            size="icon"
            onClick={handleFileAttach}
            disabled={isLoading}
            className="shrink-0 h-9 w-9"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              // Auto-resize textarea
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isAnyFlowActive
                ? "Nhập thông tin..."
                : "Nhắn tin với AI Assistant..."
            }
            disabled={isLoading}
            rows={1}
            className="flex-1 px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground resize-none overflow-y-auto min-h-[38px] max-h-[120px] text-sm leading-relaxed"
            style={{ height: '38px' }}
          />

          <Button
            onClick={handleSend}
            disabled={(!message.trim() && !attachedFile) || isLoading}
            className="shrink-0 h-9 w-9"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;
