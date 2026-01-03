import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    CheckCircle,
    XCircle,
    Crown,
    Zap,
    UserCheck,
    Calendar,
    Coins
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { PRO_ONLY_FEATURES, ENTERPRISE_ONLY_FEATURES } from '@/config/subscriptionConfig';
import { AVAILABLE_FEATURES } from '@/constants/availableFeatures';

/**
 * Component test subscription logic
 * Hiển thị thông tin subscription hiện tại và kiểm tra feature access
 */
export default function SubscriptionTest() {
    const {
        subscription,
        package_,
        tier,
        loading,
        hasActiveSubscription,
        isTrial,
        daysRemaining,
        isExpiringSoon,
        canAccess,
        isProFeature,
        tokensLimit,
    } = useSubscription();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Test Subscription Logic</h2>
                <p className="text-muted-foreground">
                    Kiểm tra subscription và feature access của user hiện tại
                </p>
            </div>

            {/* Subscription Info */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gói hiện tại</CardTitle>
                        <Crown className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{tier}</div>
                        <p className="text-xs text-muted-foreground">
                            {package_?.name || 'Chưa có gói'}
                        </p>
                        <Badge variant={hasActiveSubscription ? 'default' : 'destructive'} className="mt-2">
                            {hasActiveSubscription ? 'Active' : 'Inactive'}
                        </Badge>
                        {isTrial && <Badge variant="secondary" className="ml-2">Trial</Badge>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Thời hạn còn lại</CardTitle>
                        <Calendar className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{daysRemaining} ngày</div>
                        <p className="text-xs text-muted-foreground">
                            {subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString('vi-VN') : 'N/A'}
                        </p>
                        {isExpiringSoon && (
                            <Badge variant="destructive" className="mt-2">Sắp hết hạn!</Badge>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Token Limit</CardTitle>
                        <Coins className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tokensLimit.toLocaleString('vi-VN')}</div>
                        <p className="text-xs text-muted-foreground">
                            Token AI / tháng
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Feature Access Test */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Kiểm tra Feature Access
                    </CardTitle>
                    <CardDescription>
                        Tier hiện tại: <strong className="text-primary">{tier.toUpperCase()}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {/* Basic Features */}
                        <div>
                            <h4 className="font-semibold text-green-600 mb-2">🟢 Basic Features (Tất cả gói)</h4>
                            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                {AVAILABLE_FEATURES.filter(f => f.category === 'basic' && f.id !== 'all').map(feature => (
                                    <div key={feature.id} className="flex items-center gap-2 p-2 rounded border">
                                        {canAccess(feature.id) ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-500" />
                                        )}
                                        <span className="text-sm">{feature.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pro Features */}
                        <div>
                            <h4 className="font-semibold text-amber-600 mb-2">🟡 Pro Features (Pro+ only)</h4>
                            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                {AVAILABLE_FEATURES.filter(f => f.category === 'pro').map(feature => (
                                    <div key={feature.id} className="flex items-center gap-2 p-2 rounded border">
                                        {canAccess(feature.id) ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-500" />
                                        )}
                                        <span className="text-sm">{feature.name}</span>
                                        {isProFeature(feature.id) && (
                                            <Badge variant="outline" className="ml-auto text-xs">Pro</Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Enterprise Features */}
                        <div>
                            <h4 className="font-semibold text-purple-600 mb-2">🟣 Enterprise Features</h4>
                            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                {AVAILABLE_FEATURES.filter(f => f.category === 'enterprise').map(feature => (
                                    <div key={feature.id} className="flex items-center gap-2 p-2 rounded border">
                                        {canAccess(feature.id) ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-500" />
                                        )}
                                        <span className="text-sm">{feature.name}</span>
                                        <Badge variant="outline" className="ml-auto text-xs">Enterprise</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Raw Data */}
            <Card>
                <CardHeader>
                    <CardTitle>Debug Data</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-64">
                        {JSON.stringify({
                            subscription,
                            package: package_,
                            tier,
                            hasActiveSubscription,
                            isTrial,
                            daysRemaining,
                            tokensLimit,
                            PRO_ONLY_FEATURES,
                            ENTERPRISE_ONLY_FEATURES,
                        }, null, 2)}
                    </pre>
                </CardContent>
            </Card>
        </div>
    );
}
