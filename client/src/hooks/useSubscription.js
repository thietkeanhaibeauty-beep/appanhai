import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { initNocoDB, TABLE_IDS, NOCODB_URL, NOCODB_TOKEN } from '../services/api';

/**
 * Hook to manage user subscription state
 * Now fetches directly from NocoDB for consistent state with UserMenu
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

                // Initialize NocoDB to ensure TABLE_IDS are loaded
                await initNocoDB();

                const tableId = TABLE_IDS.Subscriptions || TABLE_IDS.subscriptions || 'myjov622ntt3j73';
                const baseUrl = NOCODB_URL || 'https://db.hpb.edu.vn';
                const token = NOCODB_TOKEN || '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';

                // Fetch latest subscription for user
                const response = await fetch(
                    `${baseUrl}/api/v2/tables/${tableId}/records?where=(user_id,eq,${user.id})&sort=-CreatedAt&limit=1`,
                    { headers: { 'xc-token': token } }
                );

                let subData = { isActive: false, tier: 'trial', features: {}, endDate: null };

                if (response.ok) {
                    const data = await response.json();
                    if (data.list && data.list.length > 0) {
                        const sub = data.list[0];
                        const status = sub.status;
                        const pkgId = sub.package_id;

                        // Map package_id to standard tier names if needed
                        let tier = 'trial';
                        if (status === 'active') {
                            tier = pkgId; // 'Starter', 'Pro', 'HocVien'
                        } else if (status === 'expired') {
                            tier = 'expired';
                        }

                        subData = {
                            isActive: status === 'active',
                            tier: tier,
                            features: {}, // Feature flags can be mapped here if needed later
                            endDate: sub.end_date
                        };
                    }
                }

                setSubscription(subData);

            } catch (err) {
                console.error('Error fetching subscription:', err);
                setError('Failed to fetch subscription');
                // Default to trial on error to allow basic access
                setSubscription({ isActive: false, tier: 'trial', features: {} });
            } finally {
                setLoading(false);
            }
        };

        fetchSubscription();
    }, [user]);

    // Check if user has active subscription (for gatekeeping)
    const hasActiveSubscription = subscription?.isActive || false;

    // Check if subscription is strictly 'trial' (for showing upgrades/banners)
    // IMPORTANT: 'Starter', 'Pro', 'HocVien' are NOT trial
    const isTrial = subscription?.tier === 'trial' || (!subscription?.isActive && subscription?.tier !== 'expired');

    const canAccess = useCallback((feature) => {
        // Placeholder for feature access logic
        return true;
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
