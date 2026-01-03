
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { categoriesApi } from '../services/api';
import { useFeatures } from '../hooks/useFeatures';
import { useUserRole } from '../hooks/useUserRole';

// Regular menu items (visible to all users)
const menuItems = [
  { id: 'gallery', label: 'Thư Viện Template', icon: 'grid', path: '/' },
  { id: 'my-designs', label: 'Thiết Kế Của Tôi', icon: 'folder', path: '/my-designs' },
];

// Admin-only menu items (require specific features)
const adminMenuItems = [
  { id: 'template', label: 'Tạo Template Mới', icon: 'settings', path: '/template', featureKey: 'manage_api_keys' },
  { id: 'api-keys', label: 'API Keys', icon: 'settings', path: '/api-keys', featureKey: 'manage_api_keys' },
];

const categories = [
  { id: 'all', label: 'Tất cả', icon: 'apps' },
  { id: 'favorites', label: 'Mẫu yêu thích', icon: 'star' },
  { id: 'banner', label: 'Banner', icon: 'image' },
  { id: 'poster', label: 'Poster', icon: 'document' },
  { id: 'social', label: 'Social Media', icon: 'share' },
  { id: 'product', label: 'Sản phẩm', icon: 'cube' },
];

// Fixed categories that always appear
const FIXED_CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: 'apps' },
  { id: 'favorites', label: 'Mẫu yêu thích', icon: 'star' },
];

const Icons = {
  grid: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  folder: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  apps: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  image: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  document: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  share: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  ),
  cube: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  star: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

export default function Sidebar({ activeCategory, onCategoryChange, isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasFeature } = useFeatures();
  const { isAdmin } = useUserRole();

  // Handle category click - navigate to Gallery if on My Designs page
  const handleCategoryClick = (categoryId) => {
    onCategoryChange(String(categoryId));
    // If on My Designs page, navigate to Gallery
    if (location.pathname === '/my-designs') {
      navigate('/');
    }
  };

  // Load categories from Backend API with localStorage fallback
  const [dynamicCategories, setDynamicCategories] = useState([]);


  useEffect(() => {
    const loadCategories = async () => {
      try {
        // Try loading from Backend API first
        const serverCategories = await categoriesApi.getAll();
        console.log('✅ Sidebar loaded categories from server:', serverCategories.length);

        // Map server categories to sidebar format
        const mapped = serverCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          emoji: cat.icon || '📁',
          hasEmoji: true
        }));
        setDynamicCategories(mapped);
      } catch (error) {
        console.warn('⚠️ Server offline, loading categories from localStorage');

        // Fallback to localStorage
        const saved = JSON.parse(localStorage.getItem('custom_categories') || 'null');
        if (saved) {
          const mapped = saved.map(cat => ({
            id: cat.id,
            name: cat.name,
            emoji: cat.icon || '📁',
            hasEmoji: true
          }));
          setDynamicCategories(mapped);
        }
      }
    };

    loadCategories();

    // Listen for storage changes (when categories updated in other tabs)
    window.addEventListener('storage', loadCategories);

    // Also listen for custom event (when categories updated in same tab)
    const handleCategoryUpdate = () => loadCategories();
    window.addEventListener('categoriesUpdated', handleCategoryUpdate);

    return () => {
      window.removeEventListener('storage', loadCategories);
      window.removeEventListener('categoriesUpdated', handleCategoryUpdate);
    };
  }, []);

  // Combine fixed categories with dynamic ones
  const allCategories = [...FIXED_CATEGORIES, ...dynamicCategories];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="url(#logoGrad)" />
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="logoGrad" x1="2" y1="2" x2="22" y2="22">
                <stop stopColor="#60A5FA" />
                <stop offset="1" stopColor="#A78BFA" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className="logo-text">AI Gallery</span>
      </div>

      {/* Menu Section */}
      <div className="sidebar-section">
        <span className="section-label">MENU</span>
        <nav className="menu-list">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              {Icons[item.icon]}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Admin Section - Show if user has admin role OR admin features */}
      {(isAdmin || adminMenuItems.some(item => hasFeature(item.featureKey))) && (
        <div className="sidebar-section">
          <span className="section-label">QUẢN TRỊ</span>
          <nav className="menu-list">
            {adminMenuItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                {Icons[item.icon]}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Categories Section */}
      <div className="sidebar-section">
        <span className="section-label">DANH MỤC</span>
        <nav className="menu-list">
          {allCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`menu-item ${String(activeCategory) === String(cat.id) ? 'active' : ''}`}
            >
              <span>{cat.name || cat.label}</span>
            </button>
          ))}
        </nav>
      </div>

    </aside>
  );
}
