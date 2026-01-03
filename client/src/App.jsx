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
import Pricing from './pages/Pricing';

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

      {/* Main Layout with Sidebar - Protected */}
      <Route path="/*" element={
        <ProtectedRoute>
          <div className="app-layout">
            {/* Mobile Overlay */}
            <div
              className={`sidebar-overlay ${isMobileMenuOpen ? 'visible' : ''}`}
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
                  <Route path="/" element={
                    <Gallery
                      searchValue={searchValue}
                      activeCategory={activeCategory}
                    />
                  }
                  />
                  <Route path="/my-designs" element={<MyDesigns />} />
                  <Route path="/api-keys" element={<ApiKeysPage />} />
                  <Route path="/editor/:id" element={<Editor />} />
                </Routes>
              </main>
            </div>
          </div>
        </ProtectedRoute>
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
