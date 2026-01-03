import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function EmailConfirmation() {
    const location = useLocation();
    const navigate = useNavigate();
    const email = location.state?.email || '';

    const [otp, setOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);

    // Persist countdown in localStorage to survive page navigation
    const getInitialCountdown = () => {
        const savedExpiry = localStorage.getItem('otp_resend_expiry');
        if (savedExpiry) {
            const remaining = Math.ceil((parseInt(savedExpiry) - Date.now()) / 1000);
            return remaining > 0 ? remaining : 0;
        }
        return 0; // Allow resend immediately on first load
    };

    const [countdown, setCountdown] = useState(getInitialCountdown);
    const [canResend, setCanResend] = useState(getInitialCountdown() === 0);

    const inputRef = useRef<HTMLInputElement>(null);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
            localStorage.removeItem('otp_resend_expiry');
        }
    }, [countdown]);

    // Auto-focus input
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Only allow numbers
        const value = e.target.value.replace(/\D/g, '');
        setOtp(value);
    };

    const handleVerify = async () => {
        if (otp.length < 6) {
            toast.error('Vui lòng nhập đủ mã xác thực');
            return;
        }

        if (!email) {
            toast.error('Không tìm thấy email. Vui lòng đăng ký lại.');
            navigate('/auth/signup');
            return;
        }

        setIsVerifying(true);

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'signup',
            });

            if (error) {
                console.error('OTP verification error:', error);

                if (error.message.includes('expired') || error.message.includes('invalid')) {
                    toast.error('Mã xác nhận không đúng hoặc đã hết hạn', {
                        description: 'Vui lòng nhập lại hoặc yêu cầu gửi mã mới.',
                    });
                } else {
                    toast.error(error.message);
                }

                setOtp('');
                inputRef.current?.focus();
            } else if (data.user) {
                toast.success('Xác thực thành công! Đang thiết lập tài khoản...');

                // Wait for session to fully propagate, then navigate
                // The AuthContext SIGNED_IN handler will auto-assign profile, role, and subscription
                setTimeout(() => {
                    navigate('/home');
                }, 2000);
            }
        } catch (err) {
            console.error('Verify OTP exception:', err);
            toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        if (!canResend || !email) return;

        setIsResending(true);

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
            });

            if (error) {
                console.error('Resend OTP error:', error);
                toast.error('Không thể gửi lại mã. Vui lòng thử lại sau.');
            } else {
                toast.success('Đã gửi lại mã xác nhận!', {
                    description: 'Vui lòng kiểm tra email của bạn.',
                });

                // Save expiry time to localStorage
                const expiryTime = Date.now() + 60 * 1000; // 60 seconds from now
                localStorage.setItem('otp_resend_expiry', expiryTime.toString());

                setCountdown(60);
                setCanResend(false);
                setOtp('');
                inputRef.current?.focus();
            }
        } catch (err) {
            console.error('Resend OTP exception:', err);
            toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsResending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && otp.length >= 6) {
            handleVerify();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12">
            <div className="w-full max-w-md text-center">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center">
                        <Mail className="w-10 h-10 text-pink-500" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                    Nhập mã xác thực
                </h1>

                {/* Description */}
                <p className="text-gray-600 mb-2">
                    Chúng tôi đã gửi mã xác thực đến:
                </p>
                <p className="text-lg font-semibold text-gray-900 mb-6">
                    {email || 'email của bạn'}
                </p>

                {/* OTP Input - Single field */}
                <div className="mb-6">
                    <Input
                        ref={inputRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="Nhập mã xác thực"
                        value={otp}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        className="h-14 text-center text-2xl font-bold tracking-widest bg-white border-gray-200 focus:border-pink-500 rounded-xl"
                        maxLength={10}
                    />
                </div>

                {/* Verify button */}
                <Button
                    onClick={handleVerify}
                    disabled={isVerifying || otp.length < 6}
                    className="w-full h-12 bg-pink-500 hover:bg-pink-600 rounded-xl mb-4"
                >
                    {isVerifying ? 'Đang xác thực...' : 'Xác thực'}
                </Button>

                {/* Resend button */}
                <div className="mb-6">
                    {canResend ? (
                        <button
                            onClick={handleResend}
                            disabled={isResending}
                            className="flex items-center justify-center gap-2 mx-auto text-pink-500 hover:text-pink-600 text-sm font-medium"
                        >
                            <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                            {isResending ? 'Đang gửi...' : 'Gửi lại mã'}
                        </button>
                    ) : (
                        <p className="text-sm text-gray-400">
                            Gửi lại mã sau <span className="font-medium text-gray-600">{countdown}s</span>
                        </p>
                    )}
                </div>

                {/* Note */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left">
                    <p className="text-sm text-yellow-800">
                        <strong>Lưu ý:</strong> Nếu không thấy email, vui lòng kiểm tra thư mục <strong>Spam</strong> hoặc <strong>Quảng cáo</strong>.
                    </p>
                </div>

                {/* Actions */}
                <Link to="/auth/login">
                    <Button variant="outline" className="w-full h-12 rounded-xl">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại trang đăng nhập
                    </Button>
                </Link>

                {/* Footer */}
                <p className="text-xs text-gray-400 mt-8">
                    Không nhận được email? Liên hệ{' '}
                    <a href="mailto:mentor@aiautofb.com" className="text-pink-500 hover:underline">
                        mentor@aiautofb.com
                    </a>
                </p>
            </div>
        </div>
    );
}
