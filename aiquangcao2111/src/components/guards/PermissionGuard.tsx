/**
 * PermissionGuard Component
 * Kiểm tra quyền truy cập dựa trên role của user
 */

import React from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { MemberRole } from '@/services/nocodb/workspaceMembersService';
import { Navigate } from 'react-router-dom';

interface PermissionGuardProps {
    /**
     * Roles được phép truy cập
     * Owner luôn có quyền với mọi route
     */
    allowedRoles: MemberRole[];

    /**
     * Children component sẽ render nếu có quyền
     */
    children: React.ReactNode;

    /**
     * Redirect URL nếu không có quyền (default: /)
     */
    redirectTo?: string;

    /**
     * Hiển thị fallback component thay vì redirect
     */
    fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    allowedRoles,
    children,
    redirectTo = '/',
    fallback,
}) => {
    const { role, loading, hasPermission } = useWorkspace();

    // Đang load workspace info
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Kiểm tra quyền
    const hasAccess = hasPermission(allowedRoles);

    if (!hasAccess) {
        // Hiển thị fallback nếu có
        if (fallback) {
            return <>{fallback}</>;
        }

        // Redirect nếu không có quyền
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
};

/**
 * No Access Fallback Component
 */
export const NoAccessFallback: React.FC<{ message?: string }> = ({
    message = "Bạn không có quyền truy cập tính năng này"
}) => {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Không có quyền truy cập
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
                {message}
            </p>
        </div>
    );
};

/**
 * Marketing Only Guard - Shorthand cho MKT routes
 */
export const MarketingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <PermissionGuard
        allowedRoles={['marketing', 'admin', 'owner']}
        fallback={<NoAccessFallback message="Tính năng này chỉ dành cho team Marketing" />}
    >
        {children}
    </PermissionGuard>
);

/**
 * Sales Only Guard - Shorthand cho Sales routes
 */
export const SalesGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <PermissionGuard
        allowedRoles={['sales', 'admin', 'owner']}
        fallback={<NoAccessFallback message="Tính năng này chỉ dành cho team Sales" />}
    >
        {children}
    </PermissionGuard>
);

/**
 * Admin Only Guard - Shorthand cho Admin routes
 */
export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <PermissionGuard
        allowedRoles={['admin', 'owner']}
        fallback={<NoAccessFallback message="Tính năng này chỉ dành cho Admin" />}
    >
        {children}
    </PermissionGuard>
);

/**
 * Owner Only Guard - Shorthand cho Owner-only routes
 */
export const OwnerGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <PermissionGuard
        allowedRoles={['owner']}
        fallback={<NoAccessFallback message="Tính năng này chỉ dành cho chủ tài khoản" />}
    >
        {children}
    </PermissionGuard>
);

// ============================================================================
// SUBSCRIPTION-BASED GUARDS
// ============================================================================

import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles } from 'lucide-react';

/**
 * Upgrade Prompt Component - Hiển thị khi user cần nâng cấp
 */
export const UpgradePrompt: React.FC<{
    feature?: string;
    message?: string;
}> = ({ feature, message }) => {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-center p-6">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
                <Crown className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Tính năng Pro
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
                {message || `Nâng cấp lên gói Pro để sử dụng tính năng ${feature || 'này'}.`}
            </p>
            <Button
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                onClick={() => window.location.href = '/pricing'}
            >
                <Sparkles className="w-4 h-4 mr-2" />
                Nâng cấp Pro
            </Button>
        </div>
    );
};

/**
 * Pro Guard - Chỉ cho user Pro+ truy cập
 */
export const ProGuard: React.FC<{
    children: React.ReactNode;
    feature?: string;
}> = ({ children, feature }) => {
    const { tier, loading, canAccess } = useSubscription();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Trial và Pro+ có quyền truy cập
    if (tier === 'trial' || tier === 'pro' || tier === 'enterprise') {
        return <>{children}</>;
    }

    // Starter không có quyền
    return <UpgradePrompt feature={feature} />;
};

/**
 * Feature Guard - Check cả role và subscription
 */
export const FeatureGuard: React.FC<{
    children: React.ReactNode;
    feature: string;
    allowedRoles?: MemberRole[];
}> = ({ children, feature, allowedRoles = ['marketing', 'admin', 'owner'] }) => {
    const { canAccess, loading: subLoading } = useSubscription();
    const { hasPermission, loading: roleLoading } = useWorkspace();

    if (subLoading || roleLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Check role first
    if (!hasPermission(allowedRoles)) {
        return <NoAccessFallback message="Bạn không có quyền truy cập tính năng này" />;
    }

    // Check subscription tier
    if (!canAccess(feature)) {
        return <UpgradePrompt feature={feature} />;
    }

    return <>{children}</>;
};
