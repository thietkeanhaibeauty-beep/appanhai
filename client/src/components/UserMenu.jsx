import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import { initNocoDB, TABLE_IDS, NOCODB_URL, NOCODB_TOKEN } from '../services/api';

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

            const handleBalanceUpdate = () => fetchUserData(user.id);
            window.addEventListener('balance-updated', handleBalanceUpdate);

            return () => {
                window.removeEventListener('balance-updated', handleBalanceUpdate);
            };
        }
    }, [user]);

    const fetchUserData = async (userId) => {
        try {
            await initNocoDB();

            const baseUrl = NOCODB_URL || 'https://db.hpb.edu.vn';
            const token = NOCODB_TOKEN || '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';

            // Dynamic Table IDs
            // Balance: likely 'Wallets' or 'Users'. Fallback to 'm16...' if not found (as it was working)
            const balanceTableId = TABLE_IDS.Wallets || TABLE_IDS.wallets || TABLE_IDS.Users || 'm16m58ti6kjlax0';

            // Subscriptions: Fallback to null to avoid 404 if not found
            const subTableId = TABLE_IDS.Subscriptions || TABLE_IDS.subscriptions;

            const requests = [
                fetch(
                    `${baseUrl}/api/v2/tables/${balanceTableId}/records?where=(user_id,eq,${userId})&limit=1`,
                    { headers: { 'xc-token': token } }
                )
            ];

            if (subTableId) {
                requests.push(
                    fetch(
                        `${baseUrl}/api/v2/tables/${subTableId}/records?where=(user_id,eq,${userId})&sort=-CreatedAt&limit=1`,
                        { headers: { 'xc-token': token } }
                    )
                );
            } else {
                console.warn('⚠️ Subscriptions table not found in NocoDB metadata. Skipping fetch.');
            }

            const responses = await Promise.all(requests);
            const balanceRes = responses[0];
            const subRes = subTableId && responses.length > 1 ? responses[1] : null;

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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '5px' }}>
                    <div className="header-plan-badge" style={{ background: planInfo.color }}>
                        {planInfo.name}
                    </div>
                    {expiryDate && (
                        <span style={{ fontSize: '9px', color: '#666', marginTop: '2px', whitespace: 'nowrap' }}>
                            {expiryDate}
                        </span>
                    )}
                </div>
                <button
                    className="header-upgrade-btn"
                    onClick={() => navigate('/pricing')}
                    style={{
                        background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginLeft: '8px',
                        marginRight: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                        transition: 'transform 0.1s'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                    onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    Nâng cấp
                </button>
                <div className="header-coin-display" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
                    padding: '4px 8px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#000'
                }}>
                    <span>💰</span>
                    <span>{coinBalance.toLocaleString()}</span>
                    <button
                        onClick={handleTopUp}
                        style={{
                            background: 'rgba(0,0,0,0.15)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#000',
                            marginLeft: '2px'
                        }}
                        title="Nạp Coin"
                    >+</button>
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
