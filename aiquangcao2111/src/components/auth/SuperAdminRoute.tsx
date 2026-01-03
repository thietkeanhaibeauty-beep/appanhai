import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

/**
 * Protected route component that only allows Super Admin access
 */
export const SuperAdminRoute: React.FC<SuperAdminRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();

  // Show loading state while checking authentication and roles
  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Show access denied if not super admin
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="mt-2">
            <strong>Access Denied</strong>
            <p className="mt-2">
              You do not have permission to access this area. This page is restricted to Super Administrators only.
            </p>
            <p className="mt-2">
              <a href="/" className="underline">Return to Home</a>
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};
