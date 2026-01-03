import { useSubscription } from '../hooks/useSubscription';
import { Link } from 'react-router-dom';

/**
 * Banner hiển thị trạng thái subscription
 * - Trial: Hiển thị countdown số ngày còn lại
 * - Expired: Hiển thị thông báo hết hạn
 */
export default function SubscriptionBanner() {
    const { subscription, loading, hasActiveSubscription, isTrial } = useSubscription();

    if (loading) return null;

    // Không hiện banner nếu có subscription active (không phải trial)
    if (hasActiveSubscription && !isTrial) return null;

    // Trial banner
    if (isTrial) {
        return (
            <div className="subscription-banner trial">
                <div className="banner-content">
                    <span className="banner-icon">🎁</span>
                    <span className="banner-text">
                        Bạn đang dùng thử miễn phí!
                    </span>
                </div>
                <Link to="/pricing" className="banner-btn">
                    Nâng cấp ngay
                </Link>
            </div>
        );
    }

    // Không hiện banner expired nữa
    return null;
}
