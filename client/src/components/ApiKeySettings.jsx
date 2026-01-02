import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3001';

export default function ApiKeySettings({ isOpen, onClose }) {
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [provider, setProvider] = useState('gemini');
    const [apiKey, setApiKey] = useState('');
    const [keyName, setKeyName] = useState('');
    const [validationResult, setValidationResult] = useState(null);

    // Fetch existing keys
    useEffect(() => {
        if (isOpen) {
            fetchApiKeys();
        }
    }, [isOpen]);

    const fetchApiKeys = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/apikeys`);
            const data = await res.json();
            setApiKeys(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching keys:', err);
        }
        setLoading(false);
    };

    // Validate API key
    const handleValidate = async () => {
        if (!apiKey.trim()) return;

        setValidating(true);
        setValidationResult(null);

        try {
            const res = await fetch(`${API_BASE}/api/apikeys/validate-direct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, api_key: apiKey })
            });
            const data = await res.json();
            setValidationResult(data);
        } catch (err) {
            setValidationResult({ valid: false, error: err.message });
        }

        setValidating(false);
    };

    // Save API key
    const handleSave = async () => {
        if (!apiKey.trim()) return;

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/apikeys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    api_key: apiKey,
                    name: keyName || `${provider} Key`
                })
            });
            const data = await res.json();

            if (data.success) {
                setApiKey('');
                setKeyName('');
                setValidationResult(null);
                fetchApiKeys();
            }
        } catch (err) {
            console.error('Error saving key:', err);
        }
        setSaving(false);
    };

    // Delete API key
    const handleDelete = async (id) => {
        if (!confirm('Bạn có chắc muốn xóa API key này?')) return;

        try {
            await fetch(`${API_BASE}/api/apikeys/${id}`, { method: 'DELETE' });
            fetchApiKeys();
        } catch (err) {
            console.error('Error deleting key:', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="settings-header">
                    <h2>⚙️ Cài đặt API Keys</h2>
                    <button className="close-btn" onClick={onClose}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Add New Key */}
                <div className="settings-section">
                    <h3>➕ Thêm API Key mới</h3>

                    <div className="form-row">
                        <div className="form-field">
                            <label>Provider</label>
                            <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                                <option value="gemini">🔷 Google Gemini / Imagen</option>
                                <option value="openai">🟢 OpenAI (DALL-E)</option>
                                <option value="replicate">🔴 Replicate (FLUX)</option>
                            </select>
                        </div>
                        <div className="form-field">
                            <label>Tên (tùy chọn)</label>
                            <input
                                type="text"
                                placeholder="VD: Gemini Paid API"
                                value={keyName}
                                onChange={(e) => setKeyName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-field">
                        <label>API Key</label>
                        <div className="api-key-input">
                            <input
                                type="password"
                                placeholder="Nhập API key của bạn..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            <button
                                className="check-btn"
                                onClick={handleValidate}
                                disabled={validating || !apiKey.trim()}
                            >
                                {validating ? '⏳' : '🔍'} Kiểm tra
                            </button>
                        </div>
                    </div>

                    {/* Validation Result */}
                    {validationResult && (
                        <div className={`validation-result ${validationResult.valid ? 'valid' : 'invalid'}`}>
                            {validationResult.valid ? (
                                <>
                                    <div className="result-status">✅ API Key hợp lệ!</div>
                                    <div className="result-details">
                                        Tìm thấy {validationResult.models?.length || 0} models
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="result-status">❌ API Key không hợp lệ</div>
                                    <div className="result-details">{validationResult.error}</div>
                                </>
                            )}
                        </div>
                    )}

                    <button
                        className="save-btn"
                        onClick={handleSave}
                        disabled={saving || !apiKey.trim()}
                    >
                        {saving ? '⏳ Đang lưu...' : '💾 Lưu API Key'}
                    </button>
                </div>

                {/* Existing Keys */}
                <div className="settings-section">
                    <h3>🔑 API Keys đã lưu</h3>

                    {loading ? (
                        <div className="loading">Đang tải...</div>
                    ) : apiKeys.length === 0 ? (
                        <div className="empty-state">Chưa có API key nào được lưu</div>
                    ) : (
                        <div className="keys-list">
                            {apiKeys.map((key) => (
                                <div key={key.Id || key.id} className="key-item">
                                    <div className="key-info">
                                        <div className="key-name">
                                            {key.provider === 'gemini' && '🔷'}
                                            {key.provider === 'openai' && '🟢'}
                                            {key.provider === 'replicate' && '🔴'}
                                            {' '}{key.name || key.provider}
                                        </div>
                                        <div className="key-value">{key.api_key}</div>
                                        <div className="key-status">
                                            {key.is_valid ? '✅ Valid' : '❌ Invalid'}
                                            {key.last_checked && ` • ${new Date(key.last_checked).toLocaleDateString('vi-VN')}`}
                                        </div>
                                    </div>
                                    <button
                                        className="delete-btn"
                                        onClick={() => handleDelete(key.Id || key.id)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
