import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveAdAccounts } from "@/services/nocodb/facebookAdAccountsService";
import { getAllPages } from "@/services/nocodb/facebookPagesService";
import { getOpenAISettingsByUserId } from "@/services/nocodb/openaiSettingsService";

interface Settings {
  adAccountId: string;
  adsToken: string;
  pageId: string;
  pageToken: string;
  openaiApiKey: string;
  openaiModel: string;
}

export const useSupabaseSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    } else {
      setLoading(false);
      setSettings(null);
    }

    // Listen for settings updates
    const handleSettingsUpdate = () => {
      if (user?.id) {
        loadSettings();
      }
    };

    window.addEventListener('settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('settings-updated', handleSettingsUpdate);
  }, [user?.id]);

  const loadSettings = async () => {
    if (!user?.id) {
      console.warn('⚠️ Cannot load settings: user not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Lấy Ad Account settings from NocoDB (filtered by user_id)
      const adAccounts = await getActiveAdAccounts(user.id);
      const activeAdAccount = adAccounts.find(acc => acc.is_active);

      // Lấy Page settings from NocoDB (filtered by user_id)
      const pages = await getAllPages(user.id);
      const activePage = pages.find(page => page.is_active);

      // Lấy OpenAI settings from NocoDB (filtered by user_id)
      const openaiSettings = await getOpenAISettingsByUserId(user.id);
      const activeOpenAI = openaiSettings.find(setting => setting.is_active);

      const newSettings = {
        adAccountId: activeAdAccount?.account_id || '',
        adsToken: activeAdAccount?.access_token || '',
        pageId: activePage?.page_id || '',
        pageToken: activePage?.access_token || '',
        openaiApiKey: activeOpenAI?.api_key || '',
        openaiModel: activeOpenAI?.model || 'gpt-4o-mini',
      };

      setSettings(newSettings);
      return newSettings;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error("❌ Error loading settings:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const hasAdsToken = Boolean(settings?.adsToken);
  const hasPageToken = Boolean(settings?.pageToken);
  const hasOpenAIKey = Boolean(settings?.openaiApiKey);

  return {
    settings,
    loading,
    error,
    hasAdsToken,
    hasPageToken,
    hasOpenAIKey,
    reload: loadSettings,
  };
};
