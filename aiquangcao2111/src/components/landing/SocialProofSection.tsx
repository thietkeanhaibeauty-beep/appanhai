import React from 'react';
import { Zap, Sparkles, Users, BarChart3 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SocialProofSection() {
    const { t } = useLanguage();

    return (
        <section className="py-10 border-b border-gray-100 bg-white">
            <div className="max-w-6xl mx-auto px-4">
                <p className="text-center text-sm font-medium text-gray-500 mb-6 uppercase tracking-wider">
                    {t('Được tin dùng bởi hơn 500+ Spa & Thẩm mỹ viện', 'Trusted by 500+ Spas & Beauty Clinics')}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                    {/* Fake Logos for Demo - Replace with real ones */}
                    <div className="flex items-center gap-2 font-bold text-xl text-gray-700"><Zap className="w-6 h-6 text-[#e91e63]" /> Aura Clinic</div>
                    <div className="flex items-center gap-2 font-bold text-xl text-gray-700"><Sparkles className="w-6 h-6 text-[#ff7043]" /> Seoul Spa</div>
                    <div className="flex items-center gap-2 font-bold text-xl text-gray-700"><Users className="w-6 h-6 text-[#2196f3]" /> Mega Gangnam</div>
                    <div className="flex items-center gap-2 font-bold text-xl text-gray-700"><BarChart3 className="w-6 h-6 text-purple-500" /> Shynh House</div>
                </div>
            </div>
        </section>
    );
}
