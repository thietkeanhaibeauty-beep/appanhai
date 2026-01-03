import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Menu, X, Globe } from 'lucide-react';


import { getLandingPageSettings, LandingPageSettings, DEFAULT_SETTINGS } from '@/services/nocodb/landingPageService';
import { getPaymentPackages, type PaymentPackage } from '@/services/nocodb/paymentPackagesService';
import { getFeatureFlags, getAllRoleFeatureFlags, type RoleFeatureFlag } from '@/services/nocodb/featureFlagsService';

// Components
import HeroSection from '@/components/landing/HeroSection';
import SocialProofSection from '@/components/landing/SocialProofSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import InteractiveFeatureShowcase from '@/components/landing/InteractiveFeatureShowcase';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import LatestUpdatesSection from '@/components/landing/LatestUpdatesSection';
import LandingFooter from '@/components/landing/LandingFooter';
import PricingDialog from '@/components/landing/PricingDialog';

// Product Features Data with chat conversations
import { productFeatures } from '../data/landingPageData';

export default function LandingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t, language, setLanguage } = useLanguage();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [settings, setSettings] = useState<LandingPageSettings>(DEFAULT_SETTINGS);

    // Package Comparison State
    const [showPricingDialog, setShowPricingDialog] = useState(false);
    const [showFullComparison, setShowFullComparison] = useState(false);
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
    const [packages, setPackages] = useState<PaymentPackage[]>([]);
    const [roleFeatures, setRoleFeatures] = useState<RoleFeatureFlag[]>([]);
    const [featureNames, setFeatureNames] = useState<Record<string, string>>({});

    useEffect(() => {
        getLandingPageSettings().then(setSettings).catch(console.error);
        loadPackageData();
    }, []);

    const loadPackageData = async () => {
        try {
            const [packagesData, flagsData, roleFeaturesData] = await Promise.all([
                getPaymentPackages(false),
                getFeatureFlags(),
                getAllRoleFeatureFlags()
            ]);

            // Sort packages by tier order
            const order = ['Trial', 'Starter', 'Pro', 'Team', 'Enterprise'];
            packagesData.sort((a, b) => {
                const aIndex = order.indexOf(a.name);
                const bIndex = order.indexOf(b.name);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });

            setPackages(packagesData);
            setRoleFeatures(roleFeaturesData);

            // Convert feature flags array to name map (key -> name)
            const namesMap: Record<string, string> = {};
            flagsData.forEach(flag => {
                namesMap[flag.key] = flag.name;
            });
            setFeatureNames(namesMap);

        } catch (error) {
            console.error("Failed to load package data", error);
        }
    };


    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <img
                                src="/logo192.png"
                                alt="Climate Resilience International"
                                className="w-8 h-8 rounded-lg"
                            />
                            <span className="font-bold text-lg md:text-xl bg-gradient-to-r from-[#e91e63] via-[#ff7043] to-[#ff7043] bg-clip-text text-transparent">
                                Climate Resilience International
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8">
                            <button
                                onClick={() => setShowPricingDialog(true)}
                                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                {t('Sản phẩm', 'Products')}
                            </button>
                            <button
                                onClick={() => setShowPricingDialog(true)}
                                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                {t('Bảng giá', 'Pricing')}
                            </button>
                            <a href="https://docs.aiadsfb.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                {t('Tài liệu', 'Docs')}
                            </a>
                        </div>

                        {/* Auth Buttons + Language Toggle */}
                        <div className="hidden md:flex items-center gap-3">
                            {/* Language Toggle */}
                            <button
                                onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
                                className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                title={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
                            >
                                <Globe className="h-4 w-4" />
                                <span className="text-xs font-bold text-gray-500">{language === 'vi' ? 'VN' : 'EN'}</span>
                            </button>
                            {user ? (
                                <Button size="sm" className="bg-gradient-to-r from-[#e91e63] to-[#ff7043] hover:opacity-90 text-white font-semibold" onClick={() => navigate('/home')}>
                                    {t('Vào Dashboard', 'Go to Dashboard')}
                                </Button>
                            ) : (
                                <>
                                    <Button variant="ghost" size="sm" onClick={() => navigate('/auth/login')}>
                                        {t('Đăng nhập', 'Sign In')}
                                    </Button>
                                    <Button size="sm" className="bg-gradient-to-r from-[#e91e63] to-[#ff7043] hover:opacity-90 text-white font-semibold" onClick={() => navigate('/auth/signup')}>
                                        {t('Đăng ký', 'Sign Up')}
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    {mobileMenuOpen && (
                        <div className="md:hidden py-4 border-t">
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        setShowPricingDialog(true);
                                        setMobileMenuOpen(false);
                                    }}
                                    className="text-left text-sm text-gray-600 py-2"
                                >
                                    {t('Sản phẩm', 'Products')}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPricingDialog(true);
                                        setMobileMenuOpen(false);
                                    }}
                                    className="text-left text-sm text-gray-600 py-2"
                                >
                                    {t('Bảng giá', 'Pricing')}
                                </button>
                                <a href="https://docs.aiadsfb.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 py-2">{t('Tài liệu', 'Docs')}</a>
                                {/* Language Toggle */}
                                <button
                                    onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
                                    className="flex items-center gap-2 text-sm text-gray-600 py-2"
                                >
                                    <Globe className="h-4 w-4" />
                                    <span className="font-medium text-gray-700">{language === 'vi' ? 'Tiếng Việt (VN)' : 'English (EN)'}</span>
                                </button>
                                <hr className="my-2" />
                                {user ? (
                                    <Button size="sm" className="bg-gradient-to-r from-[#e91e63] to-[#ff7043] hover:opacity-90 text-white" onClick={() => navigate('/home')}>
                                        {t('Vào Dashboard', 'Go to Dashboard')}
                                    </Button>
                                ) : (
                                    <>
                                        <Button variant="outline" size="sm" onClick={() => navigate('/auth/login')}>
                                            {t('Đăng nhập', 'Sign In')}
                                        </Button>
                                        <Button size="sm" className="bg-gradient-to-r from-[#e91e63] to-[#ff7043] hover:opacity-90 text-white" onClick={() => navigate('/auth/signup')}>
                                            {t('Đăng ký', 'Sign Up')}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            <HeroSection settings={settings} />

            <SocialProofSection />

            <HowItWorksSection />

            <div id="products">
                <InteractiveFeatureShowcase
                    features={productFeatures}
                    onOpenPricing={() => setShowPricingDialog(true)}
                />
            </div>

            <TestimonialsSection />

            <LatestUpdatesSection />

            <LandingFooter />

            <PricingDialog
                open={showPricingDialog}
                onOpenChange={setShowPricingDialog}
                showFullComparison={showFullComparison}
                onShowFullComparisonChange={setShowFullComparison}
                packages={packages}
                roleFeatures={roleFeatures}
                featureNames={featureNames}
                billingPeriod={billingPeriod}
                setBillingPeriod={setBillingPeriod}
            />
        </div>
    );
}


