import React, { useRef, useEffect, useState } from 'react';
import { renderTemplate, downloadCanvas } from '../utils/canvasRenderer';
import './CanvasPreview.css';

/**
 * Canvas Preview Component
 * 
 * Real-time preview of template with user's content
 * Uses Canvas rendering for 100% accurate results
 */
export default function CanvasPreview({
    template,
    textContent,
    imageContent,
    colorContent,
    onDownload,
    onClose
}) {
    const canvasRef = useRef(null);
    const [isRendering, setIsRendering] = useState(true);
    const [error, setError] = useState(null);
    const [renderedImage, setRenderedImage] = useState(null);

    useEffect(() => {
        renderPreview();
    }, [template, textContent, imageContent, colorContent]);

    const renderPreview = async () => {
        if (!template || !canvasRef.current) return;

        setIsRendering(true);
        setError(null);

        try {
            const dataUrl = await renderTemplate(
                canvasRef.current,
                template,
                textContent,
                imageContent,
                colorContent
            );
            setRenderedImage(dataUrl);
            setIsRendering(false);
        } catch (err) {
            console.error('Render error:', err);
            setError(err.message);
            setIsRendering(false);
        }
    };

    const handleDownload = () => {
        if (canvasRef.current) {
            const filename = `${template.name || 'design'}_${Date.now()}.png`;
            downloadCanvas(canvasRef.current, filename);
            if (onDownload) {
                onDownload(renderedImage);
            }
        }
    };

    const handleSaveToDesigns = () => {
        if (!renderedImage) return;

        // Save to localStorage
        const savedDesigns = JSON.parse(localStorage.getItem('my_designs') || '[]');
        const newDesign = {
            id: Date.now(),
            name: template.name,
            templateId: template.id,
            templateImage: template.image,
            generatedImage: renderedImage, // Full base64
            provider: 'canvas',
            createdAt: new Date().toISOString()
        };

        // Keep only last 20 designs to avoid storage issues
        const updatedDesigns = [newDesign, ...savedDesigns].slice(0, 20);

        try {
            localStorage.setItem('my_designs', JSON.stringify(updatedDesigns));
            alert('✅ Đã lưu vào Thiết Kế Của Tôi!');
        } catch (e) {
            // If storage full, save without base64
            newDesign.generatedImage = '[stored_locally]';
            newDesign.localFile = renderedImage;
            localStorage.setItem('my_designs', JSON.stringify([newDesign, ...savedDesigns.slice(0, 10)]));
            alert('✅ Đã lưu (dung lượng lớn, lưu local)');
        }
    };

    return (
        <div className="canvas-preview-overlay">
            <div className="canvas-preview-modal">
                <div className="canvas-preview-header">
                    <h2>Xem trước thiết kế</h2>
                    <div className="header-badge">
                        <span className="badge canvas">Canvas Render</span>
                        <span className="badge accurate">100% Chính xác</span>
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="canvas-preview-body">
                    {isRendering && (
                        <div className="loading-overlay">
                            <div className="spinner"></div>
                            <p>Đang render...</p>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            <span>❌</span>
                            <p>{error}</p>
                            <button onClick={renderPreview}>Thử lại</button>
                        </div>
                    )}

                    <div className="canvas-container">
                        <canvas ref={canvasRef} />
                    </div>

                    <div className="content-summary">
                        <h3>Nội dung đã áp dụng</h3>

                        {Object.keys(textContent).length > 0 && (
                            <div className="summary-section">
                                <h4>📝 Text</h4>
                                <ul>
                                    {Object.entries(textContent).map(([key, value]) => (
                                        <li key={key}>
                                            <strong>{key}:</strong> {value?.substring(0, 50)}{value?.length > 50 ? '...' : ''}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {Object.keys(imageContent).length > 0 && (
                            <div className="summary-section">
                                <h4>🖼️ Ảnh</h4>
                                <ul>
                                    {Object.entries(imageContent).map(([key, value]) => (
                                        <li key={key}>
                                            <strong>{key}:</strong> {value?.preview ? '✅ Đã upload' : '❌ Chưa có'}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                <div className="canvas-preview-footer">
                    <button className="btn-secondary" onClick={onClose}>Đóng</button>
                    <button className="btn-secondary" onClick={renderPreview}>🔄 Render lại</button>
                    <button className="btn-primary" onClick={handleSaveToDesigns}>
                        💾 Lưu vào Thiết Kế
                    </button>
                    <button className="btn-download" onClick={handleDownload}>
                        ⬇️ Tải về PNG
                    </button>
                </div>
            </div>
        </div>
    );
}
