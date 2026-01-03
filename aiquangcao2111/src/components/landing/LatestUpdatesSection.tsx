import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// Latest Updates Data
const latestUpdatesVi = [
    {
        tag: 'SẮP RA MẮT',
        title: 'AI chăm sóc khách hàng tự động',
        description: 'Chatbot AI tự động trả lời tin nhắn, đặt lịch hẹn & gửi nhắc nhở khách hàng 24/7.',
        buttonText: 'Đăng ký sớm',
    },
    {
        tag: 'SẮP RA MẮT',
        title: 'Phần mềm quản lý Spa/TMV',
        description: 'Quản lý khách hàng, lịch hẹn, doanh thu – tích hợp sâu với quảng cáo Facebook.',
        buttonText: 'Tìm hiểu thêm',
    },
    {
        tag: 'SẮP RA MẮT',
        title: 'AI thiết kế ảnh quảng cáo',
        description: 'Tự động tạo banner, carousel từ template chuẩn ngành Spa/Clinic.',
        buttonText: 'Thử ngay',
    },
];

const latestUpdatesEn = [
    {
        tag: 'COMING SOON',
        title: 'AI Customer Care Automation',
        description: 'AI Chatbot auto-replies to messages, schedules appointments & sends reminders 24/7.',
        buttonText: 'Register Early',
    },
    {
        tag: 'COMING SOON',
        title: 'Spa/Beauty Management Software',
        description: 'Manage customers, appointments, revenue – deeply integrated with Facebook Ads.',
        buttonText: 'Learn More',
    },
    {
        tag: 'COMING SOON',
        title: 'AI Ad Image Designer',
        description: 'Auto-create banners and carousels from industry-standard Spa/Clinic templates.',
        buttonText: 'Try Now',
    },
];

export default function LatestUpdatesSection() {
    const { language, t } = useLanguage();
    const latestUpdates = language === 'en' ? latestUpdatesEn : latestUpdatesVi;

    return (
        <section className="py-10 md:py-24 px-3 md:px-4 bg-white">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6 md:mb-8">
                    <h2 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-[#e91e63] via-[#ff7043] to-[#2196f3] bg-clip-text text-transparent">{t('Sắp ra mắt', 'Coming Soon')}</h2>
                    <Link to="#" className="text-xs md:text-sm text-[#e91e63] hover:underline flex items-center gap-1 font-medium">
                        {t('Xem tất cả', 'View All')}
                        <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    {latestUpdates.map((update, index) => (
                        <div
                            key={index}
                            className="p-4 md:p-6 rounded-lg md:rounded-xl border border-gray-200 bg-white hover:shadow-lg hover:border-gray-300 transition-all duration-300"
                        >
                            <span className={`inline-block px-2 py-0.5 text-[10px] md:text-xs font-semibold rounded-full mb-3 md:mb-4 ${update.tag === 'CÔNG TY' || update.tag === 'COMPANY'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-gradient-to-r from-[#e91e63]/10 to-[#ff7043]/10 text-[#e91e63]'
                                }`}>
                                {update.tag}
                            </span>

                            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 md:mb-3">
                                {update.title}
                            </h3>

                            <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6 leading-relaxed">
                                {update.description}
                            </p>

                            <Button variant="outline" size="sm" className="rounded-full text-xs md:text-sm h-8 md:h-9 hover:border-[#e91e63] hover:text-[#e91e63] transition-all duration-300">
                                {update.buttonText}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

