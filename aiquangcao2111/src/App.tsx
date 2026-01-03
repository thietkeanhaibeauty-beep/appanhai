import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SuperAdminLayout from "./pages/SuperAdmin/Layout";
import DashboardLayout from "./pages/Dashboard/Layout";
import DashboardSubscription from "./pages/Dashboard/Subscription";
import DashboardPackages from "./pages/Dashboard/Packages";
import DashboardPayment from "./pages/Dashboard/Payment";
import DashboardBilling from "./pages/Dashboard/Billing";
import DashboardUsage from "./pages/Dashboard/Usage";
import TestFacebookId from "./pages/TestFacebookId";
import FeatureConnectionTest from "./pages/FeatureConnectionTest";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Welcome from "./pages/auth/Welcome";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import EmailConfirmation from "./pages/auth/EmailConfirmation";
import EmailVerified from "./pages/auth/EmailVerified";
import VerifyOTP from "./pages/auth/VerifyOTP";
import InviteAccept from "./pages/auth/InviteAccept";
import AdminActivation from "./pages/AdminActivation";
import CreateQuickAd from "./pages/CreateQuickAd";
import VerifyTokenPermissions from "./pages/VerifyTokenPermissions";
import PopulateNocoDBFeatures from "./pages/PopulateNocoDBFeatures";
import TestNocoDBData from "./pages/TestNocoDBData";
import TestCronJobs from "./pages/TestCronJobs";

import AdsReportAuto from "./pages/AdsReportAuto";
import SetupNotificationTables from "./pages/SetupNotificationTables";
import NotificationSettings from "./pages/NotificationSettings";
import AdsArchive from "./pages/AdsArchive";
import DraftsPage from "./pages/DraftsPage";
import WorkspaceSettings from "./pages/WorkspaceSettings";
import LandingPage from "./pages/LandingPage";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <LanguageProvider>
              <SettingsProvider>
                <Routes>
                  {/* Public Auth Routes */}
                  <Route path="/auth/welcome" element={<Welcome />} />
                  <Route path="/auth/login" element={<Login />} />
                  <Route path="/auth/signup" element={<Signup />} />
                  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                  <Route path="/auth/reset-password" element={<ResetPassword />} />
                  <Route path="/auth/email-confirmation" element={<EmailConfirmation />} />
                  <Route path="/auth/email-verified" element={<EmailVerified />} />
                  <Route path="/auth/verify-otp" element={<VerifyOTP />} />
                  <Route path="/auth/invite-accept" element={<InviteAccept />} />
                  <Route path="/admin-activation" element={<AdminActivation />} />
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />

                  {/* Protected Routes */}
                  <Route path="/home" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/ads-report-auto" element={<ProtectedRoute><AdsReportAuto /></ProtectedRoute>} />
                  <Route path="/create-quick-ad" element={<ProtectedRoute><CreateQuickAd /></ProtectedRoute>} />
                  <Route path="/test-facebook-id" element={<ProtectedRoute><TestFacebookId /></ProtectedRoute>} />
                  <Route path="/feature-test" element={<ProtectedRoute><FeatureConnectionTest /></ProtectedRoute>} />
                  <Route path="/verify-token-permissions" element={<ProtectedRoute><VerifyTokenPermissions /></ProtectedRoute>} />
                  <Route path="/populate-nocodb-features" element={<ProtectedRoute><PopulateNocoDBFeatures /></ProtectedRoute>} />
                  <Route path="/test-nocodb-data" element={<ProtectedRoute><TestNocoDBData /></ProtectedRoute>} />
                  <Route path="/test-cron-jobs" element={<ProtectedRoute><TestCronJobs /></ProtectedRoute>} />
                  <Route path="/setup-notifications" element={<ProtectedRoute><SetupNotificationTables /></ProtectedRoute>} />
                  <Route path="/notification-settings" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
                  <Route path="/ads-archive" element={<ProtectedRoute><AdsArchive /></ProtectedRoute>} />
                  <Route path="/drafts" element={<ProtectedRoute><DraftsPage /></ProtectedRoute>} />
                  <Route path="/workspace-settings" element={<ProtectedRoute><WorkspaceSettings /></ProtectedRoute>} />

                  {/* User Dashboard Routes */}
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                    <Route index element={<DashboardSubscription />} />
                    <Route path="subscription" element={<DashboardSubscription />} />
                    <Route path="packages" element={<DashboardPackages />} />
                    <Route path="workspace" element={<WorkspaceSettings />} />
                    <Route path="payment" element={<DashboardPayment />} />
                    <Route path="billing" element={<DashboardBilling />} />
                    <Route path="usage" element={<DashboardUsage />} />
                  </Route>

                  {/* Super Admin Routes */}
                  <Route path="/super-admin" element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>} />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SettingsProvider>
            </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
