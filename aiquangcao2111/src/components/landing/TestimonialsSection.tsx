import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TestimonialsSection() {
    const { t } = useLanguage();

    return (
        <section className="py-16 md:py-24 bg-gray-50 border-t border-gray-200">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('Khách hàng nói gì về chúng tôi?', 'What Our Customers Say?')}</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">{t('Tham gia cộng đồng hơn 500+ chủ Spa/Clinic đang tăng trưởng doanh thu mỗi ngày.', 'Join a community of 500+ Spa/Clinic owners growing their revenue every day.')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Review 1 */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative">
                        <div className="flex text-yellow-500 mb-4">★★★★★</div>
                        <p className="text-gray-700 italic mb-6">{t('"Từ lúc dùng AI, mình không cần trực ads đêm nữa. CPR giảm 30%. Sáng dậy chỉ việc check inbox và chốt đơn."', '"Since using AI, I no longer need to monitor ads at night. CPR reduced 30%. Wake up, check inbox, close deals."')}</p>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">L</div>
                            <div>
                                <p className="font-bold text-gray-900">{t('Chị Lan', 'Ms. Lan')}</p>
                                <p className="text-xs text-gray-500">{t('Chủ Lan Spa - Hà Nội', 'Owner Lan Spa - Hanoi')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Review 2 */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative">
                        <div className="flex text-yellow-500 mb-4">★★★★★</div>
                        <p className="text-gray-700 italic mb-6">{t('"Báo cáo qua Zalo tiện lợi cực kỳ, sáng dậy là biết hôm qua lãi lỗ thế nào. Auto rule cứu mình mấy bàn thua khi ads bị đắt."', '"Zalo reports are super convenient, wake up and know yesterday\'s profit/loss. Auto rules saved me when ads got expensive."')}</p>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">T</div>
                            <div>
                                <p className="font-bold text-gray-900">{t('Anh Tuấn', 'Mr. Tuan')}</p>
                                <p className="text-xs text-gray-500">CEO Seoul Beauty</p>
                            </div>
                        </div>
                    </div>

                    {/* Review 3 */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative">
                        <div className="flex text-yellow-500 mb-4">★★★★★</div>
                        <p className="text-gray-700 italic mb-6">{t('"Thích nhất tính năng tạo ads 1-click. Mình không rành kỹ thuật nhưng vẫn lên được campaign chuẩn chỉnh trong 1 phút."', '"Love the 1-click ad creation. Not tech-savvy but can launch a proper campaign in 1 minute."')}</p>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">H</div>
                            <div>
                                <p className="font-bold text-gray-900">{t('Chị Hoa', 'Ms. Hoa')}</p>
                                <p className="text-xs text-gray-500">Manager Aura Clinic</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

