import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function EmailVerified() {
    const [isVerifying, setIsVerifying] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleEmailVerification = async () => {
            try {
                // Check if there's a session (meaning verification was successful)
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    setError('Có lỗi xảy ra khi xác thực. Vui lòng thử lại.');
                    setIsVerifying(false);
                    return;
                }

                if (session) {
                    // User is verified and logged in
                    setIsSuccess(true);
                    setIsVerifying(false);

                    // Auto redirect to dashboard after 3 seconds
                    setTimeout(() => {
                        navigate('/home');
                    }, 3000);
                } else {
                    // No session, might be an invalid or expired link
                    setError('Link xác thực không hợp lệ hoặc đã hết hạn.');
                    setIsVerifying(false);
                }
            } catch (err) {
                setError('Có lỗi xảy ra. Vui lòng thử lại.');
                setIsVerifying(false);
            }
        };

        handleEmailVerification();
    }, [navigate]);

    // Loading state
    if (isVerifying) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12">
                <div className="w-full max-w-md text-center">
                    <div className="flex justify-center mb-6">
                        <Loader2 className="w-16 h-16 text-pink-500 animate-spin" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Đang xác thực...
                    </h1>
                    <p className="text-gray-600">
                        Vui lòng đợi trong giây lát
                    </p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12">
                <div className="w-full max-w-md text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                            <span className="text-4xl">❌</span>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        Xác thực thất bại
                    </h1>
                    <p className="text-gray-600 mb-6">
                        {error}
                    </p>
                    <Link to="/auth/login">
                        <Button className="w-full h-12 bg-pink-500 hover:bg-pink-600 rounded-xl">
                            Quay lại đăng nhập
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Success state
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12">
            <div className="w-full max-w-md text-center">
                {/* Success Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
                        <CheckCircle className="w-14 h-14 text-green-500" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                    🎉 Xác thực thành công!
                </h1>

                {/* Description */}
                <p className="text-gray-600 mb-2">
                    Email của bạn đã được xác thực.
                </p>
                <p className="text-gray-600 mb-8">
                    Tài khoản đã sẵn sàng sử dụng!
                </p>

                {/* Auto redirect notice */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                    <p className="text-green-700">
                        Tự động chuyển đến trang chính sau <strong>3 giây</strong>...
                    </p>
                </div>

                {/* Manual button */}
                <Link to="/">
                    <Button className="w-full h-12 bg-pink-500 hover:bg-pink-600 rounded-xl">
                        Bắt đầu sử dụng ngay
                    </Button>
                </Link>

                {/* Footer */}
                <p className="text-xs text-gray-400 mt-8">
                    Cảm ơn bạn đã đăng ký AI Auto FB!
                </p>
            </div>
        </div>
    );
}
