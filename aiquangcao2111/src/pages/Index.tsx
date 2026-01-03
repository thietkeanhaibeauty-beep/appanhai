import { useState, useEffect, useRef } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import NavigationTabs, { TabType } from "@/components/NavigationTabs";
import AIChatPanel from "@/components/AIChatPanel";
import CampaignForm from "@/components/CampaignForm";
import QuickCreativeCreator from "@/components/QuickCreativeCreator";
import AudienceCreator from "@/components/AudienceCreator";
import TargetTemplates from "@/components/TargetTemplates";

import AdvancedAdsManager from "@/components/AdvancedAdsManager";
import AdsReportAuto from "@/pages/AdsReportAuto";
import SalesReport from "@/pages/SalesReport";
import SummaryReport from "@/pages/SummaryReport";
import AutomatedRules from "@/pages/AutomatedRules";
import AdsHistory from "@/pages/AdsHistory";
import NotificationSettings from "@/pages/NotificationSettings";
import { getActiveAdAccounts } from "@/services/nocodb/facebookAdAccountsService";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Restore activeTab from localStorage or default to 'ai-chat'
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('activeTab');
    return (saved as TabType) || 'ai-chat';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const [accountName, setAccountName] = useState("Tài khoản quảng cáo");
  const [accountId, setAccountId] = useState("");

  // Ref to track if initial load has been done - prevent auto-reload on app focus
  const initialLoadedRef = useRef<boolean>(false);

  // Save activeTab to localStorage whenever it changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
  };

  // ✅ Load active account from database - filtered by user_id (ONLY ONCE)
  useEffect(() => {
    const loadActiveAccount = async () => {
      if (!user?.id) return;

      const accounts = await getActiveAdAccounts(user.id);

      if (accounts && accounts.length > 0) {
        setAccountName(accounts[0].account_name || 'Tài khoản quảng cáo');
        setAccountId(accounts[0].account_id);
      }
    };

    // Only load once on initial mount
    if (user?.id && !initialLoadedRef.current) {
      initialLoadedRef.current = true;
      loadActiveAccount();
    }

    // Listen for settings changes (manual trigger from settings modal)
    const handleSettingsUpdate = () => {
      loadActiveAccount();
    };

    window.addEventListener("settings-updated", handleSettingsUpdate);

    return () => {
      window.removeEventListener("settings-updated", handleSettingsUpdate);
    };
  }, [user?.id]);

  // ✅ Listen for navigation events (e.g. from AdsReportAuto to AIChatPanel)
  useEffect(() => {
    const handleNavigation = (event: CustomEvent<TabType>) => {
      if (event.detail) {
        handleTabChange(event.detail);
      }
    };

    window.addEventListener('navigate-to-tab', handleNavigation as EventListener);

    return () => {
      window.removeEventListener('navigate-to-tab', handleNavigation as EventListener);
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'ai-chat':
        return <AIChatPanel fullWidth />;
      case 'create-ads':
        return <CampaignForm />;
      case 'target-templates':
        return <TargetTemplates />;
      case 'create-message':
        return <QuickCreativeCreator />;
      case 'audience':
        return <AudienceCreator />;

      case 'advanced-ads':
        return <AdvancedAdsManager />;
      case 'ads-report':
        return <AdsReportAuto />;
      case 'sales-report':
        return <SalesReport />;
      case 'summary-report':
        return <SummaryReport />;
      case 'automated-rules':
        return <AutomatedRules />;
      case 'ads-history':
        return <AdsHistory />;
      case 'create-quick-ad':
        navigate('/create-quick-ad');
        return null;
      case 'notification-settings':
        return <NotificationSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <Header />

      <div className="flex flex-row flex-1 overflow-hidden relative">
        {/* Mobile: Menu button ở góc phải */}
        {isMobile && (
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="fixed top-2 right-2 z-50 bg-background border shadow-sm"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-64 flex flex-col h-full">
              <NavigationTabs
                activeTab={activeTab}
                onTabChange={(tab) => {
                  handleTabChange(tab);
                  setMobileMenuOpen(false);
                }}
              />
            </SheetContent>
          </Sheet>
        )}

        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <NavigationTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
