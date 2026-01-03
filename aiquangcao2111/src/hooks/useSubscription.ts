import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveSubscription, getUserSubscriptions } from '@/services/nocodb/userSubscriptionsService';
import type { UserSubscription as NocoDBSubscription } from '@/services/nocodb/userSubscriptionsService';
import { getPaymentPackage, PaymentPackage } from '@/services/nocodb/paymentPackagesService';
import {
  SubscriptionTier,
  canAccessFeature,
  getTierFromPackageName,
  PRO_ONLY_FEATURES,
  TIER_CONFIG
} from '@/config/subscriptionConfig';
import { getMembershipByUserId } from '@/services/nocodb/workspaceMembersService';
import { getWorkspaceById } from '@/services/nocodb/workspacesService';

export interface UserSubscription {
  id: string;
  user_id: string;
  package_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface SubscriptionFeatures {
  max_campaigns?: number;
  max_ad_accounts?: number;
  ai_credits?: number;
  advanced_features?: boolean;
}

/**
 * Hook to manage user subscription state and features (NocoDB)
 * Hỗ trợ Workspace: Member dùng subscription của Owner
 */
export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [package_, setPackage] = useState<PaymentPackage | null>(null);
  const [tier, setTier] = useState<SubscriptionTier>('trial');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingOwnerSubscription, setIsUsingOwnerSubscription] = useState(false);

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

        // ========================================
        // Check workspace membership - use owner's subscription if member
        // ========================================
        let targetUserId = user.id;
        let usingOwnerSub = false;

        try {
          const membership = await getMembershipByUserId(user.id);
          if (membership && membership.role !== 'owner') {
            const workspace = await getWorkspaceById(membership.workspace_id);
            if (workspace?.owner_user_id) {
              targetUserId = workspace.owner_user_id;
              usingOwnerSub = true;
            }
          }
        } catch (wsErr) {
          console.warn('⚠️ Could not check workspace membership:', wsErr);
        }

        setIsUsingOwnerSubscription(usingOwnerSub);

        // Fetch active subscription from NocoDB (của owner nếu là member)
        const activeData = await getActiveSubscription(targetUserId);

        if (activeData) {
          // Check if subscription is expired - chỉ so sánh ngày, không so sánh giờ
          const now = new Date();
          now.setHours(0, 0, 0, 0); // Reset to start of day
          const endDate = new Date(activeData.end_date);
          endDate.setHours(23, 59, 59, 999); // Set to end of day

          const isExpired = endDate < now;

          // Convert NocoDB format to hook format
          // Tin tưởng status từ NocoDB nếu là active, chỉ override nếu thực sự expired
          const converted: UserSubscription = {
            id: String(activeData.Id || ''),
            user_id: activeData.user_id,
            package_id: activeData.package_id,
            status: isExpired ? 'expired' : activeData.status,
            start_date: activeData.start_date,
            end_date: activeData.end_date,
            auto_renew: activeData.auto_renew,
          };

          setSubscription(converted);

          // Fetch package to get tier
          if (activeData.package_id) {
            // package_id có thể là tên gói (Trial, Starter, Pro, Enterprise) hoặc ID số
            const packageIdOrName = activeData.package_id;

            // Thử xác định tier trực tiếp từ tên gói nếu là text
            const directTier = getTierFromPackageName(packageIdOrName);
            setTier(directTier);

            // Thử fetch package nếu là ID số
            if (/^\d+$/.test(packageIdOrName)) {
              try {
                const pkg = await getPaymentPackage(packageIdOrName);
                setPackage(pkg);
                setTier(getTierFromPackageName(pkg.name));
              } catch (pkgErr) {
                console.warn('⚠️ Could not fetch package by ID:', pkgErr);
              }
            }
          }
        } else {
          // Check for trial subscription (của owner nếu là member)
          const allSubs = await getUserSubscriptions(targetUserId);
          const trialSub = allSubs.find(s => s.status === 'trial');

          if (trialSub) {
            const now = new Date();
            const endDate = new Date(trialSub.end_date);

            const converted: UserSubscription = {
              id: String(trialSub.Id || ''),
              user_id: trialSub.user_id,
              package_id: trialSub.package_id,
              status: endDate < now ? 'expired' : trialSub.status,
              start_date: trialSub.start_date,
              end_date: trialSub.end_date,
              auto_renew: trialSub.auto_renew,
            };

            if (endDate < now) {

            }

            setSubscription(converted);
            setTier('trial'); // Trial subscription

            // Try to fetch package for trial
            if (trialSub.package_id) {
              try {
                if (/^\d+$/.test(trialSub.package_id)) {
                  const pkg = await getPaymentPackage(trialSub.package_id);
                  setPackage(pkg);
                } else {
                  // If package_id is a name (e.g. "Trial"), find it in all packages
                  const { getPaymentPackages } = await import('@/services/nocodb/paymentPackagesService');
                  const allPackages = await getPaymentPackages(true);
                  const pkg = allPackages.find(p => p.name === trialSub.package_id || p.name === 'Trial');
                  if (pkg) setPackage(pkg);
                }
              } catch (pkgErr) {
                console.warn('⚠️ Could not fetch trial package:', pkgErr);
              }
            }
          } else {
            setSubscription(null);
            setTier('trial'); // Default tier for no subscription
          }
        }


      } catch (err) {
        console.error('❌ Error fetching subscription:', err);
        setError('Failed to fetch subscription');
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  // Check if user has active subscription
  const hasActiveSubscription = (): boolean => {
    if (!subscription) return false;

    const now = new Date();
    const endDate = new Date(subscription.end_date);
    const startDate = new Date(subscription.start_date);

    // Reset to compare dates only
    now.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);

    // Check if current date is within subscription period
    const isActive = (subscription.status === 'active' || subscription.status === 'trial')
      && now >= startDate
      && endDate >= now;

    return isActive;
  };

  // Check if subscription is trial
  const isTrial = (): boolean => {
    return subscription?.status === 'trial' && hasActiveSubscription();
  };

  // Get days remaining
  const getDaysRemaining = (): number => {
    if (!subscription) return 0;

    const now = new Date();
    const endDate = new Date(subscription.end_date);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  };

  // Check if subscription is expiring soon (7 days)
  const isExpiringSoon = (): boolean => {
    const daysRemaining = getDaysRemaining();
    return daysRemaining > 0 && daysRemaining <= 7;
  };

  // Check if user can access a feature based on tier
  const canAccess = useCallback((feature: string): boolean => {
    return canAccessFeature(tier, feature);
  }, [tier]);

  // Check if feature is Pro-only
  const isProFeature = useCallback((feature: string): boolean => {
    return PRO_ONLY_FEATURES.includes(feature);
  }, []);

  // Get tokens limit for current tier
  const tokensLimit = TIER_CONFIG[tier]?.tokens || 0;

  return {
    subscription,
    package_,
    tier,
    loading,
    error,
    hasActiveSubscription: hasActiveSubscription(),
    isTrial: isTrial(),
    daysRemaining: getDaysRemaining(),
    isExpiringSoon: isExpiringSoon(),
    canAccess,
    isProFeature,
    tokensLimit,
    isUsingOwnerSubscription, // Cho biết đang dùng subscription của Owner
  };
};
