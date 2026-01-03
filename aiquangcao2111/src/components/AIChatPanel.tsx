import { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, ArrowUp, Loader2, X, Minimize2, RotateCcw, Paperclip, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";
import { streamAIChat } from "@/utils/aiStream";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabaseSettings } from "@/hooks/useSupabaseSettings";
import { detectChatIntent, ChatIntentResult } from "@/services/aiChatOrchestratorService";
import { useCreativeCampaignFlow } from "@/hooks/useCreativeCampaignFlow";
import { useAudienceFlow } from "@/hooks/useAudienceFlow";
import { useCloneFlow } from "@/hooks/useCloneFlow";
import { useQuickPostFlow } from "@/features/quick-post-isolated/hooks/useQuickPostFlow";
import { supabase } from "@/integrations/supabase/client";
import { useAIFeatures, AI_FEATURES } from "@/hooks/useAIFeatures";
import * as advancedAdsService from "@/services/advancedAdsService";
import type { ParsedCampaignData } from "@/features/quick-post-isolated/types";
import { useCampaignControlFlow } from "@/assistant/hooks/useCampaignControlFlow";

import { getInsightsByUserAndDate } from "@/services/nocodb/facebookInsightsAutoService";
import { useRuleFlow } from "@/assistant/hooks/useRuleFlow";

import { AudienceFlowHandler } from "./ai-chat/AudienceFlowHandler";
import { MessageList } from "./ai-chat/MessageList";
import { useTemplateCreatorFlow } from "@/hooks/useTemplateCreatorFlow";
import { TemplateCreatorCard } from "./ai-chat/TemplateCreatorCard";
import { ChatInputArea } from "./ai-chat/ChatInputArea";
import { truncateFilename } from "@/utils/stringUtils";
import { useCustomAudienceFlow } from "@/hooks/useCustomAudienceFlow";
import CustomAudienceSelector from "@/components/CustomAudienceSelector";
import { AutomatedRulesDialog } from "@/components/AutomatedRulesDialog";
import { createRule } from "@/services/nocodb/automatedRulesService";
import { getLabelsByUserId } from "@/services/nocodb/campaignLabelsService";
import { bulkAssignLabels, removeLabel, getLabelAssignmentsByEntities } from "@/services/nocodb/campaignLabelAssignmentsService";
import { toast as sonnerToast } from "sonner";

// ========== NEW: 3-Tier Architecture Imports ==========
import { detectIntent } from "@/assistant/services/intentDetector";
import { routeIntent, FlowRegistry } from "@/assistant/services/chatRouter";
import { handleRuleFlow, isRuleRelatedIntent } from "@/assistant/services/ruleFlowHandler";
import { handleQuickPostFlow, hasFacebookLink } from "@/assistant/services/quickPostHandler";
import { handleCloneFlow } from "@/assistant/services/cloneHandler";
import { handleCustomAudienceFlow, isCustomAudienceIntent } from "@/assistant/services/customAudienceHandler";
import { handleCampaignControlFlow } from "@/assistant/services/campaignControlHandler";
import { handleCreativeFlow } from "@/assistant/services/creativeHandler";
import { handleAudienceFlow } from "@/assistant/services/audienceHandler";
import { handleReportRequest, ReportFlowResult } from "@/assistant/services/reportHandler";
import { handleScheduleQuery } from "@/assistant/services/scheduleHandler";
import { ReportCard, ReportData } from "@/components/ai-chat/ReportCard";
import { useTokenBalance } from "@/hooks/useTokenBalance";

type Message = { role: "user" | "assistant"; content: string; data?: any };

interface AIChatPanelProps {
  fullWidth?: boolean;
}

import { getCampaigns, getAdSets, getAds } from "@/services/facebookInsightsService";


const AIChatPanel = ({ fullWidth = false }: AIChatPanelProps = {}) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isResetRef = useRef(false);
  const pendingMessageRef = useRef<string | null>(null); // For auto-retry when settings load
  const lastRequestTimeRef = useRef<number>(0); // Rate limit tracking

  // Hooks for campaign flows
  const creative = useCreativeCampaignFlow();
  const audience = useAudienceFlow();
  const clone = useCloneFlow();
  const quickPost = useQuickPostFlow();
  const ruleFlow = useRuleFlow();
  const templateCreator = useTemplateCreatorFlow();
  const customAudienceFlow = useCustomAudienceFlow();

  const [campaignCatalog, setCampaignCatalog] = useState<any[]>([]);
  const [selectableItems, setSelectableItems] = useState<any[]>([]); // For rule label application

  // Label management state
  const [labels, setLabels] = useState<any[]>([]);
  const [labelAssignments, setLabelAssignments] = useState<any[]>([]);

  // Report flow state
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);


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
          // Silent fail - selection items are not critical
          addMessage('assistant', '❌ Lỗi khi tải danh sách. Vui lòng thử lại.');
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchItems();
  }, [ruleFlow.stage, ruleFlow.proposedRule?.scope]);

  const campaignControl = useCampaignControlFlow(campaignCatalog, async (id, status) => {
    // Toggle handler - calls Facebook API
    try {
      const { updateObjectStatus } = await import('@/services/facebookInsightsService');
      const { adsToken } = getTokens();

      await updateObjectStatus(adsToken, id, status ? 'ACTIVE' : 'PAUSED');
      toast({ title: status ? '✅ Đã bật chiến dịch' : '✅ Đã tắt chiến dịch', description: 'Thay đổi đã được áp dụng lên Facebook' });
    } catch (error: any) {
      toast({ title: '❌ Lỗi cập nhật trạng thái', description: error.message || 'Không thể thay đổi trạng thái chiến dịch', variant: 'destructive' });
      throw error; // Re-throw so handleToggleAction can handle it
    }
  });
  // AI Features hook
  const aiFeatures = useAIFeatures();

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { settings, loading: settingsLoading, reload } = useSupabaseSettings();
  const { balance: userBalance } = useTokenBalance(); // Cached balance - no API call
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState<string>("");
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // AI Assistant personalization state
  const [aiNickname, setAiNickname] = useState<string>("");
  const [aiAvatarUrl, setAiAvatarUrl] = useState<string>("");
  const [aiSelfPronoun, setAiSelfPronoun] = useState<string>("");
  const [aiUserPronoun, setAiUserPronoun] = useState<string>("");





  // Load user profile via Edge Function
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;

      try {
        // Use Edge Function for reliable NocoDB access
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-profile`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'get' }),
          }
        );

        if (!response.ok) {
          console.error('Failed to load profile');
          setUserName(user.email?.split('@')[0] || "");
          return;
        }

        const result = await response.json();
        const profile = result.profile;

        if (profile?.full_name) {
          setUserName(profile.full_name);
        } else {
          setUserName(user.email?.split('@')[0] || "");
        }
        // Load AI Assistant settings
        if (profile?.ai_nickname) {
          setAiNickname(profile.ai_nickname);
        }
        // Using actual NocoDB column name: ai_avatar_url
        if (profile?.ai_avatar_url && typeof profile.ai_avatar_url === 'string' && profile.ai_avatar_url.length > 0) {
          setAiAvatarUrl(profile.ai_avatar_url);
        }
        // Load pronoun settings - using actual NocoDB column names
        if (profile?.ai_pronoun_style) {
          setAiSelfPronoun(profile.ai_pronoun_style);
        }
        if (profile?.ai_pronoun_custom) {
          setAiUserPronoun(profile.ai_pronoun_custom);
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        setUserName(user.email?.split('@')[0] || "");
      }
    };

    loadUserProfile();

    // Listen for AI settings updates from SettingsModal
    const handleAISettingsUpdate = () => {
      loadUserProfile();
    };
    window.addEventListener('ai-settings-updated', handleAISettingsUpdate);
    return () => {
      window.removeEventListener('ai-settings-updated', handleAISettingsUpdate);
    };
  }, [user]);

  // Load labels for assignment feature
  useEffect(() => {
    const loadLabels = async () => {
      if (!user?.id) return;
      try {
        const userLabels = await getLabelsByUserId(user.id);
        setLabels(userLabels);
      } catch (error) {
        console.error('Failed to load labels:', error);
      }
    };
    loadLabels();
  }, [user?.id]);

  // Handler for assigning labels
  const handleAssignLabel = useCallback(async (
    entityId: string,
    entityType: 'campaign' | 'adset' | 'ad',
    labelIds: number[]
  ) => {
    try {
      await bulkAssignLabels([{ id: entityId, type: entityType }], labelIds, user?.id);

      // Reload assignments for this entity
      const assignments = await getLabelAssignmentsByEntities([entityId], entityType);
      setLabelAssignments(prev => {
        // Remove old assignments for this entity, add new ones
        const filtered = prev.filter(a => {
          const idField = entityType === 'campaign' ? 'campaign_id' : entityType === 'adset' ? 'adset_id' : 'ad_id';
          return String((a as any)[idField]) !== String(entityId);
        });
        return [...filtered, ...assignments];
      });

      sonnerToast.success('Đã gắn nhãn thành công');
    } catch (error) {
      console.error('Error assigning label:', error);
      sonnerToast.error('Lỗi khi gắn nhãn');
    }
  }, [user?.id]);

  // Handler for removing labels
  const handleRemoveLabel = useCallback(async (
    entityId: string,
    entityType: 'campaign' | 'adset' | 'ad',
    labelId: number
  ) => {
    try {
      await removeLabel(entityId, entityType, labelId);

      // Update local state immediately
      setLabelAssignments(prev => prev.filter(a => {
        const idField = entityType === 'campaign' ? 'campaign_id' : entityType === 'adset' ? 'adset_id' : 'ad_id';
        return !(String((a as any)[idField]) === String(entityId) && a.label_id === labelId);
      }));

      sonnerToast.success('Đã gỡ nhãn');
    } catch (error) {
      console.error('Error removing label:', error);
      sonnerToast.error('Lỗi khi gỡ nhãn');
    }
  }, []);

  useEffect(() => {
    if (isResetRef.current || messages.length === 0) return;
    // ✅ Use setTimeout for mobile browser compatibility (iOS Safari needs render to complete first)
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
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

  // ✅ Auto-retry pending message when settings finish loading
  const handleSendRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!settingsLoading && pendingMessageRef.current && handleSendRef.current) {
      const pendingMsg = pendingMessageRef.current;
      pendingMessageRef.current = null; // Clear immediately to prevent double-trigger

      // Show notification and remove loading message
      setMessages(prev => [
        ...prev.filter(m => !m.content.includes('⏳ **Đang tải cấu hình')),
        { role: 'assistant', content: '✅ Đã tải xong! Đang xử lý yêu cầu của bạn...' }
      ]);

      // Auto-submit the pending message after a short delay
      setTimeout(() => {
        setMessage(pendingMsg);
        // Need another timeout to ensure state is updated before send
        setTimeout(() => {
          handleSendRef.current?.();
        }, 100);
      }, 300);
    }
  }, [settingsLoading]);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    if (isResetRef.current) {

      return;
    }
    setMessages(prev => [...prev, { role, content }]);
  }, []);

  const getTokens = () => {
    if (settingsLoading) {
      throw new Error('⏳ Hệ thống đang khởi động, vui lòng thử lại sau 5 giây...');
    }

    if (!settings) {
      throw new Error('❌ Không thể tải cấu hình. Vui lòng refresh trang hoặc kiểm tra kết nối mạng.');
    }

    if (!settings.adsToken || !settings.adAccountId) {
      throw new Error('❌ Chưa cấu hình Facebook Ads Token.\n\nVui lòng:\n1. Mở Settings (biểu tượng ⚙️)\n2. Nhập Ads Token\n3. Nhấn "Kiểm tra"\n4. Chọn tài khoản và nhấn "Lưu"');
    }

    if (!settings.pageToken || !settings.pageId) {
      throw new Error('❌ Chưa cấu hình Facebook Page Token.\n\nVui lòng:\n1. Mở Settings (biểu tượng ⚙️)\n2. Nhập Page Token\n3. Nhấn "Kiểm tra"\n4. Chọn trang và nhấn "Lưu"');
    }

    return {
      adsToken: settings.adsToken,
      pageToken: settings.pageToken,
      adAccountId: settings.adAccountId,
      pageId: settings.pageId
    };
  };

  // ✅ Refresh tokens by reloading settings
  const refreshTokens = async () => {
    try {
      const newSettings = await reload();

      if (!newSettings) {
        throw new Error('Could not load new settings');
      }

      return {
        adsToken: newSettings.adsToken,
        pageToken: newSettings.pageToken,
        adAccountId: newSettings.adAccountId,
        pageId: newSettings.pageId
      };
    } catch (error) {
      console.error("Failed to refresh tokens:", error);
      throw error;
    }
  };

  const handleCancel = useCallback(() => {
    creative.reset();
    audience.reset();
    clone.reset();
    clone.reset();
    quickPost.reset();
    ruleFlow.reset();
    customAudienceFlow.reset();
    setAttachedFile(null);

    addMessage('assistant', '✅ Đã hủy, anh cần em hỗ trợ gì tiếp theo ạ.');
  }, [creative, audience, clone, quickPost, customAudienceFlow, addMessage]);

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
    if ((!message.trim() && !attachedFile) || isLoading) return;

    // Rate Limit Check (6000ms = 6s)
    const now = Date.now();
    const COOLDOWN_MS = 6000;
    if (now - lastRequestTimeRef.current < COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((COOLDOWN_MS - (now - lastRequestTimeRef.current)) / 1000);
      addMessage('assistant', `⚠️ Bạn thao tác quá nhanh! Vui lòng đợi ${remainingSeconds} giây nữa để tránh bị giới hạn.`);
      return;
    }
    lastRequestTimeRef.current = now;

    // ========== COIN BALANCE CHECK (using cached balance - no API lag) ==========
    if (user && userBalance !== null && userBalance < 1) {
      addMessage('assistant', '⚠️ **Bạn đã hết coin!**\n\nVui lòng nạp thêm coin để tiếp tục sử dụng dịch vụ. Bấm nút "Nạp tiền" bên sidebar để nạp.');
      return;
    }

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
      // ========== LOCAL GREETING DETECTION (Skip AI - Fast Response) ==========
      // Patterns that don't need AI analysis - respond immediately
      const GREETING_PATTERNS = [
        /^(em ơi|xin chào|hello|hi|hey|chào|chào em|alo|a ơi|anh ơi)[\s!?\.]*$/i,
        /^em[\s!?\.]*$/i,  // Just "em"
      ];

      // Check if all flows are idle (no active conversation)
      const allFlowsIdle =
        creative.stage === 'idle' &&
        audience.stage === 'idle' &&
        clone.stage === 'idle' &&
        quickPost.stage === 'idle' &&
        ruleFlow.stage === 'idle' &&
        !customAudienceFlow.isActive &&
        campaignControl.state.stage === 'idle';

      // Only use local greeting if no flow is active AND no file attached
      if (allFlowsIdle && !currentAttachedFile && GREETING_PATTERNS.some(p => p.test(userMessage))) {
        const greetingResponse = userName
          ? `Chào anh ${userName}! 👋 Anh cần em hỗ trợ gì về quảng cáo Facebook ạ?`
          : `Chào anh! 👋 Anh cần em hỗ trợ gì về quảng cáo Facebook ạ?`;
        addMessage('assistant', greetingResponse);
        setIsLoading(false);
        return; // Skip AI - instant response!
      }

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

      // === PRIORITY 0: Campaign Control Flow (Refactored) ===
      const campaignControlResult = await handleCampaignControlFlow(
        {
          userMessage,
          campaignControl: {
            state: campaignControl.state,
            start: campaignControl.start,
            handleToggleAction: campaignControl.handleToggleAction,
            reset: campaignControl.reset,
          },
          getTokens,
          userId: user?.id,
          otherFlowsIdle: creative.stage === 'idle' && audience.stage === 'idle' && clone.stage === 'idle' && quickPost.stage === 'idle',
          setCampaignCatalog,
          campaignCatalog,
        },
        addMessage
      );

      if (campaignControlResult.handled) {
        // Handle LIST result - show campaign list UI
        if (campaignControlResult.showCampaignList && campaignControlResult.matches) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '__SHOW_CAMPAIGN_LIST__',
            data: campaignControlResult.matches,
            filterContext: campaignControlResult.filterContext
          }]);

          // Update label assignments if provided
          if (campaignControlResult.labelAssignments) {
            setLabelAssignments(prev => {
              const otherAssignments = prev.filter(a => !a.campaign_id);
              return [...otherAssignments, ...campaignControlResult.labelAssignments!];
            });
          }
        }
        setIsLoading(false);
        return;
      }

      // === PRIORITY 0.4: Report Flow (Báo cáo thống kê) ===
      // Check if user wants a report
      const intentCheck = detectIntent(userMessage, currentAttachedFile);
      if (intentCheck.type === 'REPORT') {
        try {
          setIsReportLoading(true);
          const { adsToken, adAccountId, pageId } = getTokens();

          const reportResult = await handleReportRequest(userMessage, {
            userId: user?.id || '',
            accountId: adAccountId,
            accountName: settings?.adAccountName || adAccountId,
            openaiApiKey: settings?.openaiKey,
            addMessage,
          });

          if (reportResult.success && reportResult.reportData) {
            setReportData(reportResult.reportData);
            // Add a message to show the report card
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: '__SHOW_REPORT_CARD__',
              data: reportResult.reportData,
            }]);
          } else if (reportResult.needsFetch) {
            addMessage('assistant', '⏰ Dữ liệu chưa có. Cần đồng bộ từ Facebook (5-10 phút).\n\nVui lòng vào tab "Lịch sử" và nhấn "Đồng bộ" trước.');
          } else {
            addMessage('assistant', `❌ ${reportResult.error || 'Không thể tạo báo cáo'}`);
          }
        } catch (reportError: any) {
          addMessage('assistant', `❌ Lỗi: ${reportError.message}`);
        } finally {
          setIsReportLoading(false);
          setIsLoading(false);
        }
        return;
      }

      // === PRIORITY 0.45: Schedule Flow (Xem lịch hẹn, dữ liệu sales) ===
      if (intentCheck.type === 'SCHEDULE') {
        try {
          await handleScheduleQuery(
            userMessage,
            {
              scheduleType: intentCheck.scheduleType || 'record',
              dateField: intentCheck.scheduleDateField || 'CreatedAt',
              targetDate: new Date().toISOString().split('T')[0],
            },
            {
              userId: user?.id || '',
              addMessage,
            }
          );
        } catch (scheduleError: any) {
          addMessage('assistant', `❌ Lỗi: ${scheduleError.message}`);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // === PRIORITY 0.5: Rule Flow (Đơn giản hóa) ===
      // ⚠️ Skip Rule Flow if file is attached - Creative Campaign takes priority
      if (!currentAttachedFile) {
        const ruleResult = await handleRuleFlow(
          {
            userMessage,
            ruleFlow: {
              stage: ruleFlow.stage,
              start: ruleFlow.start,
              handleInput: ruleFlow.handleInput,
              confirmAndCreate: ruleFlow.confirmAndCreate,
              reset: ruleFlow.reset,
              setStage: ruleFlow.setStage as any,
              selectBasicMode: ruleFlow.selectBasicMode,
              selectAdvancedMode: ruleFlow.selectAdvancedMode,
            },
          },
          addMessage
        );

        if (ruleResult.handled) {
          setIsLoading(false);
          return;
        }
      } // End: Skip Rule Flow if file attached

      // === Custom Audience Flow (Refactored - Bước 5C) ===
      const customAudienceResult = await handleCustomAudienceFlow(
        {
          userMessage,
          customAudienceFlow: {
            isActive: customAudienceFlow.isActive,
            stage: customAudienceFlow.stage,
            error: customAudienceFlow.error,
            startFlow: customAudienceFlow.startFlow,
            confirmAndCreate: customAudienceFlow.confirmAndCreate,
            reset: customAudienceFlow.reset,
          },
          getTokens,
        },
        addMessage
      );

      if (customAudienceResult.handled) {
        setIsLoading(false);
        return;
      }

      // === PRIORITY 1: Check if any hook is active ===

      // ✅ Skip QuickPost if Custom Audience flow is active (it will handle FB links)
      if (customAudienceFlow.isActive && customAudienceFlow.stage !== 'idle') {
        // Don't call handleQuickPostFlow, let the custom audience logic below handle it
      } else {
        // Quick Post Flow (Refactored - Bước 5A)
        const quickPostResult = await handleQuickPostFlow(
          {
            userMessage,
            quickPost: {
              stage: quickPost.stage,
              start: quickPost.start,
              handleInput: quickPost.handleInput,
              confirmAndCreate: quickPost.confirmAndCreate,
              reset: quickPost.reset,
            },
            getTokens,
            canUseQuickPost: aiFeatures.canUseQuickPost,
          },
          addMessage,
          setMessages
        );

        if (quickPostResult.handled) {
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

      // ===== AUDIENCE FLOW (Refactored) =====
      const audienceResult = await handleAudienceFlow(
        {
          userMessage,
          audience: {
            stage: audience.stage,
            data: audience.data,
            selectedType: audience.selectedType,
            selectType: audience.selectType,
            setData: audience.setData,
            setStage: audience.setStage,
            createAudience: audience.createAudience,
            reset: audience.reset,
          },
          getTokens,
          userId: user?.id,
        },
        addMessage
      );

      if (audienceResult.handled) {
        setIsLoading(false);
        return;
      }

      // ===== CLONE FLOW (Refactored - Bước 5B) =====
      const cloneResult = await handleCloneFlow(
        {
          userMessage,
          userId: user!.id,
          clone: {
            stage: clone.stage,
            selectedType: clone.selectedType,
            childItems: clone.childItems,
            chooseListOption: clone.chooseListOption,
            chooseSearchOption: clone.chooseSearchOption,
            fetchCampaignsForListing: clone.fetchCampaignsForListing,
            selectChildByIndex: clone.selectChildByIndex,
            setNewName: clone.setNewName,
            proceedToAwaitingQuantity: clone.proceedToAwaitingQuantity,
            setQuantities: clone.setQuantities,
            proceedToConfirming: clone.proceedToConfirming,
            reset: clone.reset,
          },
          getTokens,
        },
        addMessage
      );

      if (cloneResult.handled) {
        setIsLoading(false);
        return;
      }

      // === PRIORITY 2: Check settings loaded ===
      if (settingsLoading) {
        // Save message for auto-retry when settings finish loading
        pendingMessageRef.current = userMessage;
        addMessage('assistant',
          '⏳ **Đang tải cấu hình...**\n\n' +
          'Hệ thống sẽ **tự động xử lý** yêu cầu của bạn sau khi tải xong. Vui lòng đợi 3-5 giây...'
        );
        setIsLoading(false);
        return;
      }

      // === PRIORITY 3: Detect intent for new flows ===

      // ✅ Detect Template Creator keywords (e.g., "tạo bảng đối tượng")
      if (templateCreator.detectTemplateCreation(userMessage)) {
        addMessage('assistant', '📋 Em sẽ giúp anh tạo template mới. Vui lòng điền thông tin bên dưới:');
        templateCreator.showCreator();
        setIsLoading(false);
        return;
      }

      // 🆕 BRANCHING: Custom Audience Flow Priority
      // If we are in the "Awaiting Campaign Info" stage of Custom Audience Flow
      if (customAudienceFlow.isActive && customAudienceFlow.stage === 'awaiting_campaign_info') {

        const FB_LINK_REGEX = /https?:\/\/(?:www\.)?(?:m\.)?(?:business\.)?(?:l\.)?(?:lm\.)?(?:facebook\.com|fb\.com|fb\.watch)\/?.+/i;
        const hasLink = FB_LINK_REGEX.test(userMessage);

        if (hasLink) {
          // 1. Link Detected -> Existing Logic (Boost Post)
          const tokens = getTokens();
          addMessage('assistant', '🔍 Đang phân tích bài viết để tạo quảng cáo...');

          const result = await customAudienceFlow.parseCampaignInfo(userMessage, tokens.adsToken, tokens.pageToken);

          if (result.success) {
            // Success message is handled by confirm card or flow state update
            addMessage('assistant', '✅ Đã lấy thông tin bài viết thành công. Vui lòng kiểm tra lại thông tin bên dưới.');
          } else {
            addMessage('assistant', `❌ ${result.error || 'Không thể lấy thông tin bài viết'}`);
          }
          setIsLoading(false);
          return;
        } else {
          // 2. No Link -> New Ad Logic (Creative Flow)
          addMessage('assistant', '💡 Đang phân tích...');

          const selectedAudienceIds = customAudienceFlow.selectedAudienceIds || [];
          const { adsToken, adAccountId } = getTokens();

          // Stop Custom Audience Flow (UI Clean up)
          customAudienceFlow.reset();

          let uploadedHash: string | undefined;
          let uploadedVideoId: string | undefined;

          // Handle Media Upload if attached
          if (currentAttachedFile) {
            const uploadResult = await creative.uploadMedia(currentAttachedFile, adAccountId, adsToken);

            if (!uploadResult.success) {
              addMessage('assistant', `❌ Upload thất bại: ${uploadResult.message}`);
              setIsLoading(false);
              return;
            }

            uploadedHash = uploadResult.hash;
            uploadedVideoId = uploadResult.videoId;
            removeAttachedFile();
          }

          // Start Creative Flow with Audience Injection
          // Note: attachedFile logic was handled above, but we pass flag just in case
          const result = await creative.start(userMessage, adsToken, {
            hasMediaUploaded: !!currentAttachedFile,
            customAudienceIds: selectedAudienceIds,
            uploadedHash,
            uploadedVideoId
          });

          if (result.success) {
            if (result.message !== '__SHOW_CREATIVE_CONFIRM_CARD__') {
              addMessage('assistant', result.message);
            }
          } else {
            addMessage('assistant', `❌ ${result.message}`);
          }

          setIsLoading(false);
          return;
        }
      }

      // Quick Post: Block 2 removed - handled by handleQuickPostFlow

      // ===== SEQUENTIAL VALIDATION: File + Text (Refactored) =====
      const hasFile = !!currentAttachedFile;
      const hasText = userMessage.trim().length > 0;

      if (hasFile && hasText) {
        const creativeResult = await handleCreativeFlow(
          {
            userMessage,
            creative: {
              stage: creative.stage,
              uploadMedia: creative.uploadMedia,
              start: creative.start,
              handleRadiusInput: creative.handleRadiusInput,
              continueToUpload: creative.continueToUpload,
              reset: creative.reset,
            },
            getTokens,
            attachedFile: currentAttachedFile,
            removeAttachedFile,
            canUseCreativeCampaign: aiFeatures.canUseCreativeCampaign,
            messages,
            validateMediaFile,
          },
          addMessage,
          setMessages
        );

        if (creativeResult.handled) {
          setIsLoading(false);
          return;
        }
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

      // ===== 🆕 DETECT CREATIVE CAMPAIGN FORMAT (Text Only) =====
      // If user sends campaign info format without media, prompt them to attach
      const creativeCampaignPatterns = [
        /t[eê]n chi[eế]n d[iị]ch/i,          // "Tên chiến dịch"
        /[đd][oộ] tu[ổo]i/i,                  // "Độ tuổi"
        /gi[oớ]i t[ií]nh/i,                   // "Giới tính"
        /ng[aâ]n s[aá]ch/i,                   // "Ngân sách"
        /v[iị] tr[ií]/i,                      // "Vị trí"
        /kinh [đd][oộ]/i,                     // "Kinh độ" (coordinates)
        /n[oộ]i dung/i,                       // "Nội dung"
        /ti[eê]u [đd][eề]/i                   // "Tiêu đề"
      ];

      const matchedPatterns = creativeCampaignPatterns.filter(p => p.test(userMessage));
      const looksLikeCreativeCampaign = matchedPatterns.length >= 2; // At least 2 patterns matched

      if (looksLikeCreativeCampaign && !hasFile) {
        addMessage('assistant',
          '📸 Em nhận thấy anh muốn tạo **quảng cáo tin nhắn mới**!\\n\\n' +
          '⚠️ Để tạo quảng cáo tin nhắn, anh cần **đính kèm ảnh hoặc video** cùng với thông tin chiến dịch.\\n\\n' +
          '**Hướng dẫn:**\\n' +
          '1. Bấm nút 📎 để đính kèm ảnh/video\\n' +
          '2. Gửi lại thông tin chiến dịch\\n\\n' +
          '💡 *Hoặc anh có thể dùng lệnh "chạy quảng cáo tệp" nếu muốn target tệp đối tượng có sẵn.*'
        );
        setIsLoading(false);
        return;
      }

      // ===== CASE: Text only, no file (existing AI chat logic) =====
      const intent = await detectChatIntent(userMessage, messages);


      // Quick Post: Block 3 removed - handled by handleQuickPostFlow

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
        aiSelfPronoun: aiSelfPronoun || undefined,
        aiUserPronoun: aiUserPronoun || undefined,
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
    customAudienceFlow.reset(); // ✅ Reset custom audience flow

    setMessages([]);
    setMessage("");
    setAttachedFile(null);
    setIsLoading(false);

    setTimeout(() => {
      isResetRef.current = false;
    }, 100);

    toast({ title: "✅ Đã xóa", description: "Cuộc trò chuyện đã được xóa" });
  }, [creative, audience, clone, quickPost, customAudienceFlow, toast]);

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

  // Assign handleSend to ref for auto-retry
  handleSendRef.current = handleSend;

  return (
    <div className={cn(
      "flex flex-col bg-card border border-border rounded-xl shadow-sm h-full",
      fullWidth ? "w-full" : "max-w-2xl mx-auto"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-center gap-3 md:gap-3">
          {/* AI Avatar - Custom or Default */}
          <Avatar className="h-9 w-9 md:h-11 md:w-11 border-2 border-pink-300">
            <AvatarImage src={aiAvatarUrl} />
            <AvatarFallback className="bg-pink-600 text-white">
              <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-bold text-lg md:text-xl text-foreground leading-tight">
              {aiNickname || 'AI Assistant'}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              {isAnyFlowActive ? '🟢 Đang xử lý...' : 'Sẵn sàng hỗ trợ'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAnyFlowActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 px-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Hủy
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetChat}
              className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Xóa
            </Button>
          )}
        </div>
      </div>

      {/* Messages + Actions Container - Scrollable */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        userName={userName}
        creative={creative}
        audience={audience}
        clone={clone}
        quickPost={quickPost}
        campaignControl={campaignControl}
        ruleFlow={ruleFlow}
        customAudienceFlow={customAudienceFlow}
        selectableItems={selectableItems}
        labels={labels}
        labelAssignments={labelAssignments}
        onAssignLabel={handleAssignLabel}
        onRemoveLabel={handleRemoveLabel}
        addMessage={addMessage}
        setMessages={setMessages}
        setIsLoading={setIsLoading}
        getTokens={getTokens}
        refreshTokens={refreshTokens}
        user={user}
        handleCancel={handleCancel}
        handleQuickReply={handleQuickReply}
        removeAttachedFile={removeAttachedFile}
      />


      {/* Template Creator Modal - Popup with dark overlay */}
      {templateCreator.isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Dark overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={templateCreator.hideCreator}
          />
          {/* Modal content */}
          <div className="relative z-10 w-full max-w-4xl mx-4 bg-card rounded-lg shadow-2xl border border-border/50 p-6">
            <TemplateCreatorCard
              formData={templateCreator.formData}
              isSaving={templateCreator.isSaving}
              onUpdate={templateCreator.updateFormData}
              onSubmit={async () => {
                const result = await templateCreator.createTemplate();
                if (result.success) {
                  addMessage('assistant', `✅ Đã tạo template ${result.templateName} thành công!\n\nBạn có thể sử dụng ngay bằng cách gõ ${result.templateName} trong chat.`);
                }
              }}
              onCancel={templateCreator.hideCreator}
            />
          </div>
        </div>
      )}

      {/* Input Area - Fixed at bottom */}
      <ChatInputArea
        message={message}
        setMessage={setMessage}
        isLoading={isLoading}
        isAnyFlowActive={isAnyFlowActive}
        attachedFile={attachedFile}
        handleSend={handleSend}
        handleFileAttach={handleFileAttach}
        handleFileChange={handleFileChange}
        removeAttachedFile={removeAttachedFile}
        fileInputRef={fileInputRef}
      />

      {/* Basic Rule Dialog - Opened from Chat */}
      <AutomatedRulesDialog
        open={ruleFlow.showBasicDialog}
        onOpenChange={(open) => {
          if (!open) {
            ruleFlow.closeBasicDialog();
          }
        }}
        onSave={async (ruleData) => {
          try {
            await createRule({
              ...ruleData,
              user_id: user?.id,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            sonnerToast.success('Đã tạo quy tắc mới!');
            addMessage('assistant', '✅ Đã tạo quy tắc thành công!');
            ruleFlow.reset();
          } catch (error: any) {
            sonnerToast.error('Lỗi khi tạo quy tắc: ' + error.message);
          }
        }}
        userId={user?.id}
        availableLabels={labels}
        onLabelsChange={async () => {
          if (user?.id) {
            const userLabels = await getLabelsByUserId(user.id);
            setLabels(userLabels);
          }
        }}
        currency={settings?.currency || 'VND'}
      />
    </div>
  );
};


export default AIChatPanel;
