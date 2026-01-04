import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { initNocoDB, TABLE_IDS, NOCODB_URL, NOCODB_TOKEN } from '../services/api';

const packages = [
    {
        id: 'trial',
        name: 'Trial',
        price: 'Miễn phí',
        duration: '3 ngày',
        features: [
            'Xem templates',
            'Tạo 5 designs',
            'Hỗ trợ cơ bản',
        ],
        highlighted: false,
        buttonText: 'Đang dùng',
        disabled: true,
    },
    {
        id: 'starter',
        name: 'Starter',
        price: '199.000đ',
        duration: '/tháng',
        features: [
            'Xem tất cả templates',
            'Tạo unlimited designs',
            'Xuất ảnh HD',
            'Hỗ trợ ưu tiên',
        ],
        highlighted: true,
        buttonText: 'Nâng cấp',
        disabled: false,
    },
    {
        id: 'pro',
        name: 'Pro',
        price: '499.000đ',
        duration: '/tháng',
        features: [
            'Tất cả tính năng Starter',
            'API access',
            'Tạo templates custom',
            'Hỗ trợ 24/7',
            'Team workspace',
        ],
        highlighted: false,
        buttonText: 'Nâng cấp',
        disabled: false,
    },
];

export default function Pricing() {
    const { hasActiveSubscription, isTrial } = useSubscription();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [voucherCode, setVoucherCode] = useState('');
    const [redeemStatus, setRedeemStatus] = useState('idle'); // idle, loading, success, error
    const [redeemMsg, setRedeemMsg] = useState('');

    const handleRedeem = async () => {
        if (!voucherCode.trim()) {
            setRedeemStatus('error');
            setRedeemMsg('Vui lòng nhập mã kích hoạt');
            return;
        }

        if (!user?.id) {
            setRedeemStatus('error');
            setRedeemMsg('Vui lòng đăng nhập để kích hoạt');
            return;
        }

        setRedeemStatus('loading');
        setRedeemMsg('Đang kiểm tra mã...');

        try {
            await initNocoDB();
            const baseUrl = NOCODB_URL || 'https://db.hpb.edu.vn';
            const token = NOCODB_TOKEN || '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';

            // 1. Find Voucher using 'like' to handle accidental spaces in DB
            const voucherTableId = TABLE_IDS.Vouchers || 'mhgqm56k0lobsgn';
            const query = `(Code,like,${voucherCode.trim()})`;
            const voucherRes = await fetch(
                `${baseUrl}/api/v2/tables/${voucherTableId}/records?where=${encodeURIComponent(query)}&limit=10`,
                { headers: { 'xc-token': token } }
            );

            if (!voucherRes.ok) throw new Error('Lỗi kiểm tra mã');
            const voucherData = await voucherRes.json();

            // Client-side strict check (ignoring case and spaces)
            const inputCode = voucherCode.trim().toLowerCase();
            const voucher = voucherData.list?.find(v =>
                v.Code && v.Code.toString().trim().toLowerCase() === inputCode
            );

            if (!voucher) {
                setRedeemStatus('error');
                setRedeemMsg('Mã kích hoạt không tồn tại');
                return;
            }

            // 2. Validate Voucher
            if (voucher.IsActive === false) { // Check explicit false, assume true if undefined
                setRedeemStatus('error');
                setRedeemMsg('Mã này đã bị vô hiệu hóa');
                return;
            }

            if (voucher.UsageLimit && voucher.UsageCount >= voucher.UsageLimit) {
                setRedeemStatus('error');
                setRedeemMsg('Mã đã hết lượt sử dụng');
                return;
            }

            if (voucher.ExpiryDate && new Date(voucher.ExpiryDate) < new Date()) {
                setRedeemStatus('error');
                setRedeemMsg('Mã đã hết hạn sử dụng');
                return;
            }

            // 3. Update Subscription
            const subTableId = TABLE_IDS.Subscriptions || TABLE_IDS.subscriptions;
            if (!subTableId) throw new Error('Lỗi cấu hình hệ thống (Sub table missing)');

            // Find existing sub
            const subRes = await fetch(
                `${baseUrl}/api/v2/tables/${subTableId}/records?where=(user_id,eq,${user.id})&limit=1`,
                { headers: { 'xc-token': token } }
            );
            const subData = await subRes.json();
            const existingSub = subData.list?.[0];

            const pkgId = voucher.PackageId || 'HocVien';
            const durationDays = voucher.DurationDays || 365; // Default 1 year

            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + durationDays);

            const updateBody = {
                package_id: pkgId,
                status: 'active',
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                updated_at: new Date().toISOString()
            };

            if (existingSub) {
                // Update
                await fetch(`${baseUrl}/api/v2/tables/${subTableId}/records`, {
                    method: 'PATCH',
                    headers: { 'xc-token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        Id: existingSub.Id,
                        ...updateBody
                    })
                });
            } else {
                // Create new (should rare if auto-trial exists)
                await fetch(`${baseUrl}/api/v2/tables/${subTableId}/records`, {
                    method: 'POST',
                    headers: { 'xc-token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: user.id,
                        created_at: new Date().toISOString(),
                        ...updateBody
                    })
                });
            }

            // 4. Update Voucher Usage
            await fetch(`${baseUrl}/api/v2/tables/${voucherTableId}/records`, {
                method: 'PATCH',
                headers: { 'xc-token': token, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    Id: voucher.Id,
                    UsageCount: (voucher.UsageCount || 0) + 1
                })
            });

            setRedeemStatus('success');
            setRedeemMsg(`Kích hoạt thành công gói ${pkgId}! Vui lòng đợi trong giây lát...`);

            // Reload after 2s
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (err) {
            console.error('Redeem error:', err);
            setRedeemStatus('error');
            setRedeemMsg(`Lỗi: ${err.message}`);
        }
    };

    return (
        <div className="pricing-page">
            <div className="pricing-container">
                <div className="pricing-header">
                    <h1>Chọn gói phù hợp</h1>
                    <p>Nâng cấp để mở khóa tất cả tính năng</p>
                </div>

                {/* Voucher Section */}
                <div className="voucher-section" style={{
                    maxWidth: '500px',
                    margin: '0 auto 40px',
                    padding: '20px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    textAlign: 'center'
                }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#374151' }}>
                        Bạn có mã kích hoạt hoặc SĐT học viên?
                    </h3>
                    <div className="voucher-input-group" style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            placeholder="Nhập mã hoặc SĐT..."
                            value={voucherCode}
                            onChange={e => setVoucherCode(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '10px 15px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                outline: 'none'
                            }}
                        />
                        <button
                            onClick={handleRedeem}
                            disabled={redeemStatus === 'loading'}
                            style={{
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                cursor: redeemStatus === 'loading' ? 'not-allowed' : 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            {redeemStatus === 'loading' ? 'Đang xử lý...' : 'Kích hoạt'}
                        </button>
                    </div>
                    {redeemMsg && (
                        <p style={{
                            marginTop: '10px',
                            fontSize: '14px',
                            color: redeemStatus === 'success' ? '#10b981' : redeemStatus === 'error' ? '#ef4444' : '#6b7280'
                        }}>
                            {redeemMsg}
                        </p>
                    )}
                </div>

                <div className="pricing-grid">
                    {packages.map((pkg) => (
                        <div
                            key={pkg.id}
                            className={`pricing-card ${pkg.highlighted ? 'highlighted' : ''} ${subscription?.tier === pkg.id ? 'current' : ''}`}
                        >
                            {pkg.highlighted && <div className="popular-badge">Phổ biến nhất</div>}
                            {subscription?.tier === pkg.id && <div className="current-badge">Gói hiện tại</div>}

                            <h2 className="package-name">{pkg.name}</h2>
                            <div className="package-price">
                                <span className="price">{pkg.price}</span>
                                <span className="duration">{pkg.duration}</span>
                            </div>

                            <ul className="package-features">
                                {pkg.features.map((feature, idx) => (
                                    <li key={idx}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <polyline points="20 6 9 17 4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                className={`pricing-btn ${pkg.highlighted ? 'primary' : 'secondary'}`}
                                disabled={pkg.disabled || (subscription?.tier === pkg.id)}
                            >
                                {subscription?.tier === pkg.id ? 'Đang dùng' : pkg.buttonText}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="pricing-footer">
                    <Link to="/" className="back-link">← Quay lại trang chủ</Link>
                </div>
            </div>
        </div>
    );
}
