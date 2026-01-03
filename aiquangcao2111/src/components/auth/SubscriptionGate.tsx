import React, { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Loader2 } from 'lucide-react';
import { UpgradePrompt } from './UpgradePrompt';

interface SubscriptionGateProps {
  children: ReactNode;
  feature?: string;
  requiredFeature?: string;
  fallback?: ReactNode;
}

/**
 * Gate component that checks if user has active subscription
 * Shows upgrade prompt if subscription is expired or missing
 */
export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ 
  children, 
  feature,
  requiredFeature,
  fallback 
}) => {
  const { subscription, loading, hasActiveSubscription, isTrial } = useSubscription();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user has active subscription
  if (!hasActiveSubscription) {
    return fallback || <UpgradePrompt reason="no_subscription" />;
  }

  // Check if trial and trying to access premium feature
  if (isTrial && requiredFeature === 'premium') {
    return fallback || <UpgradePrompt reason="trial_limitation" feature={feature} />;
  }

  // All checks passed, render children
  return <>{children}</>;
};
