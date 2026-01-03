import React from 'react';
import { useNavigate } from 'react-router-dom';
import ApiKeySettings from '../components/ApiKeySettings';

export default function ApiKeysPage() {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            padding: '24px'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {/* Header */}
                <div style={{
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            padding: '8px'
                        }}
                    >
                        ← Quay lại
                    </button>
                    <div>
                        <h1 style={{
                            fontSize: '1.8rem',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            margin: 0
                        }}>
                            Quản lý API Keys
                        </h1>
                        <p style={{
                            color: 'var(--text-secondary)',
                            margin: '4px 0 0',
                            fontSize: '0.95rem'
                        }}>
                            Cấu hình API keys cho các dịch vụ tạo hình ảnh
                        </p>
                    </div>
                </div>

                {/* API Key Settings Component (always shown, no modal) */}
                <ApiKeySettings isOpen={true} onClose={() => navigate('/')} isStandalone={true} />
            </div>
        </div>
    );
}
