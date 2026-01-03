import { Link } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';

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

    return (
        <div className="pricing-page">
            <div className="pricing-container">
                <div className="pricing-header">
                    <h1>Chọn gói phù hợp</h1>
                    <p>Nâng cấp để mở khóa tất cả tính năng</p>
                </div>

                <div className="pricing-grid">
                    {packages.map((pkg) => (
                        <div
                            key={pkg.id}
                            className={`pricing-card ${pkg.highlighted ? 'highlighted' : ''} ${isTrial && pkg.id === 'trial' ? 'current' : ''}`}
                        >
                            {pkg.highlighted && <div className="popular-badge">Phổ biến nhất</div>}
                            {isTrial && pkg.id === 'trial' && <div className="current-badge">Gói hiện tại</div>}

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
                                disabled={pkg.disabled || (isTrial && pkg.id === 'trial')}
                            >
                                {isTrial && pkg.id === 'trial' ? 'Đang dùng' : pkg.buttonText}
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
