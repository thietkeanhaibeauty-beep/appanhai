import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';

/**
 * Hook to get feature flags for current user
 */
export const useFeatures = () => {
    const { user } = useAuth();
    const [features, setFeatures] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFeatures = async () => {
            if (!user) {
                setFeatures({});
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ljpownumtmclnrtnqldt.supabase.co';
                const { data: { session } } = await supabase.auth.getSession();

                const response = await fetch(`${supabaseUrl}/functions/v1/get-feature-flags`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setFeatures(data.features || {});
                } else {
                    console.warn('Failed to fetch features:', await response.text());
                    setFeatures({});
                }

            } catch (err) {
                console.error('Error fetching features:', err);
                setError('Failed to fetch features');
                setFeatures({});
            } finally {
                setLoading(false);
            }
        };

        fetchFeatures();
    }, [user]);

    // Check if a specific feature is enabled
    const hasFeature = useCallback((featureKey) => {
        const feature = features[featureKey];
        return feature?.enabled || false;
    }, [features]);

    // Get all enabled feature keys
    const enabledFeatures = Object.entries(features)
        .filter(([_, value]) => value.enabled)
        .map(([key, _]) => key);

    return {
        features,
        loading,
        error,
        hasFeature,
        enabledFeatures,
    };
};

export default useFeatures;
