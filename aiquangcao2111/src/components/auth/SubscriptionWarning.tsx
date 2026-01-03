import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Sparkles, Crown } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

/**
 * Warning banner for trial users and expiring subscriptions
 */
export const SubscriptionWarning: React.FC = () => {
  const { subscription, isTrial, daysRemaining, isExpiringSoon, hasActiveSubscription } = useSubscription();
  const navigate = useNavigate();

  if (!hasActiveSubscription) return null;

  // Show warning for trial or expiring subscription
  if (!isTrial && !isExpiringSoon) return null;

  const handleUpgrade = () => {
    // TODO: Navigate to subscription/pricing page
    navigate('/home');
  };

  return (
    <Alert variant={isTrial ? 'default' : 'destructive'} className="mb-4">
      {isTrial ? (
        <Sparkles className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertTitle className="flex items-center gap-2">
        {isTrial ? 'Trial Account' : 'Subscription Expiring Soon'}
        <Badge variant={isTrial ? 'secondary' : 'destructive'}>
          {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
        </Badge>
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          {isTrial
            ? 'Upgrade to unlock all features and continue after trial ends.'
            : 'Your subscription will expire soon. Upgrade to continue accessing premium features.'
          }
        </span>
        <Button
          onClick={handleUpgrade}
          variant={isTrial ? 'default' : 'destructive'}
          size="sm"
          className="ml-4"
        >
          <Crown className="mr-2 h-4 w-4" />
          Upgrade Now
        </Button>
      </AlertDescription>
    </Alert>
  );
};
