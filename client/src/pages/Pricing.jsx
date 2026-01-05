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
    const { subscription, hasActiveSubscription, isTrial } = useSubscription();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [voucherCode, setVoucherCode] = useState('');
    const [phoneNumber, setPhoneNumber] = useState(''); // Optional phone input
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
            // Tìm trong cả cột Code và cột AllowedPhones (nếu có)
            const voucherTableId = TABLE_IDS.Vouchers || 'mhgqm56k0lobsgn';

            // Query tìm kiếm linh hoạt:
            // - Hoặc Code giống input
            // - Hoặc AllowedPhones chứa input (sẽ verify kỹ hơn ở bước sau)
            const inputClean = voucherCode.trim();
            const query = `(Code,like,${inputClean})~or(AllowedPhones,like,${inputClean})`;

            const voucherRes = await fetch(
                `${baseUrl}/api/v2/tables/${voucherTableId}/records?where=${encodeURIComponent(query)}&limit=10`,
                { headers: { 'xc-token': token } }
            );

            if (!voucherRes.ok) throw new Error('Lỗi kiểm tra mã');
            const voucherData = await voucherRes.json();

            // Tìm voucher theo Code
            const voucher = voucherData.list?.find(v =>
                v.Code && v.Code.toString().trim().toLowerCase() === inputClean.toLowerCase()
            );

            if (!voucher) {
                setRedeemStatus('error');
                setRedeemMsg('Mã lớp không tồn tại trong hệ thống');
                return;
            }

            // Check if this voucher requires phone (has AllowedPhones)
            const hasAllowedPhones = voucher.AllowedPhones && voucher.AllowedPhones.trim().length > 0;
            const phoneInput = phoneNumber.trim();

            if (hasAllowedPhones) {
                // Phone is REQUIRED for class vouchers
                if (!phoneInput) {
                    setRedeemStatus('error');
                    setRedeemMsg('Mã này yêu cầu nhập Số điện thoại học viên');
                    return;
                }

                // Check phone is in AllowedPhones list
                const allowedPhones = voucher.AllowedPhones.split(/[\n,;]+/).map(p => p.trim());
                if (!allowedPhones.includes(phoneInput)) {
                    setRedeemStatus('error');
                    setRedeemMsg('Số điện thoại không có trong danh sách lớp này');
                    return;
                }

                // Check if this phone already redeemed this voucher
                const redemptionsTableId = TABLE_IDS.VoucherRedemptions || 'mgzw8dqt69tp478';
                const checkRedemptionRes = await fetch(
                    `${baseUrl}/api/v2/tables/${redemptionsTableId}/records?where=(voucher_code,eq,${encodeURIComponent(voucher.Code)})~and(phone,eq,${encodeURIComponent(phoneInput)})&limit=1`,
                    { headers: { 'xc-token': token } }
                );
                const checkData = await checkRedemptionRes.json();
                if (checkData.list && checkData.list.length > 0) {
                    setRedeemStatus('error');
                    setRedeemMsg('Số điện thoại này đã kích hoạt mã lớp rồi!');
                    return;
                }
            }

            // 2. Validate Voucher
            if (voucher.IsActive === false) {
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

            // 5. Log redemption if this is a class voucher
            if (voucher.AllowedPhones && phoneNumber.trim()) {
                const redemptionsTableId = TABLE_IDS.VoucherRedemptions || 'mgzw8dqt69tp478';
                await fetch(`${baseUrl}/api/v2/tables/${redemptionsTableId}/records`, {
                    method: 'POST',
                    headers: { 'xc-token': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        voucher_code: voucher.Code,
                        phone: phoneNumber.trim(),
                        user_id: user.id,
                        user_email: user.email || '',
                        package_id: pkgId,
                        redeemed_at: new Date().toISOString()
                    })
                });
            }

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

                {/* Voucher Section - Compact */}
                <div className="voucher-section" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    margin: '0 auto 30px',
                    padding: '10px 20px',
                    background: 'white',
                    borderRadius: '50px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    left: '50%',
                    position: 'relative',
                    transform: 'translateX(-50%)'
                }}>
                    <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>
                        🎁 Mã khuyến mại:
                    </span>
                    <input
                        type="text"
                        placeholder="Nhập mã"
                        value={voucherCode}
                        onChange={e => setVoucherCode(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            outline: 'none',
                            width: '120px',
                            fontSize: '13px'
                        }}
                    />
                    <input
                        type="text"
                        placeholder="SĐT (nếu có)"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            outline: 'none',
                            width: '130px',
                            fontSize: '13px'
                        }}
                    />
                    <button
                        onClick={handleRedeem}
                        disabled={redeemStatus === 'loading'}
                        style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: redeemStatus === 'loading' ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {redeemStatus === 'loading' ? '...' : 'Kích hoạt'}
                    </button>
                    {redeemMsg && (
                        <span style={{
                            fontSize: '13px',
                            color: redeemStatus === 'success' ? '#10b981' : redeemStatus === 'error' ? '#ef4444' : '#6b7280'
                        }}>
                            {redeemMsg}
                        </span>
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
        </div >
    );
}
