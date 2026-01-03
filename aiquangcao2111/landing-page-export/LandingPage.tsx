import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, ArrowRight, Sparkles, BarChart3, Zap, MessageSquare, TestTube, FileText, Users, ExternalLink } from 'lucide-react';
import { getLandingPageSettings, LandingPageSettings, DEFAULT_SETTINGS } from '@/services/nocodb/landingPageService';

// Product Features Data
const productFeatures = [
    {
        tag: 'SẢN PHẨM',
        title: 'Báo cáo ADS tự động',
        description: 'Ghi chú chỉ số: kết quả tự nhận, chi phí/tin nhắn, tỉ lệ đặt lịch, SDT, tỉ lệ SDT, %MKT/Doanh thu. Lên lịch gửi báo cáo hàng ngày.',
        buttonText: 'Xem báo cáo',
        icon: BarChart3,
    },
    {
        tag: 'SẢN PHẨM',
        title: 'AI tạo quảng cáo 1-click',
        description: 'Chọn mục tiêu (Tin nhắn/Leads/Website/Mua hàng) → tự tạo Camp/AdSet/Ads đã kèm. Xuất bản trong một cú nhấp.',
        buttonText: 'Tạo chiến dịch',
        icon: Sparkles,
    },
    {
        tag: 'SẢN PHẨM',
        title: 'Ngân sách tự tối ưu 24/7',
        description: 'AI tăng khi hiệu quả, giảm khi đắt. Quy tắc theo giờ/ngày & hiệu suất: không cần nhân sự trực.',
        buttonText: 'Tạo rule',
        icon: Zap,
    },
    {
        tag: 'SẢN PHẨM',
        title: 'AI viết content chuẩn dịch vụ',
        description: 'Nhập chủ đề → tạo ngay caption/headline/hình gợi ý theo đúng chuẩn đúng khách hàng mục tiêu.',
        buttonText: 'Sinh nội dung',
        icon: FileText,
    },
    {
        tag: 'SẢN PHẨM',
        title: 'Tạm dừng/chạy lại & tối ưu tự động',
        description: 'Theo rule hiệu suất: tạm dừng khi đắt, tự chạy lại khi đạt ngưỡng học theo dữ liệu lịch sử.',
        buttonText: 'Thiết lập',
        icon: Zap,
    },
    {
        tag: 'SẢN PHẨM',
        title: 'Quảng cáo Tin nhắn tự động',
        description: 'AI tạo kịch bản hỏi thoại: auto-reply: mục tiêu inbox/đặt lịch báo cáo theo cuộc hội thoại.',
        buttonText: 'Triển khai',
        buttonVariant: 'primary' as const,
        icon: MessageSquare,
    },
    {
        tag: 'SẢN PHẨM',
        title: 'Quảng cáo tệp đối tượng',
        description: 'Chạy quảng cáo đến Custom Audience: retargeting, lookalike, danh sách khách hàng có sẵn.',
        buttonText: 'Tạo tệp',
        icon: Users,
    },
    {
        tag: 'SẢN PHẨM',
        title: 'Nhắm mục tiêu tự động',
        description: 'AI phân tích dịch vụ → gợi ý sở thích, độ tuổi, vị trí tối ưu cho ngành Spa/Clinic.',
        buttonText: 'Thiết lập',
        icon: Zap,
    },
    {
        tag: 'CÔNG TY',
        title: 'Về chúng tôi',
        description: 'Đội ngũ triển khai thực chiến cho Spa/Clinic. Cam kết quy trình chuẩn & chỉ số sách.',
        buttonText: 'Về chúng tôi',
        dark: true,
        icon: Users,
    },
];

// Latest Updates Data
const latestUpdates = [
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

export default function LandingPage() {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [settings, setSettings] = useState<LandingPageSettings>(DEFAULT_SETTINGS);

    useEffect(() => {
        getLandingPageSettings().then(setSettings).catch(console.error);
    }, []);

    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <Link to="/" className="font-bold text-xl text-gray-900">
                            {settings.logo_text}
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8">
                            <Link to="/dashboard/packages" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                Sản phẩm
                            </Link>
                            <Link to="/dashboard/packages" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                Bảng giá
                            </Link>
                            <Link to="#docs" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                Tài liệu
                            </Link>
                        </div>

                        {/* Auth Buttons */}
                        <div className="hidden md:flex items-center gap-3">
                            <Button variant="ghost" size="sm" onClick={() => navigate('/auth/login')}>
                                Đăng nhập
                            </Button>
                            <Button size="sm" onClick={() => navigate('/auth/sign-up')}>
                                Đăng ký
                            </Button>
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
                                <Link to="/dashboard/packages" className="text-sm text-gray-600 py-2">Sản phẩm</Link>
                                <Link to="/dashboard/packages" className="text-sm text-gray-600 py-2">Bảng giá</Link>
                                <Link to="#docs" className="text-sm text-gray-600 py-2">Tài liệu</Link>
                                <hr className="my-2" />
                                <Button variant="outline" size="sm" onClick={() => navigate('/auth/login')}>
                                    Đăng nhập
                                </Button>
                                <Button size="sm" onClick={() => navigate('/auth/sign-up')}>
                                    Đăng ký
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-6 pb-8 md:pt-10 md:pb-14 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4 md:mb-5">
                        {settings.headline_prefix}{' '}
                        <span>
                            {settings.headline_underline}
                        </span>{' '}
                        {settings.headline_suffix}
                    </h1>

                    <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-5 md:mb-6 max-w-3xl mx-auto leading-relaxed px-2">
                        {settings.description}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
                        <Button
                            size="lg"
                            className="px-6 py-5 sm:px-8 sm:py-5 text-sm sm:text-base font-semibold rounded-full bg-[#E91E8C] hover:bg-[#D01A7E]"
                            onClick={() => navigate('/auth')}
                        >
                            {settings.cta_primary_text}
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="px-6 py-5 sm:px-8 sm:py-5 text-sm sm:text-base font-semibold rounded-full group"
                            onClick={() => navigate('/auth')}
                        >
                            {settings.cta_secondary_text}
                            <span className="ml-2 px-2 py-0.5 bg-gray-900 text-white text-[10px] sm:text-xs rounded-full">New</span>
                        </Button>
                    </div>
                </div>

                {/* Hero Media */}
                <div className="max-w-4xl mx-auto mt-6 md:mt-10 px-2">
                    {settings.hero_media_url ? (
                        settings.hero_media_type === 'video' ? (
                            <video
                                src={settings.hero_media_url}
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="w-full aspect-video rounded-xl md:rounded-2xl shadow-lg md:shadow-xl object-cover"
                            />
                        ) : (
                            <img
                                src={settings.hero_media_url}
                                alt="Hero"
                                className="w-full aspect-video rounded-xl md:rounded-2xl shadow-lg md:shadow-xl object-cover"
                            />
                        )
                    ) : (
                        <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl md:rounded-2xl shadow-lg md:shadow-xl shadow-gray-200/50" />
                    )}
                </div>
            </section>

            {/* Product Features Section */}
            <section id="products" className="pt-6 pb-10 md:pt-10 md:pb-24 px-3 md:px-4 bg-gray-50">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-6">
                        {productFeatures.map((feature, index) => (
                            <div
                                key={index}
                                className={`p-4 md:p-6 rounded-lg md:rounded-xl border transition-all duration-300 hover:shadow-lg ${feature.dark
                                    ? 'bg-gray-900 text-white border-gray-800'
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <span className={`inline-block px-2 py-0.5 text-[10px] md:text-xs font-semibold rounded-full mb-3 md:mb-4 ${feature.dark
                                    ? 'bg-pink-600 text-white'
                                    : feature.tag === 'CÔNG TY'
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-pink-100 text-pink-700'
                                    }`}>
                                    {feature.tag}
                                </span>

                                <h3 className={`text-base md:text-xl font-bold mb-2 md:mb-3 ${feature.dark ? 'text-white' : 'text-gray-900'}`}>
                                    {feature.title}
                                </h3>

                                <p className={`text-xs md:text-sm mb-4 md:mb-6 leading-relaxed ${feature.dark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {feature.description}
                                </p>

                                <Button
                                    variant={feature.dark ? 'outline' : feature.buttonVariant === 'primary' ? 'default' : 'outline'}
                                    size="sm"
                                    className={`rounded-full text-xs md:text-sm h-8 md:h-9 ${feature.dark
                                        ? 'border-white text-white hover:bg-white hover:text-gray-900'
                                        : feature.buttonVariant === 'primary'
                                            ? 'bg-pink-600 hover:bg-pink-700'
                                            : ''
                                        }`}
                                >
                                    {feature.buttonText}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Latest Updates Section */}
            <section className="py-10 md:py-24 px-3 md:px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-6 md:mb-8">
                        <h2 className="text-xl md:text-3xl font-bold text-gray-900">Sắp ra mắt</h2>
                        <Link to="#" className="text-xs md:text-sm text-pink-600 hover:underline flex items-center gap-1">
                            Xem tất cả
                            <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                        {latestUpdates.map((update, index) => (
                            <div
                                key={index}
                                className="p-4 md:p-6 rounded-lg md:rounded-xl border border-gray-200 bg-white hover:shadow-lg hover:border-gray-300 transition-all duration-300"
                            >
                                <span className={`inline-block px-2 py-0.5 text-[10px] md:text-xs font-semibold rounded-full mb-3 md:mb-4 ${update.tag === 'CÔNG TY'
                                    ? 'bg-gray-100 text-gray-700'
                                    : 'bg-pink-100 text-pink-700'
                                    }`}>
                                    {update.tag}
                                </span>

                                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 md:mb-3">
                                    {update.title}
                                </h3>

                                <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6 leading-relaxed">
                                    {update.description}
                                </p>

                                <Button variant="outline" size="sm" className="rounded-full text-xs md:text-sm h-8 md:h-9">
                                    {update.buttonText}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t py-8 md:py-12 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-6 md:mb-8">
                        {/* Company Info */}
                        <div className="col-span-2 md:col-span-1">
                            <h3 className="font-bold text-base md:text-lg text-gray-900 mb-3 md:mb-4">KJM GROUP</h3>
                            <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                                Nền tảng AI Quảng Cáo tự động 24/7 cho Spa/Clinic
                            </p>
                            <div className="text-xs md:text-sm text-gray-600 space-y-1">
                                <p className="hidden md:block">Trụ sở: Số 240 Hùng Vương, Phường Tích Sơn, TP Vĩnh Yên, Tỉnh Vĩnh Phúc</p>
                                <p>Hotline: <a href="tel:0358766789" className="text-pink-600 hover:underline">0358766789</a></p>
                                <p>Email: <a href="mailto:mentor@aiautofb.com" className="text-pink-600 hover:underline">mentor@aiautofb.com</a></p>
                            </div>
                        </div>

                        {/* Products */}
                        <div>
                            <h4 className="font-semibold text-xs md:text-sm text-gray-900 mb-3 md:mb-4">SẢN PHẨM</h4>
                            <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-600">
                                <li><Link to="/main" className="hover:text-gray-900 transition-colors">Bảng điều khiển</Link></li>
                                <li><Link to="#" className="hover:text-gray-900 transition-colors">Quảng cáo bài viết</Link></li>
                                <li><Link to="#" className="hover:text-gray-900 transition-colors">Quảng cáo tin nhắn</Link></li>
                                <li><Link to="#" className="hover:text-gray-900 transition-colors">Quy tắc tự động</Link></li>
                            </ul>
                        </div>

                        {/* Company */}
                        <div>
                            <h4 className="font-semibold text-xs md:text-sm text-gray-900 mb-3 md:mb-4">CÔNG TY</h4>
                            <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-600">
                                <li><Link to="#" className="hover:text-gray-900 transition-colors">Về chúng tôi</Link></li>
                                <li><Link to="#" className="hover:text-gray-900 transition-colors">Blog</Link></li>
                                <li><Link to="#" className="hover:text-gray-900 transition-colors">Tuyển dụng</Link></li>
                                <li><Link to="#" className="hover:text-gray-900 transition-colors">Liên hệ</Link></li>
                            </ul>
                        </div>

                        {/* Resources */}
                        <div className="hidden md:block">
                            <h4 className="font-semibold text-xs md:text-sm text-gray-900 mb-3 md:mb-4">HỖ TRỢ</h4>
                            <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-600">
                                <li><Link to="#" className="hover:text-gray-900 transition-colors">Tài liệu & API</Link></li>
                                <li><Link to="#" className="hover:text-gray-900 transition-colors">Trung tâm trợ giúp</Link></li>
                                <li><Link to="/dashboard/packages" className="hover:text-gray-900 transition-colors">Bảng giá</Link></li>
                                <li><Link to="#" className="hover:text-gray-900 transition-colors">Trạng thái hệ thống</Link></li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom Footer */}
                    <div className="pt-6 md:pt-8 border-t text-center text-xs md:text-sm text-gray-500">
                        <p>© 2024 KJM GROUP. Bảo lưu mọi quyền.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
