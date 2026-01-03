import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Crown,
  Rocket,
  Lock,
  Sparkles,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';

interface UpgradePromptProps {
  reason: 'no_subscription' | 'trial_limitation' | 'feature_limit';
  feature?: string;
}

/**
 * Component to prompt users to upgrade their subscription
 */
export const UpgradePrompt: React.FC<UpgradePromptProps> = ({ reason, feature }) => {
  const navigate = useNavigate();
  const { subscription, daysRemaining, isTrial } = useSubscription();

  const handleUpgrade = () => {
    // TODO: Navigate to subscription/pricing page when implemented
    navigate('/home');
  };

  const getMessage = () => {
    switch (reason) {
      case 'no_subscription':
        return {
          title: 'Subscription Required',
          description: 'You need an active subscription to access this feature.',
          icon: Lock,
          variant: 'destructive' as const,
        };
      case 'trial_limitation':
        return {
          title: 'Premium Feature',
          description: `${feature || 'This feature'} is only available in paid plans.`,
          icon: Crown,
          variant: 'default' as const,
        };
      case 'feature_limit':
        return {
          title: 'Limit Reached',
          description: `You've reached the limit for ${feature || 'this feature'} in your current plan.`,
          icon: Sparkles,
          variant: 'default' as const,
        };
      default:
        return {
          title: 'Upgrade Required',
          description: 'Upgrade your plan to continue.',
          icon: Rocket,
          variant: 'default' as const,
        };
    }
  };

  const { title, description, icon: Icon, variant } = getMessage();

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isTrial && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Trial Account</AlertTitle>
              <AlertDescription>
                You have <Badge variant="secondary">{daysRemaining} days</Badge> remaining in your trial.
                Upgrade now to unlock all features!
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Upgrade to unlock:
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Unlimited campaigns and ad accounts
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Advanced AI features and automation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Priority support and analytics
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Custom integrations and reporting
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleUpgrade}
              className="flex-1"
              size="lg"
            >
              <Crown className="mr-2 h-4 w-4" />
              Upgrade Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              onClick={() => navigate('/home')}
              variant="outline"
              size="lg"
            >
              Back to Dashboard
            </Button>
          </div>

          {subscription && (
            <div className="text-xs text-muted-foreground text-center pt-4 border-t">
              Current plan: <Badge variant="outline">{subscription.package_id}</Badge>
              {' • '}
              Status: <Badge variant={subscription.status === 'trial' ? 'secondary' : 'default'}>
                {subscription.status}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
