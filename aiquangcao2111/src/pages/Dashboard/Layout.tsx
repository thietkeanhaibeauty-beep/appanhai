import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Package,
  Receipt,
  Home,
  BarChart3,
  Settings2,
  Sparkles,
  Menu,
  X,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  const menuItems = [
    { title: t('Gói dịch vụ', 'Service Packages'), url: '/dashboard/packages', icon: Package },
    { title: t('Cài đặt nhóm', 'Team Settings'), url: '/dashboard/workspace', icon: Settings2 },
    { title: t('Lịch sử thanh toán', 'Billing History'), url: '/dashboard/billing', icon: Receipt },
    { title: t('Thống kê sử dụng', 'Usage Stats'), url: '/dashboard/usage', icon: BarChart3 },
  ];

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm",
      isActive
        ? "bg-primary text-primary-foreground font-medium shadow-sm"
        : "text-foreground hover:bg-muted"
    );

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{t('Bảng điều khiển', 'Dashboard')}</span>
            <span className="text-[10px] text-muted-foreground">{t('Quản lý tài khoản', 'Account Management')}</span>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="flex-1 p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3 px-3">
          {t('Menu chính', 'Main Menu')}
        </p>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              className={getNavCls}
              onClick={() => setMobileMenuOpen(false)}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={() => navigate('/home')}
        >
          <Home className="h-4 w-4" />
          <span>{t('Về trang chủ', 'Back to Home')}</span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex w-full">
      {/* Desktop Sidebar - luôn hiển thị */}
      <aside className="hidden md:flex w-56 flex-col bg-background border-r fixed left-0 top-0 h-screen z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-3 left-3 z-50"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "md:hidden fixed left-0 top-0 h-screen w-56 bg-background border-r z-50 flex flex-col transition-transform duration-300",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full md:ml-56">
        <header className="h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
          <div className="flex items-center">
            <div className="md:hidden w-10" /> {/* Spacer for mobile menu button */}
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">{t('Bảng điều khiển người dùng', 'User Dashboard')}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
              className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
              title={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs font-bold">{language === 'vi' ? 'VN' : 'EN'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-2 md:p-4 bg-muted/30">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
