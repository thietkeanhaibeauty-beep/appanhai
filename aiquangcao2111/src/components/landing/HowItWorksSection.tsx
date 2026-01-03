import React from 'react';
import { Zap, Sparkles, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HowItWorksSection() {
    const { t } = useLanguage();

    return (
        <section className="pt-8 pb-2 md:pt-10 md:pb-4 bg-white">
            <div className="max-w-2xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t('Hoạt động như thế nào?', 'How It Works?')}</h2>
                    <p className="text-gray-600 max-w-xl mx-auto text-sm">{t('3 bước đơn giản để tự động hóa quảng cáo của bạn. Không cần kỹ thuật phức tạp.', '3 simple steps to automate your ads. No complex technical skills required.')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-[#e91e63]/20 to-[#ff7043]/20 -z-10"></div>

                    {/* Step 1 */}
                    <div className="text-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all relative">
                        <div className="w-12 h-12 mx-auto bg-gradient-to-br from-[#e91e63]/10 to-[#ff7043]/10 rounded-full flex items-center justify-center mb-3 relative">
                            <span className="absolute top-0 right-0 w-5 h-5 bg-gradient-to-r from-[#e91e63] to-[#ff7043] text-white rounded-full flex items-center justify-center font-bold text-[10px] shadow-lg">1</span>
                            <Users className="w-6 h-6 text-[#e91e63]" />
                        </div>
                        <h3 className="text-base font-bold mb-1">{t('Kết nối tài khoản', 'Connect Account')}</h3>
                        <p className="text-gray-600 text-xs">{t('Liên kết Fanpage & Tài khoản quảng cáo Facebook của bạn chỉ trong 30 giây.', 'Link your Fanpage & Facebook Ad Account in just 30 seconds.')}</p>
                    </div>

                    {/* Step 2 */}
                    <div className="text-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all relative">
                        <div className="w-12 h-12 mx-auto bg-gradient-to-br from-[#e91e63]/10 to-[#ff7043]/10 rounded-full flex items-center justify-center mb-3 relative">
                            <span className="absolute top-0 right-0 w-5 h-5 bg-gradient-to-r from-[#e91e63] to-[#ff7043] text-white rounded-full flex items-center justify-center font-bold text-[10px] shadow-lg">2</span>
                            <Zap className="w-6 h-6 text-[#ff7043]" />
                        </div>
                        <h3 className="text-base font-bold mb-1">{t('Chọn mẫu & Ngân sách', 'Choose Template & Budget')}</h3>
                        <p className="text-gray-600 text-xs">{t('Chọn mục tiêu (Tin nhắn/Leads) và Template ngành Spa. Thiết lập ngân sách ngày.', 'Select goal (Messages/Leads) and Spa industry template. Set daily budget.')}</p>
                    </div>

                    {/* Step 3 */}
                    <div className="text-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all relative">
                        <div className="w-12 h-12 mx-auto bg-gradient-to-br from-[#e91e63]/10 to-[#ff7043]/10 rounded-full flex items-center justify-center mb-3 relative">
                            <span className="absolute top-0 right-0 w-5 h-5 bg-gradient-to-r from-[#e91e63] to-[#ff7043] text-white rounded-full flex items-center justify-center font-bold text-[10px] shadow-lg">3</span>
                            <Sparkles className="w-6 h-6 text-[#2196f3]" />
                        </div>
                        <h3 className="text-base font-bold mb-1">{t('AI Tự động hóa', 'AI Automation')}</h3>
                        <p className="text-gray-600 text-xs">{t('AI sẽ tự tạo Content, Target, và Tối ưu 24/7. Bạn chỉ cần xem báo cáo Zalo.', 'AI will auto-create Content, Targeting, and Optimize 24/7. Just check Zalo reports.')}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

