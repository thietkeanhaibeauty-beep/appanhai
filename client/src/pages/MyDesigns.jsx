import React, { useState, useEffect } from 'react';
import { designsApi, getImageUrl } from '../services/api';

export default function MyDesigns() {
    const [designs, setDesigns] = useState([]);

    const loadDesigns = async () => {
        try {
            // Load from Server (Primary Source)
            let serverDesigns = [];
            try {
                serverDesigns = await designsApi.getAll();
                console.log('✅ Loaded designs from server:', serverDesigns.length);
            } catch (err) {
                console.warn('⚠️ Could not load from server, using local only:', err);
            }

            // Load from LocalStorage (Secondary/Fallback)
            const localDesigns = JSON.parse(localStorage.getItem('my_designs') || '[]');

            // Merge: Server designs take precedence. 
            // Create a map by ID
            const designMap = new Map();

            // Add local designs first
            localDesigns.forEach(d => designMap.set(String(d.id), d));

            // Overwrite/Add server designs (fixing image paths and data)
            serverDesigns.forEach(d => {
                designMap.set(String(d.id), {
                    ...d,
                    imageUrl: d.image_path ? getImageUrl(d.image_path) : (d.imageUrl || d.image), // Normalize image URL
                    templateTitle: d.template_title || d.templateTitle || 'Thiết kế không tên',
                    templateImage: d.template_image || d.templateImage,
                    provider: d.form_data?.provider || d.provider || 'unknown',
                    createdAt: (d.created_at && !d.created_at.includes('Z'))
                        ? `${d.created_at.replace(' ', 'T')}Z` // Treat 'YYYY-MM-DD HH:MM:SS' as UTC
                        : (d.created_at || d.createdAt)
                });
            });

            // Convert back to array and sort by date desc
            const mergedDesigns = Array.from(designMap.values()).sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );

            setDesigns(mergedDesigns);
        } catch (error) {
            console.error('Error loading designs:', error);
            // Fallback to local if everything fails
            const localDesigns = JSON.parse(localStorage.getItem('my_designs') || '[]');
            setDesigns(localDesigns);
        }
    };

    // Load designs from localStorage on mount
    useEffect(() => {
        loadDesigns();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc muốn xóa thiết kế này?')) {
            try {
                // Try deleting from server first
                await designsApi.delete(id).catch(err => console.warn('Delete from server failed:', err));

                // Then update local state and localStorage
                const updated = designs.filter(d => d.id !== id);
                localStorage.setItem('my_designs', JSON.stringify(updated));
                setDesigns(updated);
            } catch (error) {
                console.error('Delete error:', error);
                alert('Lỗi khi xóa thiết kế');
            }
        }
    };

    const handleDownload = async (imageUrl, templateTitle) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${templateTitle || 'design'}_${Date.now()}.png`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (_error) {
            // Fallback: open in new tab
            window.open(imageUrl, '_blank');
        }
    };

    return (
        <div className="gallery-container">
            <div className="gallery-header">
                <h1 className="gallery-title">Bộ Sưu Tập Của Tôi</h1>
                <p className="gallery-subtitle">
                    {designs.length > 0
                        ? `Bạn đã tạo ${designs.length} thiết kế tuyệt vời`
                        : 'Nơi lưu trữ các tác phẩm sáng tạo của bạn'}
                </p>
            </div>

            {designs.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3>Chưa có thiết kế nào</h3>
                    <p>Hãy chọn một mẫu template để bắt đầu sáng tạo ngay!</p>
                    <a href="/" className="cta-button">
                        Khám phá Template
                    </a>
                </div>
            ) : (
                <div className="designs-grid">
                    {designs.map((design) => {
                        // Strict check for image validity
                        const finalImageUrl = design.imageUrl || (design.image_path ? getImageUrl(design.image_path) : null);

                        // If strict filter fails, we shouldn't even screen these, but just in case:
                        if (!finalImageUrl || finalImageUrl === 'undefined') return null;

                        const dateObj = new Date(design.createdAt);
                        const isValidDate = !isNaN(dateObj.getTime());
                        const dateString = isValidDate
                            ? dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : 'Vừa xong';

                        return (
                            <div key={design.id} className="design-card group">
                                <div className="design-image relative overflow-hidden rounded-lg bg-gray-900">
                                    <img
                                        src={finalImageUrl}
                                        alt={design.templateTitle}
                                        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.style.display = 'none'; // Hide broken images completely
                                            e.target.parentElement.classList.add('broken-img-placeholder');
                                        }}
                                    />

                                    {/* Overlay Actions */}
                                    <div className="design-overlay absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                                        <button
                                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
                                            onClick={() => handleDownload(finalImageUrl, design.templateTitle)}
                                            title="Tải về máy"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </button>
                                        <button
                                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
                                            onClick={() => window.open(finalImageUrl, '_blank')}
                                            title="Xem kích thước lớn"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                        <button
                                            className="p-2 bg-red-500/80 hover:bg-red-600/90 rounded-full text-white backdrop-blur-sm transition-colors"
                                            onClick={() => handleDelete(design.id)}
                                            title="Xóa vĩnh viễn"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="design-info mt-3">
                                    <h4 className="font-semibold text-white truncate" title={design.templateTitle}>
                                        {design.templateTitle !== 'Thiết kế không tên' ? design.templateTitle : 'Tác phẩm mới'}
                                    </h4>
                                    <div className="flex justify-between items-center mt-1 text-sm text-gray-400">
                                        <span className={`px-2 py-0.5 rounded text-xs ${design.provider === 'gemini' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                                            {design.provider === 'gemini' ? 'Gemini AI' : 'DALL-E 3'}
                                        </span>
                                        <span className="text-xs opacity-70">
                                            {dateString}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
