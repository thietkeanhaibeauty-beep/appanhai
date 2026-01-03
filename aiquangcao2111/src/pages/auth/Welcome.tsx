import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, BarChart3, Wand2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function Welcome() {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    const features = [
        { icon: Sparkles, label: 'Tối Ưu Hóa Tự Động' },
        { icon: BarChart3, label: 'Phân Tích Chuyên Sâu' },
        { icon: Wand2, label: 'Sáng Tạo Vượt Trội' },
    ];

    return (
        <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-between px-6 py-12">
            {/* AI Brain Image */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full">
                <div className="w-48 h-48 md:w-64 md:h-64 mb-8 relative">
                    <img
                        src="/ai-brain.png"
                        alt="AI Brain"
                        className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-gradient-radial from-blue-500/20 to-transparent rounded-full blur-2xl" />
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-white text-center leading-tight mb-4">
                    Tự Động Hóa Chạy Quảng Cáo Bằng Trí Tuệ Nhân Tạo
                </h1>

                {/* Subtitle */}
                <p className="text-gray-400 text-center text-base md:text-lg mb-10">
                    Tối ưu chi phí, tiếp cận đúng khách hàng và bứt phá doanh thu.
                </p>

                {/* Feature Icons */}
                <div className="flex items-center justify-center gap-8 mb-10">
                    {features.map((feature, index) => (
                        <div key={index} className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-2xl bg-[#1a2a42] flex items-center justify-center">
                                <feature.icon className="w-6 h-6 text-blue-400" />
                            </div>
                            <span className="text-xs text-gray-400 text-center max-w-[80px]">
                                {feature.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Pagination dots */}
                <div className="flex items-center gap-2 mb-10">
                    <div className="w-6 h-2 bg-blue-500 rounded-full" />
                    <div className="w-2 h-2 bg-gray-600 rounded-full" />
                    <div className="w-2 h-2 bg-gray-600 rounded-full" />
                </div>
            </div>

            {/* CTA Buttons */}
            <div className="w-full max-w-md space-y-4">
                <Link to="/auth/login?mode=signup" className="block">
                    <Button
                        className="w-full h-14 text-lg font-semibold bg-blue-500 hover:bg-blue-600 rounded-2xl"
                    >
                        Tạo tài khoản miễn phí
                    </Button>
                </Link>

                <Link
                    to="/auth/login"
                    className="block w-full text-center text-blue-400 text-base hover:text-blue-300 transition-colors py-2"
                >
                    Đã có tài khoản? Đăng nhập
                </Link>
            </div>
        </div>
    );
}
