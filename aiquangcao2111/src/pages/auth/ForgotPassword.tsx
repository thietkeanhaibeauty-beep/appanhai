import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { z } from 'zod';
import { Sparkles, ArrowLeft, CheckCircle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }),
});

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      const fieldErrors: { email?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as 'email'] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await resetPassword(email);
    setIsSubmitting(false);

    if (!error) {
      setIsEmailSent(true);
    }
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-4 md:py-12">
        <div className="w-full max-w-sm text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
            Kiểm tra email của bạn
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Chúng tôi đã gửi liên kết đặt lại mật khẩu đến <span className="text-gray-900 font-medium">{email}</span>. Vui lòng kiểm tra hộp thư đến (và cả thư rác).
          </p>

          <Link to="/auth/login">
            <Button
              variant="outline"
              className="w-full h-12 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại đăng nhập
            </Button>
          </Link>
        </div>
      </div>
    );
  }

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
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-2">
          Quên mật khẩu?
        </h1>
        <p className="text-gray-500 text-sm text-center mb-6 md:mb-8">
          Nhập email của bạn để nhận liên kết đặt lại mật khẩu.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
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

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold bg-pink-500 hover:bg-pink-600 rounded-xl"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
          </Button>

          {/* Back link */}
          <div className="text-center">
            <Link to="/auth/login" className="text-sm text-gray-500 hover:text-pink-500 inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
