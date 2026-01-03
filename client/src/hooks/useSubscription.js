import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';

/**
 * Hook to manage user subscription state
 * Simplified version for App Chi Nhánh
 */
export const useSubscription = () => {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSubscription = async () => {
            if (!user) {
                setSubscription(null);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Call Edge Function to get subscription info
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ljpownumtmclnrtnqldt.supabase.co';
                const { data: { session } } = await supabase.auth.getSession();

                // For now, just check if user has a subscription via the trial function
                // In a more complete implementation, you'd have a get-subscription function

                // Use feature flags to determine if user has active subscription
                const response = await fetch(`${supabaseUrl}/functions/v1/get-feature-flags`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    // If user has features, they have an active subscription
                    const hasFeatures = data.features && Object.keys(data.features).length > 0;

                    setSubscription({
                        isActive: hasFeatures,
                        tier: hasFeatures ? 'trial' : null,
                        features: data.features || {},
                    });
                } else {
                    setSubscription({ isActive: false, tier: null, features: {} });
                }

            } catch (err) {
                console.error('Error fetching subscription:', err);
                setError('Failed to fetch subscription');
                setSubscription({ isActive: false, tier: null, features: {} });
            } finally {
                setLoading(false);
            }
        };

        fetchSubscription();
    }, [user]);

    // Check if user has active subscription
    const hasActiveSubscription = subscription?.isActive || false;

    // Check if subscription is trial
    const isTrial = subscription?.tier === 'trial';

    // Check if user can access a feature
    const canAccess = useCallback((feature) => {
        if (!subscription?.features) return false;
        const featureData = subscription.features[feature];
        return featureData?.enabled || false;
    }, [subscription]);

    return {
        subscription,
        loading,
        error,
        hasActiveSubscription,
        isTrial,
        canAccess,
    };
};

export default useSubscription;
