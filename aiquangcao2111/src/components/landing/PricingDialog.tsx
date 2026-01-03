import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PackageCards from '@/components/packages/PackageCards';
import PackageComparisonTable from '@/components/packages/PackageComparisonTable';
import { PaymentPackage } from '@/services/nocodb/paymentPackagesService';
import { RoleFeatureFlag } from '@/services/nocodb/featureFlagsService';

interface PricingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    showFullComparison: boolean;
    onShowFullComparisonChange: (open: boolean) => void;
    packages: PaymentPackage[];
    roleFeatures: RoleFeatureFlag[];
    featureNames: Record<string, string>;
    billingPeriod: 'monthly' | 'yearly';
    setBillingPeriod: (period: 'monthly' | 'yearly') => void;
}

export default function PricingDialog({
    open,
    onOpenChange,
    showFullComparison,
    onShowFullComparisonChange,
    packages,
    roleFeatures,
    featureNames,
    billingPeriod,
    setBillingPeriod
}: PricingDialogProps) {
    const navigate = useNavigate();

    return (
        <>
            {/* Pricing Dialog */}
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-[95vw] md:max-w-6xl max-h-[90vh] p-3 md:p-6 overflow-y-auto">
                    <DialogHeader className="pb-2">
                        <DialogTitle className="text-xl md:text-2xl text-center font-bold">Chọn gói phù hợp với bạn</DialogTitle>
                    </DialogHeader>

                    <div className="text-center mb-3">
                        <Tabs value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as any)} className="inline-flex">
                            <TabsList>
                                <TabsTrigger value="monthly">Thanh toán hàng tháng</TabsTrigger>
                                <TabsTrigger value="yearly">
                                    Thanh toán hàng năm
                                    <span className="ml-2 text-xs text-primary">(tiết kiệm đến 22%)</span>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <PackageCards
                        packages={packages}
                        roleFeatures={roleFeatures}
                        featureNames={featureNames}
                        billingPeriod={billingPeriod}
                        onSelectPackage={(pkg) => {
                            navigate('/auth/signup');
                        }}
                        onShowFullComparison={() => onShowFullComparisonChange(true)}
                    />
                </DialogContent>
            </Dialog>

            {/* Full Comparison Dialog (Nested) */}
            <Dialog open={showFullComparison} onOpenChange={onShowFullComparisonChange}>
                <DialogContent className="max-w-[98vw] md:max-w-7xl max-h-[95vh] p-3 md:p-6">
                    <DialogHeader className="pb-2">
                        <DialogTitle className="text-base md:text-xl text-center">So sánh chi tiết các gói</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[75vh]">
                        <PackageComparisonTable
                            packages={packages}
                            roleFeatures={roleFeatures}
                            featureNames={featureNames}
                            billingPeriod={billingPeriod}
                            onSelectPackage={(pkg) => {
                                navigate('/auth/signup');
                            }}
                        />
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    );
}
