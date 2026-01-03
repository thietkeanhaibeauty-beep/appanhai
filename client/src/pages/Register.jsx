import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();
    const { signUp } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        console.log('🔵 [Register] Starting signup process...');
        console.log('🔵 [Register] Email:', email);

        if (password !== confirmPassword) {
            console.error('❌ [Register] Password mismatch');
            setError('Mật khẩu không khớp');
            return;
        }

        if (password.length < 6) {
            console.error('❌ [Register] Password too short');
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        setLoading(true);
        console.log('🔵 [Register] Calling signUp...');

        const { data, error } = await signUp(email, password);

        console.log('📊 [Register] SignUp response:', {
            hasData: !!data,
            hasUser: !!data?.user,
            hasSession: !!data?.session,
            errorMessage: error?.message,
            errorStatus: error?.status,
            fullError: error
        });

        if (error) {
            console.error('❌ [Register] Signup failed:', error);
            setError(error.message || 'Đăng ký thất bại. Vui lòng thử lại.');
            setLoading(false);
        } else if (data.user) {
            console.log('✅ [Register] Signup successful! User:', data.user.id);

            // Check if email confirmation is required
            if (!data.session) {
                console.log('📧 [Register] Email confirmation required - redirecting to verify');
                // Navigate to verify page with email
                navigate('/verify', { state: { email } });
            } else {
                console.log('🎉 [Register] User confirmed, has session');
                setSuccess(true);
                // Auto login after signup
                setTimeout(() => navigate('/'), 2000);
            }
        } else {
            console.warn('⚠️ [Register] Unexpected response - no user data');
            setError('Đăng ký không thành công. Vui lòng thử lại.');
            setLoading(false);
        }
    };

    if (success) {
        // Show different message based on whether email confirmation is needed
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h1>🎉 Đăng ký thành công!</h1>
                    <p style={{ marginBottom: '16px' }}>Bạn đã được cấp 3 ngày dùng thử miễn phí.</p>

                    <div style={{
                        background: 'var(--bg-secondary)',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        marginBottom: '16px'
                    }}>
                        <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                            📧 <strong>Vui lòng kiểm tra email</strong>
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Chúng tôi đã gửi link xác nhận đến email của bạn. Click vào link để kích hoạt tài khoản.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/login')}
                        className="auth-btn"
                        style={{ marginTop: '12px' }}
                    >
                        Quay về Đăng nhập
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Đăng Ký</h1>
                <p className="auth-subtitle">Dùng thử miễn phí 3 ngày!</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Xác nhận mật khẩu</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? 'Đang đăng ký...' : 'Đăng Ký Ngay'}
                    </button>
                </form>

                <p className="auth-link">
                    Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
                </p>
            </div>
        </div>
    );
}
