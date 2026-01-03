import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LandingFooter() {
    const { t } = useLanguage();

    return (
        <footer className="bg-gray-50 border-t py-8 md:py-12 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-6 md:mb-8">
                    {/* Company Info */}
                    <div className="col-span-2 md:col-span-1">
                        <h3 className="font-bold text-base md:text-lg bg-gradient-to-r from-[#e91e63] via-[#ff7043] to-[#2196f3] bg-clip-text text-transparent mb-3 md:mb-4">Climate Resilience International</h3>
                        <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                            IRS Determination — Recognized as a 501(c)(3) public charity; EIN: 931391894
                        </p>
                        <div className="text-xs md:text-sm text-gray-600 space-y-1">
                            <p className="hidden md:block">Address: 125 E BIDWELL ST APT 421, FOLSOM, CA 95630</p>
                            <p>Hotline: <a href="tel:+17602849613" className="text-[#e91e63] hover:underline font-medium">+1 760 284 9613</a></p>
                            <p>Email: <a href="mailto:mentor@aiadsfb.com" className="text-[#e91e63] hover:underline font-medium">mentor@aiadsfb.com</a></p>
                        </div>
                    </div>

                    {/* Products */}
                    <div>
                        <h4 className="font-semibold text-xs md:text-sm text-gray-900 mb-3 md:mb-4">{t('SẢN PHẨM', 'PRODUCTS')}</h4>
                        <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-600">
                            <li><Link to="/main" className="hover:text-[#e91e63] transition-colors">{t('Bảng điều khiển', 'Dashboard')}</Link></li>
                            <li><Link to="#" className="hover:text-[#e91e63] transition-colors">{t('Quảng cáo bài viết', 'Post Ads')}</Link></li>
                            <li><Link to="#" className="hover:text-[#e91e63] transition-colors">{t('Quảng cáo tin nhắn', 'Message Ads')}</Link></li>
                            <li><Link to="#" className="hover:text-[#e91e63] transition-colors">{t('Quy tắc tự động', 'Automation Rules')}</Link></li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="font-semibold text-xs md:text-sm text-gray-900 mb-3 md:mb-4">{t('CÔNG TY', 'COMPANY')}</h4>
                        <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-600">
                            <li><Link to="#" className="hover:text-[#e91e63] transition-colors">{t('Về chúng tôi', 'About Us')}</Link></li>
                            <li><Link to="#" className="hover:text-[#e91e63] transition-colors">Blog</Link></li>
                            <li><Link to="#" className="hover:text-[#e91e63] transition-colors">{t('Tuyển dụng', 'Careers')}</Link></li>
                            <li><Link to="#" className="hover:text-[#e91e63] transition-colors">{t('Liên hệ', 'Contact')}</Link></li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div className="hidden md:block">
                        <h4 className="font-semibold text-xs md:text-sm text-gray-900 mb-3 md:mb-4">{t('HỖ TRỢ', 'SUPPORT')}</h4>
                        <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-600">
                            <li><a href="https://docs.aiadsfb.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#e91e63] transition-colors">{t('Tài liệu & API', 'Docs & API')}</a></li>
                            <li><Link to="#" className="hover:text-[#e91e63] transition-colors">{t('Trung tâm trợ giúp', 'Help Center')}</Link></li>
                            <li><Link to="/dashboard/packages" className="hover:text-[#e91e63] transition-colors">{t('Bảng giá', 'Pricing')}</Link></li>
                            <li><Link to="#" className="hover:text-[#e91e63] transition-colors">{t('Trạng thái hệ thống', 'System Status')}</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Footer */}
                <div className="pt-6 md:pt-8 border-t text-center text-xs md:text-sm text-gray-500">
                    <p>© 2024 Climate Resilience International. {t('Bảo lưu mọi quyền.', 'All rights reserved.')}</p>
                </div>
            </div>
        </footer>
    );
}

