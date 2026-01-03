import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function VerifyEmail() {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { verifyOtp } = useAuth();

    // Get email from location state (passed from Register page)
    const email = location.state?.email || '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError('Email không hợp lệ. Vui lòng đăng ký lại.');
            return;
        }

        if (otp.length !== 6) {
            setError('Mã xác nhận phải có 6 chữ số');
            return;
        }

        setLoading(true);
        console.log('🔵 [Verify] Verifying OTP for email:', email);

        const { data, error: verifyError } = await verifyOtp(email, otp, 'signup');

        if (verifyError) {
            console.error('❌ [Verify] OTP verification failed:', verifyError);
            setError(verifyError.message || 'Mã xác nhận không đúng');
            setLoading(false);
        } else {
            console.log('✅ [Verify] OTP verified successfully');
            setSuccess(true);
            setTimeout(() => navigate('/'), 2000);
        }
    };

    if (success) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h1>✅ Xác nhận thành công!</h1>
                    <p>Tài khoản của bạn đã được kích hoạt.</p>
                    <p>Đang chuyển hướng...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>📧 Xác nhận Email</h1>
                <p className="auth-subtitle">
                    Nhập mã 6 chữ số đã được gửi đến<br />
                    <strong>{email}</strong>
                </p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Mã xác nhận</label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setOtp(value);
                            }}
                            placeholder="123456"
                            maxLength={6}
                            required
                            style={{
                                fontSize: '1.5rem',
                                textAlign: 'center',
                                letterSpacing: '0.5rem',
                                fontWeight: 'bold'
                            }}
                        />
                    </div>

                    <button type="submit" className="auth-btn" disabled={loading || otp.length !== 6}>
                        {loading ? 'Đang xác nhận...' : 'Xác nhận'}
                    </button>
                </form>

                <p className="auth-link">
                    Chưa nhận được mã? <Link to="/register">Đăng ký lại</Link>
                </p>
            </div>
        </div>
    );
}
