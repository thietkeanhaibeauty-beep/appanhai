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

    const [resendCooldown, setResendCooldown] = useState(0);

    // Get email from location state (passed from Register page)
    const email = location.state?.email || '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError('Email không hợp lệ. Vui lòng đăng ký lại.');
            return;
        }

        // Support both 6 and 8 digit codes (Supabase can send either depending on config)
        if (otp.length < 6) {
            setError('Mã xác nhận chưa đủ độ dài');
            return;
        }

        setLoading(true);
        console.log('🔵 [Verify] Verifying OTP for email:', email);

        const { data, error: verifyError } = await verifyOtp(email, otp, 'signup');

        if (verifyError) {
            console.error('❌ [Verify] OTP verification failed:', verifyError);
            setError(verifyError.message || 'Mã xác nhận không đúng hoặc đã hết hạn');
            setLoading(false);
        } else {
            console.log('✅ [Verify] OTP verified successfully');
            setSuccess(true);
            setTimeout(() => navigate('/'), 2000);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;

        try {
            console.log('🔵 [Verify] Resending OTP...');
            const { error: resendError } = await useAuth().supabase.auth.resend({
                type: 'signup',
                email: email
            });

            if (resendError) throw resendError;

            // Start cooldown
            setResendCooldown(60);
            const interval = setInterval(() => {
                setResendCooldown((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            alert('Đã gửi lại mã xác nhận mới!');
        } catch (err) {
            console.error('❌ [Verify] Resend failed:', err);
            setError(err.message || 'Không thể gửi lại mã');
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
                    Nhập mã xác nhận đã được gửi đến<br />
                    <strong>{email}</strong>
                </p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Mã xác nhận</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => {
                                    // Allow numbers only, up to 8 digits
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                                    setOtp(value);
                                }}
                                placeholder="123456"
                                maxLength={8}
                                required
                                style={{
                                    fontSize: '1.5rem',
                                    textAlign: 'center',
                                    letterSpacing: '0.5rem',
                                    fontWeight: 'bold'
                                }}
                            />
                            <p style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
                                Mã bao gồm 6-8 chữ số
                            </p>
                        </div>
                    </div>

                    <button type="submit" className="auth-btn" disabled={loading || otp.length < 6}>
                        {loading ? 'Đang xác nhận...' : 'Xác nhận'}
                    </button>

                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendCooldown > 0}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: resendCooldown > 0 ? '#9ca3af' : '#2563eb',
                            cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                            marginTop: '15px',
                            fontSize: '14px',
                            textDecoration: 'underline'
                        }}
                    >
                        {resendCooldown > 0 ? `Gửi lại mã sau ${resendCooldown}s` : 'Gửi lại mã xác nhận'}
                    </button>
                </form>

                <p className="auth-link">
                    Sai email? <Link to="/register">Đăng ký lại</Link>
                </p>
            </div>
        </div>
    );
}
