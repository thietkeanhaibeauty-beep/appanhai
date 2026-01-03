import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getActiveAdAccounts } from "@/services/nocodb/facebookAdAccountsService";
import { getPagesByUserId } from "@/services/nocodb/facebookPagesService";
import { getOpenAISettingsByUserId } from "@/services/nocodb/openaiSettingsService";
import { useAuth } from "@/contexts/AuthContext";

interface Settings {
  adAccountId: string;
  adsToken: string;
  pageId: string;
  pageToken: string;
  openaiApiKey: string;
  openaiModel: string;
  currency: string; // Currency of the active ad account
}

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  hasAdsToken: boolean;
  hasPageToken: boolean;
  hasOpenAIKey: boolean;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      // ✅ CRITICAL: Only load settings if user is authenticated
      if (!user?.id) {

        setSettings(null);
        setLoading(false);
        return;
      }

      // Chỉ set loading = true nếu chưa có settings (first load)
      if (!settings) {
        setLoading(true);
      }
      setError(null);



      // ✅ Lấy Ad Account settings from NocoDB - filtered by user_id
      const adAccounts = await getActiveAdAccounts(user.id);
      const activeAdAccount = adAccounts.find(acc => acc.is_active);

      // ✅ Lấy Page settings from NocoDB - filtered by user_id
      const pages = await getPagesByUserId(user.id);
      const activePage = pages.find(page => page.is_active);

      // ✅ Lấy OpenAI settings from NocoDB - filtered by user_id
      const openaiSettings = await getOpenAISettingsByUserId(user.id);
      const activeOpenAI = openaiSettings.find(setting => setting.is_active);

      setSettings({
        adAccountId: activeAdAccount?.account_id || '',
        adsToken: activeAdAccount?.access_token || '',
        pageId: activePage?.page_id || '',
        pageToken: activePage?.access_token || '',
        openaiApiKey: activeOpenAI?.api_key || '',
        openaiModel: activeOpenAI?.model || 'gpt-4o-mini',
        currency: activeAdAccount?.currency || 'VND', // Use currency from active account
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();

    // Listen for settings updates
    const handleSettingsUpdate = () => {
      loadSettings();
    };

    window.addEventListener('settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('settings-updated', handleSettingsUpdate);
  }, [user?.id]); // ✅ Reload settings when user changes

  const hasAdsToken = Boolean(settings?.adsToken);
  const hasPageToken = Boolean(settings?.pageToken);
  const hasOpenAIKey = Boolean(settings?.openaiApiKey);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        error,
        hasAdsToken,
        hasPageToken,
        hasOpenAIKey,
        reload: loadSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
