import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SubscriptionBanner from './components/SubscriptionBanner';
import Gallery from './pages/Gallery';
import MyDesigns from './pages/MyDesigns';
import Editor from './pages/Editor';
import TemplateManager from './pages/TemplateManager';
import ApiKeysPage from './pages/ApiKeysPage';
import MigrationTool from './components/MigrationTool';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail'; // Added this import
import Pricing from './pages/Pricing';

import AdminVouchers from './pages/AdminVouchers';
import { useUserRole } from './hooks/useUserRole';

// Admin Route component
const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { role, isAdmin, loading: roleLoading } = useUserRole();

  console.log("🛡️ Checking Admin Route:", { isAuthenticated, role, isAdmin, authLoading, roleLoading });

  if (authLoading || roleLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Đang kiểm tra quyền...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Debug: Show why access is denied
  if (!isAdmin) {
    return (
      <div style={{ padding: '50px', color: 'white', textAlign: 'center' }}>
        <h1>Truy cập bị từ chối</h1>
        <p>Bạn không có quyền truy cập trang này.</p>
        <p>Current Role: <strong>{role || 'None'}</strong></p>
        <p>User ID: {useAuth().user?.id}</p>
        <button
          onClick={() => window.location.href = '/'}
          style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}
        >
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  return children;
};

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppRoutes() {
  const [searchValue, setSearchValue] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<VerifyEmail />} />
      <Route path="/pricing" element={<Pricing />} />

      {/* Template Manager - Protected */}
      <Route path="/template" element={
        <ProtectedRoute>
          <TemplateManager />
        </ProtectedRoute>
      } />

      {/* Migration Tool - Protected */}
      <Route path="/migrate" element={
        <ProtectedRoute>
          <div className="app-layout" style={{ background: '#0a0a1a', minHeight: '100vh' }}>
            <MigrationTool />
          </div>
        </ProtectedRoute>
      } />

      {/* Main Layout with Sidebar - Now supports both public and protected routes */}
      <Route path="/*" element={
        <div className="app-layout">
          {/* Mobile Overlay */}
          <div
            className={`sidebar - overlay ${isMobileMenuOpen ? 'visible' : ''} `}
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sidebar */}
          <Sidebar
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />

          {/* Main Content */}
          <div className="main-content">
            <Header
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              credits={90}
              onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              user={user}
              onSignOut={signOut}
            />

            <main className="main-body">
              <SubscriptionBanner />
              <Routes>
                {/* Public route - Gallery accessible without login */}
                <Route path="/" element={
                  <Gallery
                    searchValue={searchValue}
                    activeCategory={activeCategory}
                  />
                } />

                {/* Protected routes - require authentication */}
                <Route path="/my-designs" element={
                  <ProtectedRoute>
                    <MyDesigns />
                  </ProtectedRoute>
                } />
                <Route path="/api-keys" element={
                  <ProtectedRoute>
                    <ApiKeysPage />
                  </ProtectedRoute>
                } />

                {/* Admin Routes */}
                <Route path="/admin/vouchers" element={
                  <AdminRoute>
                    <AdminVouchers />
                  </AdminRoute>
                } />

                <Route path="/editor/:id" element={
                  <ProtectedRoute>
                    <Editor />
                  </ProtectedRoute>
                } />
              </Routes>
            </main>
          </div>
        </div>
      } />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
