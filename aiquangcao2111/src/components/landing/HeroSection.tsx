import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import HeroShowcase from './HeroShowcase';
import { LandingPageSettings } from '@/services/nocodb/landingPageService';
import { useLanguage } from '@/contexts/LanguageContext';

interface HeroSectionProps {
    settings: LandingPageSettings;
}

// English translations for hero content
const heroTranslations = {
    headline_prefix: 'The',
    headline_underline: '24/7 AI Ads Automation Platform',
    headline_suffix: 'for Spa & Beauty Clinics',
    description: 'Create campaigns with 1-click, write content tailored to services/audiences, A/B test, optimize budget by performance, and get daily reports – all in one.',
    cta_primary: 'Get Started Free',
    cta_secondary: 'Watch Demo',
};

export default function HeroSection({ settings }: HeroSectionProps) {
    const navigate = useNavigate();
    const { language } = useLanguage();

    // Get content based on language
    const headlinePrefix = language === 'en' ? heroTranslations.headline_prefix : settings.headline_prefix;
    const headlineUnderline = language === 'en' ? heroTranslations.headline_underline : settings.headline_underline;
    const headlineSuffix = language === 'en' ? heroTranslations.headline_suffix : settings.headline_suffix;
    const description = language === 'en' ? heroTranslations.description : settings.description;
    const ctaPrimary = language === 'en' ? heroTranslations.cta_primary : settings.cta_primary_text;
    const ctaSecondary = language === 'en' ? heroTranslations.cta_secondary : settings.cta_secondary_text;

    return (
        <section className="pt-6 pb-8 md:pt-10 md:pb-14 px-4">
            <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4 md:mb-5">
                    {headlinePrefix}{' '}
                    <span className="bg-gradient-to-r from-[#e91e63] via-[#ff7043] to-[#2196f3] bg-clip-text text-transparent">
                        {headlineUnderline}
                    </span>{' '}
                    {headlineSuffix}
                </h1>

                <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-5 md:mb-6 max-w-3xl mx-auto leading-relaxed px-2">
                    {description}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
                    <Button
                        size="lg"
                        className="px-6 py-5 sm:px-8 sm:py-5 text-sm sm:text-base font-semibold rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        onClick={() => navigate('/auth/signup')}
                    >
                        {ctaPrimary}
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        className="px-6 py-5 sm:px-8 sm:py-5 text-sm sm:text-base font-semibold rounded-full group border-gray-300 hover:border-[#e91e63] hover:text-[#e91e63] transition-all duration-300"
                        onClick={() => {
                            const element = document.getElementById('products');
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth' });
                            }
                        }}
                    >
                        {ctaSecondary}
                        <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-[#e91e63] to-[#ff7043] text-white text-[10px] sm:text-xs rounded-full">New</span>
                    </Button>
                </div>
            </div>

            {/* Hero Showcase - Animated Chat Interface */}
            <div className="max-w-4xl mx-auto mt-8 md:mt-12 px-2 relative">
                <HeroShowcase />
            </div>
        </section>
    );
}

