import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserMenu from './UserMenu';
import ProfileModal from './ProfileModal';

export default function Header({ searchValue, onSearchChange, credits = 90, onToggleMenu = () => { }, user, onSignOut }) {
    const navigate = useNavigate();
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    return (
        <>
            <header className="main-header">
                {/* Mobile Menu Button */}
                <button className="mobile-menu-btn" onClick={onToggleMenu}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {/* Search Bar */}
                <div className="search-container">
                    <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Tìm kiếm template..."
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="search-input"
                    />
                </div>

                {/* Right side actions */}
                <div className="header-actions">
                    {/* Theme Toggle */}
                    <button
                        className="theme-toggle"
                        onClick={toggleTheme}
                        title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
                    >
                        {isDarkMode ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="5" />
                                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>

                    {/* User Menu or Auth Buttons */}
                    {user ? (
                        <UserMenu onOpenProfile={() => setIsProfileOpen(true)} />
                    ) : (
                        <div className="auth-buttons">
                            <button
                                className="login-btn"
                                onClick={() => navigate('/login')}
                                style={{
                                    padding: '8px 20px',
                                    background: 'transparent',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Đăng nhập
                            </button>
                            <button
                                className="register-btn"
                                onClick={() => navigate('/register')}
                                style={{
                                    padding: '8px 20px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Đăng ký
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Profile Modal */}
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </>
    );
}
