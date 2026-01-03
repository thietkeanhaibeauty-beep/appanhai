import React from 'react';
import { Navigate } from 'react-router-dom';
import { useFeatures } from '@/hooks/useFeatures';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirect?: string;
}

/**
 * Component that controls access to features based on feature flags
 * 
 * @param feature - The feature key to check
 * @param children - Content to render if feature is enabled
 * @param fallback - Optional custom fallback content if feature is disabled
 * @param redirect - Optional redirect path if feature is disabled
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  redirect,
}) => {
  const { hasFeature, loading } = useFeatures();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if feature is enabled
  const isEnabled = hasFeature(feature);

  if (!isEnabled) {
    // Redirect if specified
    if (redirect) {
      return <Navigate to={redirect} replace />;
    }

    // Show custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default access denied message
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription className="mt-2">
            <strong>Tính năng chưa được kích hoạt</strong>
            <p className="mt-2">
              Bạn chưa có quyền truy cập tính năng này. Vui lòng liên hệ quản trị viên để được cấp quyền.
            </p>
            <p className="mt-2">
              <a href="/" className="underline">Quay về trang chủ</a>
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};
