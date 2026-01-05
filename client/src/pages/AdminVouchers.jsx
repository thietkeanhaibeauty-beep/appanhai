import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { initNocoDB, TABLE_IDS, NOCODB_URL, NOCODB_TOKEN } from '../services/api';

const AdminVouchers = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    // Form data - removed duration (use package default)
    const [className, setClassName] = useState('');
    const [phones, setPhones] = useState('');
    const [packageId, setPackageId] = useState('HocVien');

    // Tracking section
    const [vouchers, setVouchers] = useState([]);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [redemptions, setRedemptions] = useState([]);
    const [loadingRedemptions, setLoadingRedemptions] = useState(false);

    // Load all vouchers on mount
    useEffect(() => {
        loadVouchers();
    }, []);

    const loadVouchers = async () => {
        try {
            await initNocoDB();
            const baseUrl = NOCODB_URL || 'https://db.hpb.edu.vn';
            const token = NOCODB_TOKEN || '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';
            const voucherTableId = TABLE_IDS.Vouchers || 'mhgqm56k0lobsgn';

            const res = await fetch(
                `${baseUrl}/api/v2/tables/${voucherTableId}/records?limit=100`,
                { headers: { 'xc-token': token } }
            );
            const data = await res.json();
            // Filter only class vouchers (those with AllowedPhones)
            const classVouchers = (data.list || []).filter(v => v.AllowedPhones && v.AllowedPhones.trim());
            setVouchers(classVouchers);
        } catch (err) {
            console.error('Error loading vouchers:', err);
        }
    };

    const loadRedemptions = async (voucherCode) => {
        setLoadingRedemptions(true);
        try {
            await initNocoDB();
            const baseUrl = NOCODB_URL || 'https://db.hpb.edu.vn';
            const token = NOCODB_TOKEN || '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';
            const redemptionsTableId = TABLE_IDS.VoucherRedemptions || 'mgzw8dqt69tp478';

            const res = await fetch(
                `${baseUrl}/api/v2/tables/${redemptionsTableId}/records?where=(voucher_code,eq,${encodeURIComponent(voucherCode)})&limit=500`,
                { headers: { 'xc-token': token } }
            );
            const data = await res.json();
            setRedemptions(data.list || []);
        } catch (err) {
            console.error('Error loading redemptions:', err);
        } finally {
            setLoadingRedemptions(false);
        }
    };

    const handleSelectVoucher = (voucher) => {
        setSelectedVoucher(voucher);
        loadRedemptions(voucher.Code);
    };

    // Get status for each phone
    const getPhoneStatus = (phone) => {
        const redeemed = redemptions.find(r => r.phone === phone);
        return redeemed ? { status: 'redeemed', data: redeemed } : { status: 'pending' };
    };

    // Xử lý tạo Voucher Class
    const handleCreateClass = async (e) => {
        e.preventDefault();

        if (!className || !phones) {
            setMsg({ type: 'error', text: 'Vui lòng nhập Tên lớp và Danh sách SĐT' });
            return;
        }

        setLoading(true);
        setMsg({ type: '', text: '' });

        try {
            await initNocoDB();
            const baseUrl = NOCODB_URL || 'https://db.hpb.edu.vn';
            const token = NOCODB_TOKEN || '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';
            const voucherTableId = TABLE_IDS.Vouchers || 'mhgqm56k0lobsgn';

            // Clean phones list
            const phoneList = phones
                .split(/[\n,]+/)
                .map(p => p.trim())
                .filter(p => p.length > 0)
                .join(', ');

            if (phoneList.length === 0) {
                throw new Error('Danh sách SĐT không hợp lệ');
            }

            // Get duration from package (hardcoded for now)
            const packageDurations = {
                'Trial': 3,
                'Starter': 30,
                'Pro': 30,
                'HocVien': 365
            };
            const durationDays = packageDurations[packageId] || 365;

            const body = {
                Code: className.trim(),
                AllowedPhones: phoneList,
                PackageId: packageId,
                DurationDays: durationDays,
                UsageLimit: 1000,
                IsActive: true
                // Không gửi CreatedAt vì NocoDB tự sinh
            };

            const res = await fetch(`${baseUrl}/api/v2/tables/${voucherTableId}/records`, {
                method: 'POST',
                headers: {
                    'xc-token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Lỗi khi tạo bản ghi');
            }

            const phoneCount = phoneList.split(',').length;
            setMsg({ type: 'success', text: `Đã tạo lớp "${className}" thành công với ${phoneCount} SĐT!` });
            setClassName('');
            setPhones('');
            loadVouchers(); // Reload list

        } catch (err) {
            console.error(err);
            setMsg({ type: 'error', text: `Lỗi: ${err.message}` });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            padding: '40px',
            maxWidth: '1200px',
            margin: '0 auto',
            minHeight: '80vh',
            backgroundColor: '#1f2937',
            color: 'white',
            marginTop: '20px',
            borderRadius: '10px'
        }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#60a5fa' }}>
                QUẢN LÝ LỚP HỌC & KÍCH HOẠT
            </h1>

            {/* Create Section */}
            <div style={{ backgroundColor: '#374151', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>📝 Tạo Lớp Mới</h2>

                <form onSubmit={handleCreateClass}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Tên Lớp (Mã Code):</label>
                            <input
                                type="text"
                                placeholder="VD: LOP_A1"
                                value={className}
                                onChange={e => setClassName(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #4b5563', backgroundColor: '#111827', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Chọn Gói:</label>
                            <select
                                value={packageId}
                                onChange={e => setPackageId(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #4b5563', backgroundColor: '#111827', color: 'white' }}
                            >
                                <option value="Trial">Trial (3 ngày)</option>
                                <option value="Starter">Starter (30 ngày)</option>
                                <option value="Pro">Pro (30 ngày)</option>
                                <option value="HocVien">Học Viên (365 ngày)</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Danh sách SĐT (mỗi số 1 dòng hoặc cách nhau dấu phẩy):</label>
                        <textarea
                            placeholder="0912345678&#10;0987654321&#10;..."
                            value={phones}
                            onChange={e => setPhones(e.target.value)}
                            style={{ width: '100%', height: '120px', padding: '10px', borderRadius: '5px', border: '1px solid #4b5563', backgroundColor: '#111827', color: 'white' }}
                        />
                    </div>

                    {msg.text && (
                        <div style={{
                            padding: '10px',
                            marginBottom: '15px',
                            borderRadius: '5px',
                            backgroundColor: msg.type === 'error' ? '#7f1d1d' : '#064e3b',
                            color: 'white'
                        }}>
                            {msg.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '10px 25px',
                            backgroundColor: loading ? '#4b5563' : '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        {loading ? 'Đang xử lý...' : 'TẠO LỚP'}
                    </button>
                </form>
            </div>

            {/* Tracking Section */}
            <div style={{ backgroundColor: '#374151', padding: '20px', borderRadius: '8px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>📊 Theo dõi Kích hoạt</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
                    {/* Voucher List */}
                    <div style={{ borderRight: '1px solid #4b5563', paddingRight: '20px' }}>
                        <h3 style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '10px' }}>Danh sách lớp:</h3>
                        {vouchers.length === 0 ? (
                            <p style={{ color: '#6b7280' }}>Chưa có lớp nào</p>
                        ) : (
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {vouchers.map(v => (
                                    <div
                                        key={v.Id}
                                        onClick={() => handleSelectVoucher(v)}
                                        style={{
                                            padding: '10px',
                                            marginBottom: '5px',
                                            borderRadius: '5px',
                                            backgroundColor: selectedVoucher?.Id === v.Id ? '#3b82f6' : '#1f2937',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold' }}>{v.Code}</div>
                                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                            Gói: {v.PackageId} | {v.AllowedPhones?.split(',').length || 0} SĐT
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Redemption Status */}
                    <div>
                        {!selectedVoucher ? (
                            <p style={{ color: '#6b7280' }}>Chọn 1 lớp để xem trạng thái kích hoạt</p>
                        ) : loadingRedemptions ? (
                            <p>Đang tải...</p>
                        ) : (
                            <div>
                                <h3 style={{ marginBottom: '10px' }}>
                                    Lớp: <strong style={{ color: '#60a5fa' }}>{selectedVoucher.Code}</strong>
                                </h3>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #4b5563' }}>
                                                <th style={{ textAlign: 'left', padding: '8px' }}>SĐT</th>
                                                <th style={{ textAlign: 'left', padding: '8px' }}>Trạng thái</th>
                                                <th style={{ textAlign: 'left', padding: '8px' }}>Thời gian</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedVoucher.AllowedPhones?.split(/[,;\n]+/).map(phone => {
                                                const trimmedPhone = phone.trim();
                                                if (!trimmedPhone) return null;
                                                const { status, data } = getPhoneStatus(trimmedPhone);
                                                return (
                                                    <tr key={trimmedPhone} style={{ borderBottom: '1px solid #374151' }}>
                                                        <td style={{ padding: '8px' }}>{trimmedPhone}</td>
                                                        <td style={{ padding: '8px' }}>
                                                            {status === 'redeemed' ? (
                                                                <span style={{ color: '#10b981' }}>✅ Đã kích hoạt</span>
                                                            ) : (
                                                                <span style={{ color: '#f59e0b' }}>⏳ Chưa kích hoạt</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '8px', fontSize: '12px', color: '#9ca3af' }}>
                                                            {data?.redeemed_at ? new Date(data.redeemed_at).toLocaleString('vi-VN') : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ marginTop: '15px', fontSize: '14px', color: '#9ca3af' }}>
                                    Tổng: {redemptions.length} / {selectedVoucher.AllowedPhones?.split(/[,;\n]+/).filter(p => p.trim()).length || 0} đã kích hoạt
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminVouchers;
