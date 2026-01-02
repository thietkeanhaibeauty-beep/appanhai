import React, { useState, useRef, useEffect } from 'react';
import './TemplateZoneEditor.css';

/**
 * Template Zone Editor
 * 
 * Visual editor for admins to mark text and image zones on templates
 * Zones are stored as percentages for responsive rendering
 */
export default function TemplateZoneEditor({ template, onSave, onClose }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [image, setImage] = useState(null);
    const [zones, setZones] = useState([]);
    const [selectedZone, setSelectedZone] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
    const [currentTool, setCurrentTool] = useState('text'); // 'text' or 'image'
    const [scale, setScale] = useState(1);

    // Load template image
    useEffect(() => {
        if (!template?.image) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            setImage(img);
            // Calculate scale to fit in container
            const container = containerRef.current;
            if (container) {
                const maxWidth = container.clientWidth - 40;
                const maxHeight = window.innerHeight - 300;
                const scaleX = maxWidth / img.width;
                const scaleY = maxHeight / img.height;
                setScale(Math.min(scaleX, scaleY, 1));
            }
        };
        img.src = template.image;

        // Load existing zones
        if (template.textZones) {
            setZones(prev => [...prev, ...template.textZones.map(z => ({ ...z, type: 'text' }))]);
        }
        if (template.imageZones) {
            setZones(prev => [...prev, ...template.imageZones.map(z => ({ ...z, type: 'image' }))]);
        }
    }, [template]);

    // Render canvas
    useEffect(() => {
        if (!image || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        canvas.width = image.width * scale;
        canvas.height = image.height * scale;

        // Draw template image
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        // Draw zones
        zones.forEach((zone, index) => {
            const x = (zone.x / 100) * canvas.width;
            const y = (zone.y / 100) * canvas.height;
            const width = (zone.width / 100) * canvas.width;
            const height = (zone.height / 100) * canvas.height;

            ctx.strokeStyle = zone.type === 'text' ? '#00ff00' : '#ff6600';
            ctx.lineWidth = selectedZone === index ? 3 : 2;
            ctx.setLineDash(selectedZone === index ? [] : [5, 5]);
            ctx.strokeRect(x, y, width, height);

            // Draw label
            ctx.fillStyle = zone.type === 'text' ? '#00ff00' : '#ff6600';
            ctx.font = '12px Arial';
            ctx.fillText(`${zone.type === 'text' ? 'T' : 'I'}${index + 1}: ${zone.label || zone.slotId}`, x + 2, y - 4);
        });
    }, [image, zones, selectedZone, scale]);

    // Mouse handlers for drawing zones
    const handleMouseDown = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicking on existing zone
        const clickedZoneIndex = zones.findIndex(zone => {
            const zx = (zone.x / 100) * canvas.width;
            const zy = (zone.y / 100) * canvas.height;
            const zw = (zone.width / 100) * canvas.width;
            const zh = (zone.height / 100) * canvas.height;
            return x >= zx && x <= zx + zw && y >= zy && y <= zy + zh;
        });

        if (clickedZoneIndex >= 0) {
            setSelectedZone(clickedZoneIndex);
        } else {
            setIsDrawing(true);
            setDrawStart({ x, y });
            setSelectedZone(null);
        }
    };

    const handleMouseMove = (e) => {
        if (!isDrawing) return;
        // Could add preview rectangle here
    };

    const handleMouseUp = (e) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        // Calculate zone as percentages
        const x = Math.min(drawStart.x, endX);
        const y = Math.min(drawStart.y, endY);
        const width = Math.abs(endX - drawStart.x);
        const height = Math.abs(endY - drawStart.y);

        // Minimum size check
        if (width < 20 || height < 20) {
            setIsDrawing(false);
            return;
        }

        // Create new zone
        const newZone = {
            id: `zone_${Date.now()}`,
            type: currentTool,
            slotId: currentTool === 'text'
                ? `text_${zones.filter(z => z.type === 'text').length + 1}`
                : `img_${zones.filter(z => z.type === 'image').length + 1}`,
            label: currentTool === 'text' ? 'Tiêu đề mới' : 'Ảnh mới',
            x: (x / canvas.width) * 100,
            y: (y / canvas.height) * 100,
            width: (width / canvas.width) * 100,
            height: (height / canvas.height) * 100,
            // Text-specific defaults
            ...(currentTool === 'text' && {
                fontSize: 32,
                fontWeight: 'bold',
                fontFamily: 'Arial',
                color: '#FFFFFF',
                textAlign: 'center',
                textBaseline: 'middle',
                shadow: true
            }),
            // Image-specific defaults
            ...(currentTool === 'image' && {
                shape: 'rectangle',
                borderRadius: 0
            })
        };

        setZones([...zones, newZone]);
        setSelectedZone(zones.length);
        setIsDrawing(false);
    };

    // Update selected zone properties
    const updateZone = (updates) => {
        if (selectedZone === null) return;
        setZones(zones.map((z, i) => i === selectedZone ? { ...z, ...updates } : z));
    };

    // Delete selected zone
    const deleteZone = () => {
        if (selectedZone === null) return;
        setZones(zones.filter((_, i) => i !== selectedZone));
        setSelectedZone(null);
    };

    // Save zones
    const handleSave = () => {
        const textZones = zones.filter(z => z.type === 'text').map(({ type, ...z }) => z);
        const imageZones = zones.filter(z => z.type === 'image').map(({ type, ...z }) => z);
        onSave({ textZones, imageZones });
    };

    const selectedZoneData = selectedZone !== null ? zones[selectedZone] : null;

    return (
        <div className="zone-editor-overlay">
            <div className="zone-editor-modal">
                <div className="zone-editor-header">
                    <h2>Đánh dấu vùng Template</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="zone-editor-toolbar">
                    <div className="tool-group">
                        <button
                            className={`tool-btn ${currentTool === 'text' ? 'active' : ''}`}
                            onClick={() => setCurrentTool('text')}
                        >
                            📝 Vùng Text
                        </button>
                        <button
                            className={`tool-btn ${currentTool === 'image' ? 'active' : ''}`}
                            onClick={() => setCurrentTool('image')}
                        >
                            🖼️ Vùng Ảnh
                        </button>
                    </div>
                    <div className="tool-info">
                        Kéo chuột để vẽ vùng {currentTool === 'text' ? 'text' : 'ảnh'}
                    </div>
                </div>

                <div className="zone-editor-body" ref={containerRef}>
                    <div className="canvas-container">
                        <canvas
                            ref={canvasRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            style={{ cursor: isDrawing ? 'crosshair' : 'pointer' }}
                        />
                    </div>

                    <div className="zone-properties">
                        <h3>Thuộc tính vùng</h3>

                        {selectedZoneData ? (
                            <div className="property-form">
                                <div className="form-group">
                                    <label>Slot ID</label>
                                    <input
                                        type="text"
                                        value={selectedZoneData.slotId}
                                        onChange={(e) => updateZone({ slotId: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Nhãn hiển thị</label>
                                    <input
                                        type="text"
                                        value={selectedZoneData.label || ''}
                                        onChange={(e) => updateZone({ label: e.target.value })}
                                    />
                                </div>

                                {selectedZoneData.type === 'text' && (
                                    <>
                                        <div className="form-group">
                                            <label>Font Size (px)</label>
                                            <input
                                                type="number"
                                                value={selectedZoneData.fontSize}
                                                onChange={(e) => updateZone({ fontSize: parseInt(e.target.value) })}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Font Weight</label>
                                            <select
                                                value={selectedZoneData.fontWeight}
                                                onChange={(e) => updateZone({ fontWeight: e.target.value })}
                                            >
                                                <option value="normal">Normal</option>
                                                <option value="bold">Bold</option>
                                                <option value="600">Semi-Bold</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Màu chữ</label>
                                            <input
                                                type="color"
                                                value={selectedZoneData.color}
                                                onChange={(e) => updateZone({ color: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Căn lề</label>
                                            <select
                                                value={selectedZoneData.textAlign}
                                                onChange={(e) => updateZone({ textAlign: e.target.value })}
                                            >
                                                <option value="left">Trái</option>
                                                <option value="center">Giữa</option>
                                                <option value="right">Phải</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                {selectedZoneData.type === 'image' && (
                                    <>
                                        <div className="form-group">
                                            <label>Hình dạng</label>
                                            <select
                                                value={selectedZoneData.shape}
                                                onChange={(e) => updateZone({ shape: e.target.value })}
                                            >
                                                <option value="rectangle">Hình chữ nhật</option>
                                                <option value="rounded">Bo góc</option>
                                                <option value="circle">Hình tròn</option>
                                            </select>
                                        </div>

                                        {selectedZoneData.shape === 'rounded' && (
                                            <div className="form-group">
                                                <label>Bo góc (px)</label>
                                                <input
                                                    type="number"
                                                    value={selectedZoneData.borderRadius}
                                                    onChange={(e) => updateZone({ borderRadius: parseInt(e.target.value) })}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}

                                <button className="delete-btn" onClick={deleteZone}>
                                    🗑️ Xóa vùng này
                                </button>
                            </div>
                        ) : (
                            <p className="no-selection">Chọn một vùng hoặc vẽ vùng mới</p>
                        )}

                        <div className="zones-list">
                            <h4>Danh sách vùng ({zones.length})</h4>
                            {zones.map((zone, index) => (
                                <div
                                    key={zone.id}
                                    className={`zone-item ${selectedZone === index ? 'selected' : ''}`}
                                    onClick={() => setSelectedZone(index)}
                                >
                                    <span className={`zone-type ${zone.type}`}>
                                        {zone.type === 'text' ? '📝' : '🖼️'}
                                    </span>
                                    <span className="zone-label">{zone.label || zone.slotId}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="zone-editor-footer">
                    <button className="cancel-btn" onClick={onClose}>Hủy</button>
                    <button className="save-btn" onClick={handleSave}>
                        💾 Lưu vùng ({zones.length} vùng)
                    </button>
                </div>
            </div>
        </div>
    );
}
