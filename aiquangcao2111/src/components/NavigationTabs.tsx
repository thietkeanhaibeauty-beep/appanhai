import { useState, useEffect } from "react";
import { BarChart3, PenSquare, FileText, MessageSquare, Sparkles, Users, Copy, User, CreditCard, ShieldCheck, LogOut, Settings, PlusCircle, Shield, Zap, Bell, LineChart, Target, History, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useFeatures } from "@/hooks/useFeatures";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import SettingsModal from "./SettingsModal";
import UserProfileMenu from "./UserProfileMenu";
import ProfileSettingsDialog from "./ProfileSettingsDialog";
import ChangePasswordDialog from "./ChangePasswordDialog";
import { getUserProfile } from "@/services/nocodb/profilesService";
import { getActiveAdAccounts } from "@/services/nocodb/facebookAdAccountsService";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useSubscription } from "@/hooks/useSubscription";
import { Coins, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getTokenPackages, TokenPackage } from '@/services/nocodb/tokenPackagesService';

export type TabType = 'ai-chat' | 'create-ads' | 'target-templates' | 'create-message' | 'audience' | 'ads-report' | 'advanced-ads' | 'sales-report' | 'summary-report' | 'automated-rules' | 'ads-history' | 'create-quick-ad' | 'notification-settings' | 'ad-account-settings';

type TabCategory = 'ai' | 'manual' | 'report' | 'system';
type AllowedRole = 'user' | 'admin' | 'super_admin';

interface Tab {
  id: TabType;
  labelVi: string;
  labelEn: string;
  icon: React.ReactNode;
  badge?: number;
  category: TabCategory;
  allowedRoles: AllowedRole[];
  featureFlag?: string;
}

interface NavigationTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: Tab[] = [
  {
    id: 'ai-chat',
    labelVi: 'Trợ lý AI',
    labelEn: 'AI Assistant',
    icon: <Sparkles className="w-5 h-5" />,
    category: 'ai',
    allowedRoles: ['user', 'admin', 'super_admin'],
  },
  {
    id: 'create-ads',
    labelVi: 'Tạo quảng cáo bản',
    labelEn: 'Create Ad Draft',
    icon: <PenSquare className="w-5 h-5" />,
    category: 'manual',
    allowedRoles: ['user', 'admin', 'super_admin'],
    featureFlag: 'manual_create_ads',
  },
  {
    id: 'create-message',
    labelVi: 'Tạo QC tin nhắn mới',
    labelEn: 'Create Message Ad',
    icon: <MessageSquare className="w-5 h-5" />,
    category: 'manual',
    allowedRoles: ['user', 'admin', 'super_admin'],
    featureFlag: 'manual_create_message',
  },
  {
    id: 'audience',
    labelVi: 'Tạo lập đối tượng',
    labelEn: 'Create Audience',
    icon: <Users className="w-5 h-5" />,
    category: 'manual',
    allowedRoles: ['user', 'admin', 'super_admin'],
    featureFlag: 'manual_audience',
  },
  {
    id: 'advanced-ads',
    labelVi: 'Nhân bản chiến dịch',
    labelEn: 'Clone Campaign',
    icon: <Copy className="w-5 h-5" />,
    category: 'manual',
    allowedRoles: ['user', 'admin', 'super_admin'],
    featureFlag: 'manual_advanced_ads',
  },
  {
    id: 'ads-report',
    labelVi: 'Báo cáo Ads',
    labelEn: 'Ads Report',
    icon: <LineChart className="w-5 h-5" />,
    category: 'report',
    allowedRoles: ['user', 'admin', 'super_admin'],
    featureFlag: 'report_ads',
  },
  {
    id: 'sales-report',
    labelVi: 'Báo cáo sale',
    labelEn: 'Sales Report',
    icon: <FileText className="w-5 h-5" />,
    category: 'report',
    allowedRoles: ['user', 'admin', 'super_admin'],
    featureFlag: 'report_sale',
  },
  {
    id: 'summary-report',
    labelVi: 'Báo cáo tổng',
    labelEn: 'Summary Report',
    icon: <BarChart3 className="w-5 h-5" />,
    category: 'report',
    allowedRoles: ['user', 'admin', 'super_admin'],
    featureFlag: 'report_summary',
  },
  {
    id: 'automated-rules',
    labelVi: 'Quy tắc tự động',
    labelEn: 'Automation Rules',
    icon: <Zap className="w-5 h-5" />,
    category: 'report',
    allowedRoles: ['user', 'admin', 'super_admin'],
    featureFlag: 'automated_rules',
  },
  {
    id: 'notification-settings',
    labelVi: 'Cài đặt thông báo',
    labelEn: 'Notification Settings',
    icon: <Bell className="w-5 h-5" />,
    category: 'report',
    allowedRoles: ['user', 'admin', 'super_admin'],
    featureFlag: 'notification_settings',
  },
  {
    id: 'ads-history',
    labelVi: 'Lịch sử quảng cáo',
    labelEn: 'Ads History',
    icon: <History className="w-5 h-5" />,
    category: 'report',
    allowedRoles: ['user', 'admin', 'super_admin'],
    featureFlag: 'ads_history',
  },
  {
    id: 'ad-account-settings',
    labelVi: 'Cài đặt TK quảng cáo',
    labelEn: 'Ad Account Settings',
    icon: <Settings className="w-5 h-5" />,
    category: 'report',
    allowedRoles: ['user', 'admin', 'super_admin'],
    featureFlag: 'ad_account_settings',
  },
  {
    id: 'target-templates',
    labelVi: 'Mẫu nhắm mục tiêu',
    labelEn: 'Target Templates',
    icon: <Target className="w-5 h-5" />,
    category: 'report',
    allowedRoles: ['user', 'admin', 'super_admin'],
    featureFlag: 'manual_target_templates',
  },
];

const NavigationTabs = ({ activeTab, onTabChange }: NavigationTabsProps) => {
  const { user, signOut } = useAuth();
  const { roles } = useUserRole();
  const { hasFeature } = useFeatures();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const { balance } = useTokenBalance();
  const { subscription, tier, daysRemaining } = useSubscription();
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([]);
  const [showTopupDialog, setShowTopupDialog] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/login');
  };

  // Filter tabs based on feature flags (tier-based from Edge Function)
  // Note: super_admin override is handled in get-feature-flags Edge Function
  const visibleTabs = tabs.filter(tab => {
    // AI chat tab is always visible (no feature flag)
    if (!tab.featureFlag) {
      return true;
    }

    // Check feature flag (tier-based permission from Edge Function)
    const featureEnabled = hasFeature(tab.featureFlag);
    if (!featureEnabled) {
      return false;
    }

    return true;
  });

  // Group tabs by category
  const groupedTabs = {
    ai: visibleTabs.filter(t => t.category === 'ai'),
    manual: visibleTabs.filter(t => t.category === 'manual'),
    report: visibleTabs.filter(t => t.category === 'report'),
    system: visibleTabs.filter(t => t.category === 'system'),
  };

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;

      try {
        const profile = await getUserProfile(user.id);
        setUserEmail(user.email || "");

        if (profile?.full_name) {
          setUserName(profile.full_name);
        } else {
          // Fallback to email username
          const emailUsername = user.email?.split('@')[0] || 'User';
          setUserName(emailUsername);
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        setUserEmail(user.email || "");
        const emailUsername = user.email?.split('@')[0] || 'User';
        setUserName(emailUsername);
      }
    };

    loadUserProfile();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      loadUserProfile();
    };

    window.addEventListener("profile-updated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, [user]);

  // Load token packages for top-up
  useEffect(() => {
    getTokenPackages().then(setTokenPackages);
  }, []);

  // Load ad account info
  useEffect(() => {
    const loadAdAccount = async () => {
      if (!user?.id) return;

      try {
        const accounts = await getActiveAdAccounts(user.id);
        if (accounts && accounts.length > 0) {
          setAccountName(accounts[0].account_name || '');
          setAccountId(accounts[0].account_id || '');
        } else {
          setAccountName('');
          setAccountId('');
        }
      } catch (error) {
        console.error('Failed to load ad account:', error);
        setAccountName('');
        setAccountId('');
      }
    };

    loadAdAccount();

    // Listen for settings changes
    const handleSettingsUpdate = () => {
      loadAdAccount();
    };

    window.addEventListener("settings-updated", handleSettingsUpdate);

    return () => {
      window.removeEventListener("settings-updated", handleSettingsUpdate);
    };
  }, [user?.id]);

  return (
    <nav className="w-64 border-r bg-background flex-shrink-0 flex flex-col h-full max-h-screen overflow-hidden">
      {/* Main Navigation - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* LOGO AREA (Optional, usually top left) */}
        {/* If there is no specific logo component, we can add a title here if needed */}

        {/* AI Features Section */}
        {groupedTabs.ai.length > 0 && (
          <div className="space-y-2">
            {groupedTabs.ai.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 w-full text-sm font-medium transition-all rounded-lg shadow-sm",
                  activeTab === tab.id
                    ? "bg-pink-600 text-white hover:bg-pink-700" // Active: màu đậm
                    : "bg-pink-400/70 text-white/90 hover:bg-pink-500" // Inactive: màu nhạt hơn
                )}
              >
                <Sparkles className={cn("w-5 h-5", activeTab === tab.id ? "fill-white/20" : "fill-white/10")} />
                <span className="flex-1 text-left font-bold">{t(tab.labelVi, tab.labelEn)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Manual Tools Section */}
        {groupedTabs.manual.length > 0 && (
          <div className="space-y-1">
            {groupedTabs.manual.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 w-full text-sm font-medium transition-all rounded-lg",
                  activeTab === tab.id
                    ? "text-foreground font-semibold bg-secondary/50" // Active state
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                )}
              >
                {/* Icon logic: Active = dark, Inactive = muted */}
                <div className={cn("transition-colors", activeTab === tab.id ? "text-foreground" : "text-muted-foreground")}>
                  {tab.icon}
                </div>
                <span className="flex-1 text-left">{t(tab.labelVi, tab.labelEn)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Reports Section */}
        {groupedTabs.report.length > 0 && (
          <div className="space-y-1">
            {groupedTabs.report.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'ad-account-settings') {
                    setSettingsOpen(true);
                  } else {
                    onTabChange(tab.id);
                  }
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 w-full text-sm font-medium transition-all rounded-lg",
                  activeTab === tab.id
                    ? "text-foreground font-semibold bg-secondary/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                )}
              >
                <div className={cn("transition-colors", activeTab === tab.id ? "text-foreground" : "text-muted-foreground")}>
                  {tab.icon}
                </div>
                <span className="flex-1 text-left">{t(tab.labelVi, tab.labelEn)}</span>
              </button>
            ))}
          </div>
        )}


      </div>

      {/* User Menu at Bottom - Fixed */}
      <div className="p-4 border-t space-y-4 bg-background">

        {/* Coin Balance Display */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-3 border border-yellow-500/20">
          {/* Package Name & Expiry */}
          <div className="text-[10px] text-muted-foreground mb-1 flex justify-between">
            <span>{t('Gói', 'Plan')}: <span className="font-medium text-foreground capitalize">{tier || 'Trial'}</span></span>
            {subscription?.end_date && (
              <span>{t('HH', 'Exp')}: {new Date(subscription.end_date).toLocaleDateString('vi-VN')}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-500" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{t('Số dư coin', 'Coin Balance')}</p>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {balance.toLocaleString()} <span className="text-xs font-normal">coin</span>
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-5 px-2 text-[9px] text-yellow-600 border-yellow-400 hover:bg-yellow-100"
              onClick={() => setShowTopupDialog(true)}
            >
              {t('+ Nạp tiền', '+ Top Up')}
            </Button>
          </div>
        </div>

        {/* Token Top-up Dialog - Centered */}
        <Dialog open={showTopupDialog} onOpenChange={setShowTopupDialog}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Coins className="h-5 w-5 text-yellow-500" />
                {t('Nạp thêm Tokens', 'Top Up Tokens')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {tokenPackages.map((pkg) => (
                <button
                  key={pkg.Id}
                  onClick={() => {
                    setShowTopupDialog(false);
                    navigate(`/dashboard/payment?type=token&tokenPackageId=${pkg.Id}`);
                  }}
                  className="w-full p-3 text-left border rounded-lg hover:bg-muted/50 hover:border-primary transition-colors flex justify-between items-center"
                >
                  <span className="font-medium">{pkg.tokens.toLocaleString()} tokens</span>
                  <span className="text-primary font-bold">{pkg.price.toLocaleString()}đ</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Settings Links */}
        <div className="space-y-1">
          <button
            onClick={() => navigate('/workspace-settings')}
            className="flex items-center gap-3 px-2 py-2 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-all rounded-md"
          >
            <Building2 className="w-4 h-4" />
            <span className="flex-1 text-left">{t('Quản lý Workspace', 'Manage Workspace')}</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/subscription')}
            className="flex items-center gap-3 px-2 py-2 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-all rounded-md"
          >
            <CreditCard className="w-4 h-4" />
            <span className="flex-1 text-left">{t('Gói đăng ký của tôi', 'My Subscription')}</span>
          </button>

          {roles.includes('super_admin') && (
            <button
              onClick={() => navigate('/super-admin')}
              className="flex items-center gap-3 px-2 py-2 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-all rounded-md"
            >
              <Shield className="w-4 h-4" />
              <span className="flex-1 text-left">Super Admin</span>
            </button>
          )}
        </div>

        <Separator />

        {/* User Profile Menu - At bottom */}
        <UserProfileMenu
          userName={userName}
          userEmail={userEmail}
          accountName={accountName}
          accountId={accountId}
          onOpenProfileSettings={() => setProfileSettingsOpen(true)}
          onOpenChangePassword={() => setChangePasswordOpen(true)}
          onLogout={handleLogout}
        >
          <button className="w-full flex items-center gap-3 hover:bg-secondary/50 p-2 rounded-lg transition-colors">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarFallback className="bg-[#1f2937] text-white font-bold">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-bold text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground">{t('Tài khoản cá nhân', 'Personal Account')}</p>
            </div>
          </button>
        </UserProfileMenu>
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ProfileSettingsDialog open={profileSettingsOpen} onOpenChange={setProfileSettingsOpen} />
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </nav>
  );
};

export default NavigationTabs;
