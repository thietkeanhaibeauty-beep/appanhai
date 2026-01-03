import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { Sparkles, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const signupSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }),
  password: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }),
  confirmPassword: z.string().min(6, { message: 'Xác nhận mật khẩu phải có ít nhất 6 ký tự' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"],
});

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState<{ message: string; code?: string }>({ message: '' });
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setBackendError({ message: '' });

    const result = signupSchema.safeParse({ email, password, confirmPassword });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as 'email' | 'password' | 'confirmPassword'] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(email, password);

    if (error) {
      setBackendError({ message: error.message, code: error.code });
    } else {
      // Redirect to OTP verification page with email in state
      navigate('/auth/email-confirmation', { state: { email } });
    }

    setIsSubmitting(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      toast.error('Không thể đăng nhập với Google');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-4 md:py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-3 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-4 md:mb-8">
          Tạo tài khoản mới
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700 text-sm">Địa chỉ Email</Label>
            <Input
              className="h-10 md:h-12 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-pink-500 rounded-xl"
              id="email"
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700 text-sm">Mật khẩu</Label>
            <div className="relative">
              <Input
                className="h-10 md:h-12 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-pink-500 rounded-xl pr-12"
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu của bạn"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-700 text-sm">Xác nhận mật khẩu</Label>
            <Input
              className="h-10 md:h-12 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-pink-500 rounded-xl"
              id="confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold bg-pink-500 hover:bg-pink-600 rounded-xl"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký'}
          </Button>

          {/* Error messages */}
          {backendError.message && (
            <div className="p-3 text-sm rounded-lg bg-red-50 border border-red-200 text-red-600">
              {backendError.message}
            </div>
          )}



          {/* Login link */}
          <p className="text-sm text-gray-500 text-center mt-3 md:mt-6">
            Đã có tài khoản?{' '}
            <Link to="/auth/login" className="text-pink-500 hover:underline">
              Đăng nhập
            </Link>
          </p>

          {/* Terms footer */}
          <p className="text-xs text-gray-400 text-center">
            Bằng việc đăng ký, bạn đồng ý với{' '}
            <Link to="/terms" className="text-pink-500 hover:underline">Điều khoản dịch vụ</Link>
            {' '}và{' '}
            <Link to="/privacy" className="text-pink-500 hover:underline">Chính sách bảo mật</Link>
            {' '}của chúng tôi.
          </p>
        </form>
      </div>
    </div>
  );
}
