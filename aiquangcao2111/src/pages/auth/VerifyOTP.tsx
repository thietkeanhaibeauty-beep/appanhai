import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function VerifyOTP() {
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email') || '';
    const navigate = useNavigate();

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

    // Auto-focus first input
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    // Redirect if no email
    useEffect(() => {
        if (!email) {
            toast.error('Không tìm thấy email. Vui lòng đăng ký lại.');
            navigate('/auth/signup');
        }
    }, [email, navigate]);

    const handleChange = (index: number, value: string) => {
        // Only allow numbers
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // Only take last character
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Handle backspace
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

        if (pastedData.length === 6) {
            const newOtp = pastedData.split('');
            setOtp(newOtp);
            inputRefs.current[5]?.focus();
        }
    };

    const handleVerify = async () => {
        const otpString = otp.join('');

        if (otpString.length !== 6) {
            toast.error('Vui lòng nhập đủ 6 số');
            return;
        }

        setIsVerifying(true);

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token: otpString,
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

                // Clear OTP inputs
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            } else if (data.user) {
                toast.success('Xác thực thành công! Đang đăng nhập...');

                // Give time for session to be established
                setTimeout(() => {
                    navigate('/home');
                }, 1000);
            }
        } catch (err) {
            console.error('Verify OTP exception:', err);
            toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;

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

                // Reset countdown
                setCountdown(60);
                setCanResend(false);

                // Clear OTP inputs
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (err) {
            console.error('Resend OTP exception:', err);
            toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-4 md:py-12">
            <div className="w-full max-w-sm">
                {/* Back button */}
                <button
                    onClick={() => navigate('/auth/signup')}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại đăng ký
                </button>

                {/* Logo */}
                <div className="flex justify-center mb-3 md:mb-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-2">
                    Xác thực Email
                </h1>

                <p className="text-sm text-gray-500 text-center mb-6">
                    Nhập mã 6 số đã gửi đến<br />
                    <span className="font-medium text-gray-700">{email}</span>
                </p>

                {/* OTP Input */}
                <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
                    {otp.map((digit, index) => (
                        <Input
                            key={index}
                            ref={(el) => (inputRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            className="w-12 h-14 text-center text-2xl font-bold bg-white border-gray-200 focus:border-pink-500 rounded-xl"
                        />
                    ))}
                </div>

                {/* Verify button */}
                <Button
                    onClick={handleVerify}
                    disabled={isVerifying || otp.join('').length !== 6}
                    className="w-full h-12 text-base font-semibold bg-pink-500 hover:bg-pink-600 rounded-xl mb-4"
                >
                    {isVerifying ? 'Đang xác thực...' : 'Xác thực'}
                </Button>

                {/* Resend button */}
                <div className="text-center">
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

                {/* Help text */}
                <p className="text-xs text-gray-400 text-center mt-6">
                    Không nhận được email? Kiểm tra thư mục spam hoặc thử đăng ký lại với email khác.
                </p>
            </div>
        </div>
    );
}
