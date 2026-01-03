import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileModal({ isOpen, onClose }) {
    const { user } = useAuth();
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user?.id) {
            fetchProfile();
        }
    }, [isOpen, user]);

    const fetchProfile = async () => {
        try {
            const nocodbUrl = 'https://db.hpb.edu.vn';
            const nocodbToken = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';
            const res = await fetch(
                `${nocodbUrl}/api/v2/tables/mhegyo7nyk6wiaj/records?where=(user_id,eq,${user.id})&limit=1`,
                { headers: { 'xc-token': nocodbToken } }
            );
            if (res.ok) {
                const { list } = await res.json();
                if (list?.[0]?.full_name) {
                    setFullName(list[0].full_name);
                }
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const nocodbUrl = 'https://db.hpb.edu.vn';
            const nocodbToken = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';

            // First get the profile record ID
            const getRes = await fetch(
                `${nocodbUrl}/api/v2/tables/mhegyo7nyk6wiaj/records?where=(user_id,eq,${user.id})&limit=1`,
                { headers: { 'xc-token': nocodbToken } }
            );

            if (getRes.ok) {
                const { list } = await getRes.json();
                if (list?.[0]?.Id) {
                    // Update the profile
                    await fetch(
                        `${nocodbUrl}/api/v2/tables/mhegyo7nyk6wiaj/records`,
                        {
                            method: 'PATCH',
                            headers: {
                                'xc-token': nocodbToken,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                Id: list[0].Id,
                                full_name: fullName
                            })
                        }
                    );
                    alert('Đã lưu thay đổi!');
                    onClose();
                }
            }
        } catch (err) {
            console.error('Error saving profile:', err);
            alert('Lỗi khi lưu thay đổi');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const userEmail = user?.email || '';
    const userInitial = userEmail.charAt(0).toUpperCase();

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="profile-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>×</button>

                <h2 className="profile-modal-title">Cài đặt thông tin cá nhân</h2>
                <p className="profile-modal-subtitle">Cập nhật tên, avatar và cài đặt trợ lý AI</p>

                <div className="profile-avatar-section">
                    <div className="profile-avatar-large">{userInitial}</div>
                </div>

                <div className="profile-form">
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" value={userEmail} disabled />
                        <span className="form-hint">Email không thể thay đổi</span>
                    </div>

                    <div className="form-group">
                        <label>Tên đầy đủ</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="Nhập tên của bạn"
                        />
                    </div>

                    <details className="ai-settings-section">
                        <summary>✨ Cài đặt Trợ lý AI</summary>
                        <div className="ai-settings-content">
                            <p>Tính năng sắp ra mắt...</p>
                        </div>
                    </details>
                </div>

                <div className="profile-modal-actions">
                    <button className="btn-cancel" onClick={onClose}>Hủy</button>
                    <button className="btn-save" onClick={handleSave} disabled={loading}>
                        {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
}
