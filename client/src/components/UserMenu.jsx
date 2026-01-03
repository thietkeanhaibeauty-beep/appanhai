import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function UserMenu({ onOpenProfile }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [coinBalance, setCoinBalance] = useState(0);
    const [planInfo, setPlanInfo] = useState({ name: 'Trial', color: '#f59e0b' });
    const [expiryDate, setExpiryDate] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (user?.id) {
            fetchUserData(user.id);
        }
    }, [user]);

    const fetchUserData = async (userId) => {
        try {
            const nocodbUrl = 'https://db.hpb.edu.vn';
            const nocodbToken = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';

            // Fetch both balance and subscription in parallel
            const [balanceRes, subRes] = await Promise.all([
                fetch(
                    `${nocodbUrl}/api/v2/tables/m16m58ti6kjlax0/records?where=(user_id,eq,${userId})&limit=1`,
                    { headers: { 'xc-token': nocodbToken } }
                ),
                fetch(
                    `${nocodbUrl}/api/v2/tables/mavg6lv6w75qqfy/records?where=(user_id,eq,${userId})&sort=-CreatedAt&limit=1`,
                    { headers: { 'xc-token': nocodbToken } }
                )
            ]);

            // Process balance
            if (balanceRes.ok) {
                const { list } = await balanceRes.json();
                if (list?.[0]?.balance) {
                    setCoinBalance(list[0].balance);
                }
            }

            // Process subscription
            if (subRes.ok) {
                const { list } = await subRes.json();
                if (list?.[0]) {
                    const sub = list[0];
                    const status = sub.status;
                    const pkgId = sub.package_id;

                    // Calculate expiry
                    const endDate = sub.end_date ? new Date(sub.end_date) : null;
                    if (endDate) {
                        setExpiryDate(endDate.toLocaleDateString('vi-VN'));
                    }

                    // Determine plan display
                    if (status === 'trial' || pkgId === 'Trial') {
                        setPlanInfo({ name: 'Trial', color: '#f59e0b' });
                    } else if (status === 'active') {
                        if (pkgId === 'Pro') {
                            setPlanInfo({ name: 'Pro', color: '#8b5cf6' });
                        } else if (pkgId === 'Starter') {
                            setPlanInfo({ name: 'Starter', color: '#3b82f6' });
                        } else if (pkgId === 'HocVien') {
                            setPlanInfo({ name: 'Học Viên', color: '#10b981' });
                        } else {
                            setPlanInfo({ name: 'Trial', color: '#f59e0b' });
                        }
                    } else if (status === 'expired') {
                        setPlanInfo({ name: 'Hết hạn', color: '#ef4444' });
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching user data:', err);
        }
    };

    const handleTopUp = () => {
        setIsOpen(false);
        navigate('/pricing');
    };

    const userEmail = user?.email || 'Guest';
    const userInitial = userEmail.charAt(0).toUpperCase();

    return (
        <div className="user-menu-container">
            {/* Always visible: Plan Badge + Coin Balance */}
            <div className="header-user-info">
                <div className="header-plan-badge" style={{ background: planInfo.color }}>
                    {planInfo.name}
                </div>
                <div className="header-coin-display">
                    <span className="coin-icon">🪙</span>
                    <span className="coin-value">{coinBalance.toLocaleString()}</span>
                    <button className="header-topup-btn" onClick={handleTopUp}>+ Nạp Coin</button>
                </div>
            </div>

            <button
                className="user-avatar-btn"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="user-avatar">{userInitial}</div>
            </button>

            {isOpen && (
                <>
                    <div className="user-menu-backdrop" onClick={() => setIsOpen(false)} />
                    <div className="user-menu-dropdown">
                        {/* Menu Items */}
                        <div className="user-menu-items">
                            <button className="user-menu-item" onClick={() => { setIsOpen(false); onOpenProfile?.(); }}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Cài đặt thông tin
                            </button>
                            <button className="user-menu-item" onClick={() => { setIsOpen(false); navigate('/pricing'); }}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                Gói đăng ký của tôi
                            </button>
                            <button
                                className="user-menu-item logout-item"
                                onClick={() => {
                                    setIsOpen(false);
                                    localStorage.clear();
                                    sessionStorage.clear();
                                    window.location.href = '/login';
                                }}
                                style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '12px' }}
                            >
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Đăng xuất
                            </button>
                        </div>

                        {/* User Info */}
                        <div className="user-menu-footer">
                            <div className="user-avatar-large">{userInitial}</div>
                            <div className="user-details">
                                <span className="user-email">{userEmail}</span>
                                <span className="user-type">Tài khoản cá nhân</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
