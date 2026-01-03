import React from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[40%_60%]">
      {/* Left side - Branding (Hidden on mobile) */}
      <div className="relative hidden md:flex items-center justify-center p-12 gradient-primary">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">
            Facebook Ads Manager
          </h1>
          <p className="text-lg text-primary-foreground/90">
            Quản lý và tối ưu hóa chiến dịch quảng cáo Facebook một cách thông minh với AI
          </p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex items-center justify-center p-4 md:p-8 bg-background">
        <div className="w-full max-w-md space-y-6 md:space-y-8">
          <div className="text-center">
            {/* Mobile Logo/Brand Name */}
            <Link to="/" className="inline-block mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
                Facebook Ads Manager
              </h2>
            </Link>
            <h3 className="text-xl md:text-2xl font-semibold text-foreground">{title}</h3>
            {subtitle && (
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>

          <div className="mt-6 md:mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
};
