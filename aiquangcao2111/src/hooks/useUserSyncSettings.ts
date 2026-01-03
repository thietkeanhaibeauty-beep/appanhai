import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSyncSettings, upsertUserSyncSettings, UserSyncSettings } from '@/services/nocodb/userSyncSettingsService';
import { toast } from 'sonner';

/**
 * Hook to manage user's auto-sync settings stored in NocoDB
 * Replaces localStorage-based sync settings for cross-device sync
 */
export const useUserSyncSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSyncSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        const data = await getUserSyncSettings(user.id);
        setSettings(data);
      } catch (error) {
        console.error('Failed to load sync settings:', error);
        toast.error('Không thể tải cài đặt đồng bộ');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.id]);

  // Update settings
  const updateSettings = useCallback(async (
    newSettings: Partial<Pick<UserSyncSettings, 'auto_sync_enabled' | 'sync_interval_seconds' | 'last_sync_at'>>
  ) => {
    if (!user?.id) {
      toast.error('Bạn cần đăng nhập để thay đổi cài đặt');
      return;
    }

    try {
      const updated = await upsertUserSyncSettings(user.id, newSettings);
      // Ensure state reflects the full record from database
      if (updated) {
        setSettings(updated);
      }
      toast.success('Đã lưu cài đặt đồng bộ');
      return updated;
    } catch (error) {
      console.error('Failed to update sync settings:', error);
      toast.error('Không thể lưu cài đặt');
      throw error;
    }
  }, [user?.id]);

  return {
    settings,
    loading,
    updateSettings,
    // Convert NocoDB numeric boolean (0/1) to JS boolean
    // Use Number() to handle both string and number types from API
    autoSyncEnabled: Number(settings?.auto_sync_enabled) === 1,
    syncIntervalSeconds: Number(settings?.sync_interval_seconds ?? 120),
  };
};
