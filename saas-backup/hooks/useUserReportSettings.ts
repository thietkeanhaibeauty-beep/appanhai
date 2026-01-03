import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, updateUserProfile, UserProfile } from '@/services/nocodb/profilesService';
import { debounce } from 'lodash';

export interface ReportSettings {
    selectedFields?: string[];
    selectedMarketingMetrics?: string[];
    marketingMetricOrder?: string[];
    // Add other settings here as needed
    [key: string]: any;
}

const DEFAULT_SETTINGS: ReportSettings = {
    selectedFields: [
        'effective_status',
        'campaign_name',
        'spend',
        'results_messaging_replied_7d',
        'cost_per_messaging_replied_7d',
        'impressions',
        'clicks',
        'ctr',
        'phones',
        'cost_per_phone'
    ],
    selectedMarketingMetrics: [
        'spend', 'results', 'costPerResult', 'impressions', 'clicks', 'ctr'
    ],
    marketingMetricOrder: [
        'spend', 'results', 'costPerResult', 'impressions', 'clicks', 'ctr',
        'budget', 'phones', 'costPerPhone', 'dailyMarketingCost'
    ]
};

export const useUserReportSettings = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<ReportSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            if (!user?.id) return;

            try {
                setLoading(true);
                const profile = await getUserProfile(user.id);
                if (profile?.report_settings) {
                    // Merge with defaults to ensure all fields exist
                    setSettings(prev => ({
                        ...DEFAULT_SETTINGS,
                        ...profile.report_settings
                    }));
                }
            } catch (err) {
                console.error('❌ Error loading report settings:', err);
                setError('Failed to load settings');
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [user?.id]);

    // Ref to keep track of latest settings for debounced save
    const settingsRef = useRef(settings);
    const debouncedSave = useCallback(
        debounce(async (newSettings: ReportSettings, userId: string) => {
            try {
                await updateUserProfile(userId, {
                    report_settings: newSettings
                });
                console.log('✅ Report settings saved to DB');
            } catch (err) {
                console.error('❌ Error saving report settings:', err);
            }
        }, 1000),
        []
    );

    // Update settings handler
    const updateSettings = useCallback((updates: Partial<ReportSettings>) => {
        if (!user?.id) return;

        setSettings(prev => {
            const newSettings = { ...prev, ...updates };
            settingsRef.current = newSettings;

            // Trigger debounced save
            debouncedSave(newSettings, user.id);

            return newSettings;
        });
    }, [user?.id, debouncedSave]);

    return {
        settings,
        loading,
        error,
        updateSettings
    };
};
