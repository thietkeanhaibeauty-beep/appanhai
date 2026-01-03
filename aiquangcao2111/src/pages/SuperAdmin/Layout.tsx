import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Database,
  Activity,
  ShieldCheck,
  CreditCard,
  Package,
  Layers,
  LogOut,
  Settings,
  Receipt,
  Sparkles,
  Trash2,
  Timer,
  Key,
  Coins,
  Globe,
  MessageSquare
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// Import page components
import Dashboard from './Dashboard';
import UsersManagement from './UsersManagement';
import FeatureManagement from './FeatureManagement';
import AIFeaturesManagement from './AIFeaturesManagement';
import FeatureCleanup from './FeatureCleanup';
import DataManagement from './DataManagement';
import SystemMonitoring from './SystemMonitoring';
import PaymentSettings from './PaymentSettings';
import PaymentPackages from './PaymentPackages';
import Subscriptions from './Subscriptions';
import CronManagement from './CronManagement';
import AIKeywordsManagement from './AIKeywordsManagement';
import GlobalAPISettings from './GlobalAPISettings';
import TokenUsageHistory from './TokenUsageHistory';
import SubscriptionTest from './SubscriptionTest';
import LandingPageEditor from '@/components/superadmin/LandingPageEditor';
import ZaloAdminSettings from './ZaloAdminSettings';

const menuItems = [
  { title: 'Bảng điều khiển', value: 'dashboard', icon: LayoutDashboard },
  { title: 'Quản lý người dùng', value: 'users', icon: Users },
  { title: 'Quản lý tính năng', value: 'features', icon: Layers },
  { title: 'Tính năng AI', value: 'ai-features', icon: Sparkles },
  { title: 'Từ khóa AI', value: 'ai-keywords', icon: Sparkles },
  { title: 'Dọn dẹp tính năng', value: 'cleanup', icon: Trash2 },
  { title: 'Quản lý dữ liệu', value: 'data', icon: Database },
  { title: 'Giám sát hệ thống', value: 'monitoring', icon: Activity },
  { title: 'Cài đặt thanh toán', value: 'payment-settings', icon: CreditCard },
  { title: 'Quản lý gói', value: 'payment-packages', icon: Package },
  { title: 'Thanh toán & Subscriptions', value: 'subscriptions', icon: Receipt },
  { title: 'Quản lý Cron & Thông báo', value: 'cron', icon: Timer },
  { title: 'Global API Settings', value: 'global-api', icon: Key },
  { title: 'Token Usage', value: 'token-usage', icon: Coins },
  { title: 'Test Subscription', value: 'subscription-test', icon: ShieldCheck },
  { title: 'Landing Page', value: 'landing-page', icon: Globe },
  { title: 'Zalo Admin', value: 'zalo-admin', icon: MessageSquare },
];

interface SuperAdminSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

function SuperAdminSidebar({ activeTab, onTabChange }: SuperAdminSidebarProps) {
  const { state } = useSidebar();
  const { signOut } = useAuth();

  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar className={isCollapsed ? 'w-14' : 'w-60'} collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            {!isCollapsed && <span className="font-bold text-lg">Quản trị viên</span>}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Điều hướng</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.value)}
                    className={activeTab === item.value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'}
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Đăng xuất</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function SuperAdminLayout() {
  const STORAGE_KEY = 'superadmin_active_tab';
  const [activeTab, setActiveTab] = useState(() => {
    // Khởi tạo từ localStorage nếu có
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && menuItems.some(item => item.value === saved) ? saved : 'dashboard';
  });

  // Lưu vào localStorage khi thay đổi tab
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  return (
    <SidebarProvider>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="min-h-screen flex w-full">
          <SuperAdminSidebar activeTab={activeTab} onTabChange={handleTabChange} />

          <div className="flex-1 flex flex-col">
            <header className="h-14 border-b flex items-center px-4 bg-background">
              <SidebarTrigger />
              <div className="ml-4">
                <h1 className="text-xl font-semibold">Bảng điều khiển Quản trị viên</h1>
              </div>
            </header>

            <main className="flex-1 p-6 overflow-auto">
              <TabsContent value="dashboard" className="mt-0">
                <Dashboard />
              </TabsContent>

              <TabsContent value="users" className="mt-0">
                <UsersManagement />
              </TabsContent>

              <TabsContent value="features" className="mt-0">
                <FeatureManagement />
              </TabsContent>

              <TabsContent value="ai-features" className="mt-0">
                <AIFeaturesManagement />
              </TabsContent>

              <TabsContent value="ai-keywords" className="mt-0">
                <AIKeywordsManagement />
              </TabsContent>

              <TabsContent value="cleanup" className="mt-0">
                <FeatureCleanup />
              </TabsContent>

              <TabsContent value="data" className="mt-0">
                <DataManagement />
              </TabsContent>

              <TabsContent value="monitoring" className="mt-0">
                <SystemMonitoring />
              </TabsContent>

              <TabsContent value="payment-settings" className="mt-0">
                <PaymentSettings />
              </TabsContent>

              <TabsContent value="payment-packages" className="mt-0">
                <PaymentPackages />
              </TabsContent>

              <TabsContent value="subscriptions" className="mt-0">
                <Subscriptions />
              </TabsContent>

              <TabsContent value="cron" className="mt-0">
                <CronManagement />
              </TabsContent>

              <TabsContent value="global-api" className="mt-0">
                <GlobalAPISettings />
              </TabsContent>

              <TabsContent value="token-usage" className="mt-0">
                <TokenUsageHistory />
              </TabsContent>

              <TabsContent value="subscription-test" className="mt-0">
                <SubscriptionTest />
              </TabsContent>

              <TabsContent value="landing-page" className="mt-0">
                <LandingPageEditor />
              </TabsContent>

              <TabsContent value="zalo-admin" className="mt-0">
                <ZaloAdminSettings />
              </TabsContent>
            </main>
          </div>
        </div>
      </Tabs>
    </SidebarProvider>
  );
}
