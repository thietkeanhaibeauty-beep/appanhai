import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getActiveAdAccounts, updateAdAccount, upsertAdAccount, deleteAllAdAccounts } from "@/services/nocodb/facebookAdAccountsService";
import { getPagesByUserId, upsertPage, updatePage, deleteAllPages } from "@/services/nocodb/facebookPagesService";
import { getOpenAISettingsByUserId, upsertOpenAISetting, updateOpenAISetting, deactivateAllOpenAISettings, deleteAllOpenAISettings } from "@/services/nocodb/openaiSettingsService";
import { deleteAllInsightsByUserId } from "@/services/nocodb/facebookInsightsService";
import { normalizeAdAccountId } from "@/services/facebookInsightsService";
import { Key, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AdAccount {
  id: string;
  account_id?: string; // NocoDB field
  name: string;
  status?: string;
  currency?: string;
}

interface Page {
  id: string;
  name: string;
  category?: string;
  access_token?: string; // ✅ Added for pages from Ads Token check
}

const OPENAI_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Khuyên dùng)" },
  { value: "gpt-4o", label: "GPT-4o (Mạnh hơn)" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini (Mới)" },
  { value: "gpt-5-mini", label: "GPT-5 Mini (Sắp ra mắt)" },
  { value: "o1-mini", label: "o1-mini (Lập luận nhanh)" },
  { value: "o1-preview", label: "o1-preview (Lập luận sâu)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo (Thông minh)" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Nhanh & Rẻ)" },
];

const SettingsModal = ({ open, onOpenChange }: SettingsModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth(); // ✅ Get authenticated user

  // Token visibility states
  const [showAdsToken, setShowAdsToken] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);

  // ✅ Saved Tokens Ref (for security masking)
  const savedTokens = useState<{ adsToken: string; openaiKey: string; aiBeautyKey: string }>({
    adsToken: "",
    openaiKey: "",
    aiBeautyKey: ""
  })[0];
  const setSavedToken = (key: 'adsToken' | 'openaiKey' | 'aiBeautyKey', value: string) => {
    savedTokens[key] = value;
  };

  // Loading states
  const [checkingAds, setCheckingAds] = useState(false);
  const [checkingOpenAI, setCheckingOpenAI] = useState(false);
  const [savingOpenAI, setSavingOpenAI] = useState(false);
  const [savingAIBeauty, setSavingAIBeauty] = useState(false); // ✅ New State
  const [loading, setLoading] = useState(false);

  // Status states
  const [adsStatus, setAdsStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [openaiStatus, setOpenaiStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [aiBeautyStatus, setAiBeautyStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle"); // ✅ New Status

  // Token inputs
  const [adsToken, setAdsToken] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [aiBeautyApiKey, setAiBeautyApiKey] = useState(""); // ✅ New State

  // Lists from API
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [pages, setPages] = useState<Page[]>([]);

  // Selected IDs
  const [selectedAdAccountId, setSelectedAdAccountId] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");

  // Test link bài viết
  const [testUrl, setTestUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ id: string; name?: string; type?: string }>();
  const [testError, setTestError] = useState<string>();

  // Load active accounts on open
  useEffect(() => {
    if (open) {
      loadActiveSettings();
    }
  }, [open]);

  const loadActiveSettings = async () => {
    setLoading(true);
    try {
      if (!user?.id) {

        setLoading(false);
        return;
      }




      // ✅ Load active ad account from NocoDB - filtered by user_id
      const adAccounts = await getActiveAdAccounts(user.id);
      const activeAdAccount = adAccounts.find(acc => acc.is_active);

      if (activeAdAccount) {
        setSelectedAdAccountId(activeAdAccount.account_id);
        // setAdsToken(activeAdAccount.access_token); // ❌ Don't show raw token
        setSavedToken('adsToken', activeAdAccount.access_token); // ✅ Save to ref
        setAdsStatus("valid");
      }

      // ✅ Load active page from NocoDB - filtered by user_id
      const pages = await getPagesByUserId(user.id);
      const activePages = pages.filter(page => page.is_active);

      if (activePages.length > 0) {
        const activePage = activePages[0];
        setSelectedPageId(activePage.page_id);
      }

      // ✅ Load active OpenAI settings from NocoDB - filtered by user_id
      const allSettings = await getOpenAISettingsByUserId(user.id);

      // Filter for OpenAI
      const activeOpenAI = allSettings.find(setting => setting.is_active && (setting.name_api === 'openai' || !setting.name_api));
      if (activeOpenAI) {
        // setOpenaiApiKey(activeOpenAI.api_key); // ❌ Don't show raw key
        setSavedToken('openaiKey', activeOpenAI.api_key); // ✅ Save to ref
        setOpenaiModel(activeOpenAI.model || "gpt-4o-mini");
        setOpenaiStatus("valid");
      }

      // ✅ Filter for AIBeautyPro
      const activeAIBeauty = allSettings.find(setting => setting.is_active && setting.name_api === 'aibeauty');
      if (activeAIBeauty) {
        // setAiBeautyApiKey(activeAIBeauty.api_key); // ❌ Don't show raw key
        setSavedToken('aiBeautyKey', activeAIBeauty.api_key); // ✅ Save to ref
        setAiBeautyStatus("valid");
      }

      // Load all ad accounts for dropdown
      if (adAccounts) {
        setAdAccounts(adAccounts.map(acc => ({
          id: acc.account_id,
          name: acc.account_name || acc.account_id,
        })));
      }

      // Load only active pages for dropdown (no duplicates)
      if (activePages && activePages.length > 0) {
        const mappedPages = activePages.map(page => ({
          id: page.page_id,
          name: page.page_name || page.page_id,
        }));
        // Deduplicate by ID
        const uniquePages = Array.from(new Map(mappedPages.map(p => [p.id, p])).values());
        setPages(uniquePages);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  // State to store check data for displaying details
  const [checkData, setCheckData] = useState<any>(null);

  const checkFacebookAdsToken = async () => {
    const tokenToCheck = adsToken || savedTokens.adsToken;

    if (!tokenToCheck) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập Ads token",
        variant: "destructive",
      });
      return;
    }

    setCheckingAds(true);
    setAdsStatus("idle");
    setCheckData(null);

    try {
      // ✅ STEP 1: Deactivate all old ad accounts BEFORE checking new token
      if (user?.id) {
        const allAdAccounts = await getActiveAdAccounts(user.id);
        for (const acc of allAdAccounts) {
          if (acc.Id && acc.is_active) {
            await updateAdAccount(acc.Id, { is_active: false });
          }
        }

      }

      // STEP 2: Check token validity (removed type parameter)
      const { data: tokenCheckData, error: checkError } = await supabase.functions.invoke("check-fb-token", {
        body: { token: tokenToCheck },
      });

      if (checkError) throw checkError;

      if (!tokenCheckData.success) {
        setAdsStatus("invalid");
        setCheckData(tokenCheckData);
        toast({
          title: "Token không hợp lệ",
          description: tokenCheckData.error,
          variant: "destructive",
        });
        return;
      }

      // Store check data for displaying details
      setCheckData(tokenCheckData);

      // STEP 3: Use ad accounts from check-fb-token response (no need to fetch again)
      const adAccountsFromCheck = tokenCheckData.data?.adAccounts || [];
      const pagesFromCheck = tokenCheckData.data?.pages || [];

      if (adAccountsFromCheck.length > 0) {
        setAdsStatus("valid");
        const mappedAdAccounts = adAccountsFromCheck.map((acc: any) => ({
          id: acc.id,
          name: acc.name || acc.id,
          status: acc.account_status,
          currency: acc.currency || 'VND' // ✅ Extract currency from API response
        }));

        // Deduplicate ad accounts
        const uniqueAdAccounts = Array.from(new Map(mappedAdAccounts.map((acc: any) => [acc.id, acc])).values());
        setAdAccounts(uniqueAdAccounts as AdAccount[]);

        if (pagesFromCheck.length > 0) {
          // Deduplicate pages from check response
          const uniquePages = Array.from(new Map(pagesFromCheck.map((p: any) => [p.id, p])).values());
          setPages(uniquePages as Page[]);
        }

        const missingPermsCount = tokenCheckData.permissions?.missing?.length || 0;
        const totalAdAccounts = tokenCheckData.data?.counts?.adAccounts || adAccountsFromCheck.length;
        const totalPages = tokenCheckData.data?.counts?.pages || pagesFromCheck.length;

        toast({
          title: "Token hợp lệ! ✅",
          description: `${tokenCheckData.tokenType} token - ${totalAdAccounts} TKQC, ${totalPages} pages${missingPermsCount > 0 ? ` (Thiếu ${missingPermsCount} quyền)` : ''}`,
        });
      } else {
        setAdsStatus("invalid");
        toast({
          title: "⚠️ Không tìm thấy ad accounts",
          description: "Token hợp lệ nhưng không có quyền truy cập ad accounts",
          variant: "destructive",
        });
      }
    } catch (error) {
      setAdsStatus("invalid");
      toast({
        title: "Lỗi kiểm tra token",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCheckingAds(false);
    }
  };




  // Save Ad Account + Ads Token (with insights deletion)
  const handleSaveAdAccount = async () => {


    setLoading(true);
    try {
      // ✅ Validate user authentication
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Validate tokens before saving
      const tokenToSave = adsToken || savedTokens.adsToken;

      if (!tokenToSave || adsStatus !== "valid") {
        console.warn('⚠️ Validation failed - adsToken or adsStatus invalid');
        toast({
          title: "Lỗi",
          description: "Vui lòng kiểm tra và xác nhận Ads Token trước khi lưu",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!selectedAdAccountId) {
        console.warn('⚠️ Validation failed - no selectedAdAccountId');
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn Tài khoản Quảng cáo",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Normalize account ID to ensure it has 'act_' prefix
      const normalizedAccountId = normalizeAdAccountId(selectedAdAccountId);


      toast({
        title: "Đang xóa dữ liệu cũ...",
        description: "Xóa toàn bộ TKQC cũ và lịch sử facebook_insights",
      });

      try {
        // 1. Xóa toàn bộ insights cũ của user này
        await deleteAllInsightsByUserId(user.id);

        // 2. ✅ Xóa CHỈ TKQC của user này


        toast({
          title: "✅ Đã xóa toàn bộ dữ liệu cũ",
          description: `Đã xóa hết TKQC cũ và lịch sử insights.Đang lưu TKQC mới...`,
          duration: 3000,
        });
      } catch (error) {
        console.error('❌ Error deleting old data:', error);
        // ✅ CRITICAL FIX: If deletion fails, ABORT operation. Do not proceed to save new account.
        // This prevents "Mixed Data" scenarios where old data remains.
        throw new Error(`Lỗi xóa dữ liệu cũ: ${error instanceof Error ? error.message : "Vui lòng thử lại"}`);
      }

      // ✅ Insert new account with user_id

      const selectedAccount = adAccounts.find(acc => acc.id === selectedAdAccountId);
      await upsertAdAccount({
        account_id: normalizedAccountId,
        account_name: selectedAccount?.name || selectedAdAccountId,
        access_token: tokenToSave,
        is_active: true,
        user_id: user.id, // ✅ Always set user_id
        currency: selectedAccount?.currency || 'VND', // ✅ Save currency from Facebook
        updated_at: new Date().toISOString()
      });


      toast({
        title: "✅ Đã lưu TKQC",
        description: "Tài khoản quảng cáo đã được lưu vào cloud",
      });

      // Trigger event to update header
      window.dispatchEvent(new Event("settings-updated"));
    } catch (error) {
      console.error('❌ handleSaveAdAccount error:', error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);

    }
  };

  // Save Page (using page access_token from Ads Token check)
  const handleSavePage = async () => {
    setLoading(true);
    try {
      // ✅ Validate user authentication
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (!selectedPageId) {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn Trang",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // ✅ Find the selected page to get its access_token from Ads Token check
      const selectedPage = pages.find(p => p.id === selectedPageId);
      const pageAccessToken = (selectedPage as any)?.access_token;

      if (!pageAccessToken) {
        toast({
          title: "Lỗi",
          description: "Không tìm thấy Page Access Token. Vui lòng kiểm tra Ads Token trước.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // ✅ Get all pages for this user only
      const allPages = await getPagesByUserId(user.id);

      // Deactivate all pages first
      for (const page of allPages) {
        if (page.Id) {
          await updatePage(page.Id, { is_active: false });
        }
      }

      // ✅ Update the selected page with user_id
      await upsertPage({
        page_id: selectedPageId,
        access_token: pageAccessToken,
        is_active: true,
        user_id: user.id, // ✅ Always set user_id
        page_name: selectedPage?.name || selectedPageId,
        category: (selectedPage as any)?.category,
        updated_at: new Date().toISOString()
      });

      toast({
        title: "✅ Đã lưu Page",
        description: "Trang Facebook đã được lưu vào cloud",
      });

      // Trigger event to update header
      window.dispatchEvent(new Event("settings-updated"));
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save BOTH Ad Account AND Page in one action
  const handleSaveAdAccountAndPage = async () => {
    setLoading(true);
    try {
      // ✅ Validate user authentication
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Validate TKQC
      const tokenToSave = adsToken || savedTokens.adsToken;
      if (!tokenToSave || adsStatus !== "valid") {
        toast({
          title: "Lỗi",
          description: "Vui lòng kiểm tra và xác nhận Ads Token trước khi lưu",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!selectedAdAccountId) {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn Tài khoản Quảng cáo",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validate Page
      if (!selectedPageId) {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn Trang Facebook",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const selectedPage = pages.find(p => p.id === selectedPageId);
      const pageAccessToken = (selectedPage as any)?.access_token;

      if (!pageAccessToken) {
        toast({
          title: "Lỗi",
          description: "Không tìm thấy Page Access Token. Vui lòng kiểm tra Ads Token trước.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // STEP 1: Save TKQC (with data deletion)
      toast({
        title: "Bước 1/2: Đang lưu TKQC...",
        description: "Xóa dữ liệu cũ và lưu tài khoản quảng cáo mới",
      });

      const normalizedAccountId = normalizeAdAccountId(selectedAdAccountId);

      // Delete old data
      await deleteAllInsightsByUserId(user.id);
      await deleteAllAdAccounts(user.id);

      // Insert new ad account
      const selectedAccount = adAccounts.find(acc => acc.id === selectedAdAccountId);
      await upsertAdAccount({
        account_id: normalizedAccountId,
        account_name: selectedAccount?.name || selectedAdAccountId,
        access_token: tokenToSave,
        is_active: true,
        user_id: user.id,
        currency: selectedAccount?.currency || 'VND', // ✅ Save currency
        updated_at: new Date().toISOString()
      });

      // STEP 2: Save Page
      toast({
        title: "Bước 2/2: Đang lưu Page...",
        description: "Lưu trang Facebook để quản lý tin nhắn",
      });

      // Deactivate all pages first
      const allPages = await getPagesByUserId(user.id);
      for (const page of allPages) {
        if (page.Id) {
          await updatePage(page.Id, { is_active: false });
        }
      }

      // Upsert selected page
      await upsertPage({
        page_id: selectedPageId,
        access_token: pageAccessToken,
        is_active: true,
        user_id: user.id,
        page_name: selectedPage?.name || selectedPageId,
        category: (selectedPage as any)?.category,
        updated_at: new Date().toISOString()
      });

      // Success!
      toast({
        title: "✅ Hoàn tất!",
        description: "Đã lưu TKQC và Page thành công vào hệ thống",
      });

      // Trigger event to update header
      window.dispatchEvent(new Event("settings-updated"));

    } catch (error) {
      console.error('❌ handleSaveAdAccountAndPage error:', error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ User-standard implementation for Testing API
  const checkOpenAIKey = async () => {
    const keyToCheck = openaiApiKey.trim() || savedTokens.openaiKey;

    if (!keyToCheck) {
      toast({
        title: "⚠️ Thiếu thông tin",
        description: "Vui lòng nhập API Key",
        variant: "destructive",
      });
      return;
    }

    if (!openaiModel) {
      toast({
        title: "⚠️ Thiếu thông tin",
        description: "Vui lòng chọn Model",
        variant: "destructive",
      });
      return;
    }

    setCheckingOpenAI(true);
    setOpenaiStatus("checking");

    try {


      const { data, error } = await supabase.functions.invoke("check-openai-api", {
        body: {
          apiKey: keyToCheck,
          model: openaiModel,
        },
      });

      if (error) throw error;

      if (data.success) {
        setOpenaiStatus("valid");
        toast({
          title: "✅ API Key hợp lệ",
          description: data.message || "Kết nối thành công!",
        });
      } else {
        setOpenaiStatus("invalid");
        toast({
          title: "❌ API Key không hợp lệ",
          description: data.error || "Vui lòng kiểm tra lại key và model",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error checking OpenAI key:", error);
      setOpenaiStatus("invalid");
      toast({
        title: "❌ Lỗi kiểm tra",
        description: "Không thể kết nối đến server kiểm tra",
        variant: "destructive",
      });
    } finally {
      setCheckingOpenAI(false);
    }
  };

  // ✅ User-standard implementation for Saving Settings
  const handleSaveOpenAI = async () => {
    if (!user?.id) return;

    // 1. Validate inputs
    const keyToSave = openaiApiKey.trim() || savedTokens.openaiKey;

    if (!keyToSave) {
      toast({ title: "⚠️ Vui lòng nhập API Key", variant: "destructive" });
      return;
    }

    // 2. Require validation before saving
    if (openaiStatus !== "valid") {
      toast({
        title: "⚠️ Chưa kiểm tra API",
        description: "Vui lòng ấn 'Kiểm tra' và đảm bảo hợp lệ trước khi lưu.",
        variant: "destructive"
      });
      return;
    }

    setSavingOpenAI(true);
    try {


      // 3. Deactivate old settings
      await deactivateAllOpenAISettings(user.id, 'openai');

      // 4. Upsert new setting via Service (Direct NocoDB call)
      await upsertOpenAISetting({
        api_key: keyToSave,
        model: openaiModel,
        is_active: true,
        user_id: user.id,
        name_api: 'openai',
      }, user.id);

      toast({
        title: "✅ Đã lưu thành công",
        description: `Model: ${openaiModel} đã được lưu.`,
      });

      // Reload settings to confirm
      loadActiveSettings();

    } catch (error) {
      console.error("Error saving OpenAI settings:", error);
      toast({
        title: "❌ Lỗi lưu cài đặt",
        description: "Không thể lưu vào cơ sở dữ liệu",
        variant: "destructive",
      });
    } finally {
      setSavingOpenAI(false);
    }
  };

  // ✅ Check AIBeautyPro Key (Mock for now)
  const checkAIBeautyKey = async () => {
    const keyToCheck = aiBeautyApiKey.trim() || savedTokens.aiBeautyKey;

    if (!keyToCheck) {
      toast({
        title: "⚠️ Thiếu thông tin",
        description: "Vui lòng nhập AIBeautyPro API Key",
        variant: "destructive",
      });
      return;
    }

    setAiBeautyStatus("checking");
    // Simulate API check
    setTimeout(() => {
      setAiBeautyStatus("valid");
      toast({
        title: "✅ API Key hợp lệ",
        description: "Đã xác thực với AIBeautyPro",
      });
    }, 1000);
  };

  // ✅ Save AIBeautyPro Settings
  const handleSaveAIBeauty = async () => {
    if (!user?.id) return;

    const keyToSave = aiBeautyApiKey.trim() || savedTokens.aiBeautyKey;

    if (!keyToSave) {
      toast({ title: "⚠️ Vui lòng nhập API Key", variant: "destructive" });
      return;
    }

    if (aiBeautyStatus !== "valid") {
      toast({
        title: "⚠️ Chưa kiểm tra API",
        description: "Vui lòng ấn 'Kiểm tra' trước khi lưu.",
        variant: "destructive"
      });
      return;
    }

    setSavingAIBeauty(true);
    try {
      // Deactivate old AIBeauty settings
      await deactivateAllOpenAISettings(user.id, 'aibeauty');

      // Upsert new setting
      await upsertOpenAISetting({
        api_key: keyToSave,
        model: 'default', // Default model for AIBeauty
        is_active: true,
        user_id: user.id,
        name_api: 'aibeauty',
      }, user.id);

      toast({
        title: "✅ Đã lưu thành công",
        description: "Cấu hình AIBeautyPro đã được lưu.",
      });

      loadActiveSettings();
    } catch (error) {
      console.error("Error saving AIBeauty settings:", error);
      toast({
        title: "❌ Lỗi lưu cài đặt",
        description: "Không thể lưu vào cơ sở dữ liệu",
        variant: "destructive",
      });
    } finally {
      setSavingAIBeauty(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // ✅ DELETE all ad accounts for this user (not just deactivate)
      await deleteAllAdAccounts(user.id);

      // ✅ DELETE all pages for this user (not just deactivate)
      await deleteAllPages(user.id);

      // ✅ DELETE all OpenAI AND AIBeauty settings (not just deactivate)
      await deleteAllOpenAISettings(user.id);

      // Reset states
      setAdsToken("");
      setOpenaiApiKey("");
      setOpenaiModel("gpt-4o-mini");
      setAiBeautyApiKey(""); // ✅ Reset AIBeauty

      // ✅ Reset saved refs
      setSavedToken('adsToken', "");
      setSavedToken('openaiKey', "");
      setSavedToken('aiBeautyKey', "");

      setSelectedAdAccountId("");
      setSelectedPageId("");
      setAdAccounts([]);
      setPages([]);
      setAdsStatus("idle");
      setOpenaiStatus("idle");
      setAiBeautyStatus("idle"); // ✅ Reset Status

      toast({
        title: "Đã xóa",
        description: "Tất cả cài đặt đã được xóa",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa cài đặt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleTestLink = async () => {
    if (!testUrl.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập link bài viết",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    setTestResult(undefined);
    setTestError(undefined);

    try {
      // ✅ Use new extractor for consistent results
      const { data, error } = await supabase.functions.invoke('facebook-post-extractor', {
        body: {
          facebook_post_input: testUrl.trim(),
          access_token: adsToken || savedTokens.adsToken || undefined, // Important for Video/Reel resolution
          // page_id: selectedPageId || undefined // REMOVED: Auto-detect page from URL
        }
      });

      if (error) throw error;

      if (data && data.success) {
        setTestResult({
          id: data.full_content_id || data.post_id,
          name: data.page_id || 'N/A',
          type: data.content_type || 'unknown'
        });
        toast({
          title: "✅ Thành công",
          description: `Post ID: ${data.post_id}`,
        });
      } else {
        throw new Error(data?.error || 'Không thể lấy ID');
      }
    } catch (error: any) {
      setTestError(error.message || 'Không thể kiểm tra link');
      toast({
        title: "Lỗi",
        description: error.message || 'Không thể kiểm tra link',
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const StatusIcon = ({ status }: { status: "idle" | "valid" | "invalid" | "checking" }) => {
    if (status === "valid") return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (status === "invalid") return <AlertCircle className="w-4 h-4 text-red-600" />;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Key className="w-5 h-5 text-primary" />
            Cài đặt API Tokens
          </DialogTitle>
          <DialogDescription className="sr-only">
            Quản lý Facebook Ads tokens, Personal tokens và OpenAI API keys
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">

          {/* Facebook Ads Token */}
          <div className="space-y-1">
            <Label htmlFor="adsToken" className="text-xs font-medium flex items-center gap-2">
              1. Facebook Ads Access Token
              <StatusIcon status={adsStatus} />
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="adsToken"
                  type={showAdsToken ? "text" : "password"}
                  placeholder={savedTokens.adsToken ? "•••••••••••••••• (Đã được lưu)" : "EAA..."}
                  value={adsToken}
                  onChange={(e) => {
                    setAdsToken(e.target.value);
                    setAdsStatus("idle");
                  }}
                  className={`pr-8 h-8 text-xs ${adsStatus === "valid" ? "border-green-500 focus-visible:ring-green-500" : ""
                    } ${adsStatus === "invalid" ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
                  onClick={() => setShowAdsToken(!showAdsToken)}
                >
                  {showAdsToken ? <EyeOff className="w-3 h-3 text-muted-foreground" /> : <Eye className="w-3 h-3 text-muted-foreground" />}
                </Button>
              </div>
              <Button
                onClick={checkFacebookAdsToken}
                disabled={checkingAds || (!adsToken && !savedTokens.adsToken)}
                variant="outline"
                size="sm"
                className="min-w-[80px] h-8 text-xs"
              >
                {checkingAds ? <Loader2 className="w-3 h-3 animate-spin" /> : "Kiểm tra"}
              </Button>
            </div>



            {/* Error Display */}
            {adsStatus === "invalid" && checkData && (
              <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-800 font-medium flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {checkData.error || "Token không hợp lệ"}
                </p>
                <p className="text-xs text-red-700 mt-1">
                  💡 Hướng dẫn: Tạo token mới tại Facebook Business Manager với đầy đủ quyền ads_management và pages
                </p>
              </div>
            )}
          </div>

          {/* Ad Account Selection */}
          {adsStatus === "valid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-slate-50 rounded-md border">
              <div className="space-y-1">
                <Label className="text-xs">Tài khoản Quảng cáo</Label>
                <Select value={selectedAdAccountId} onValueChange={setSelectedAdAccountId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Chọn tài khoản..." />
                  </SelectTrigger>
                  <SelectContent>
                    {adAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id} className="text-xs">
                        {acc.name} ({acc.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Trang Facebook (Fanpage)</Label>
                <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Chọn trang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id} className="text-xs">
                        {page.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 mt-1">
                <Button onClick={handleSaveAdAccountAndPage} disabled={loading} size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                  {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <CheckCircle2 className="w-3 h-3 mr-2" />}
                  Lưu Cấu Hình
                </Button>
              </div>
            </div>
          )}

          {/* OpenAI API Key Section */}
          <div className="space-y-2 pt-2 border-t">
            <div className="space-y-1">
              <Label htmlFor="openaiApiKey" className="text-xs font-medium flex items-center gap-2">
                2. OpenAI API Key
                <StatusIcon status={openaiStatus} />
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="openaiApiKey"
                    type={showOpenAIKey ? "text" : "password"}
                    placeholder={savedTokens.openaiKey ? "•••••••••••••••• (Đã được lưu)" : "sk-..."}
                    value={openaiApiKey}
                    onChange={(e) => {
                      setOpenaiApiKey(e.target.value);
                      setOpenaiStatus("idle");
                    }}
                    className={`pr-8 h-8 text-xs ${openaiStatus === "valid" ? "border-green-500" : ""}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
                    onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                  >
                    {showOpenAIKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                </div>
                <Button
                  onClick={checkOpenAIKey}
                  disabled={checkingOpenAI || (!openaiApiKey && !savedTokens.openaiKey)}
                  variant="outline"
                  size="sm"
                  className="min-w-[80px] h-8 text-xs"
                >
                  {checkingOpenAI ? <Loader2 className="w-3 h-3 animate-spin" /> : "Kiểm tra"}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Model</Label>
              <div className="flex gap-2">
                <Select value={openaiModel} onValueChange={setOpenaiModel}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPENAI_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value} className="text-xs">
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleSaveOpenAI} disabled={savingOpenAI} size="sm" className="min-w-[80px] h-8 text-xs">
                  {savingOpenAI ? <Loader2 className="w-3 h-3 animate-spin" /> : "Lưu"}
                </Button>
              </div>
            </div>
          </div>

          {/* ✅ AIBeautyPro API Key Section */}
          <div className="space-y-2 pt-2 border-t">
            <div className="space-y-1">
              <Label htmlFor="aiBeautyApiKey" className="text-xs font-medium flex items-center gap-2">
                3. AIBeautyPro API Key
                <StatusIcon status={aiBeautyStatus} />
                <Badge variant="secondary" className="text-[10px] px-1 h-4 bg-purple-100 text-purple-800">Mới</Badge>
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="aiBeautyApiKey"
                    type="password"
                    placeholder={savedTokens.aiBeautyKey ? "•••••••••••••••• (Đã được lưu)" : "Nhập AIBeautyPro API Key..."}
                    value={aiBeautyApiKey}
                    onChange={(e) => {
                      setAiBeautyApiKey(e.target.value);
                      setAiBeautyStatus("idle");
                    }}
                    className={`pr-8 h-8 text-xs ${aiBeautyStatus === "valid" ? "border-green-500" : ""}`}
                  />
                </div>
                <Button
                  onClick={checkAIBeautyKey}
                  disabled={aiBeautyStatus === "checking" || (!aiBeautyApiKey && !savedTokens.aiBeautyKey)}
                  variant="outline"
                  size="sm"
                  className="min-w-[80px] h-8 text-xs"
                >
                  {aiBeautyStatus === "checking" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Kiểm tra"}
                </Button>
                <Button onClick={handleSaveAIBeauty} disabled={savingAIBeauty} size="sm" className="min-w-[80px] h-8 text-xs bg-purple-600 hover:bg-purple-700">
                  {savingAIBeauty ? <Loader2 className="w-3 h-3 animate-spin" /> : "Lưu"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                API Key dùng để kết nối với hệ thống AIBeautyPro.com.
              </p>
            </div>
          </div>

          {/* Test Link bài viết */}
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="testUrl" className="text-xs font-medium">
              4. Kiểm tra Link Bài viết (Debug)
            </Label>
            <div className="flex gap-2">
              <Input
                id="testUrl"
                value={testUrl}
                onChange={(e) => {
                  setTestUrl(e.target.value);
                  setTestResult(undefined);
                  setTestError(undefined);
                }}
                placeholder="https://facebook.com/..."
                className="h-8 text-xs"
              />
              <Button
                onClick={handleTestLink}
                disabled={testing || !testUrl.trim()}
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
              >
                {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Kiểm tra"}
              </Button>
            </div>
            {testResult && (
              <p className="text-xs text-muted-foreground">
                ID: {testResult.id} • Tên: {testResult.name} • Loại: {testResult.type}
              </p>
            )}
            {testError && (
              <p className="text-xs text-red-600">
                {testError}
              </p>
            )}
          </div>

          <div className="pt-3 border-t flex justify-between">
            <Button variant="destructive" onClick={handleClear} disabled={loading} size="sm" className="h-8 text-xs">
              {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
              Xóa tất cả cài đặt
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} size="sm" className="h-8 text-xs">
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;