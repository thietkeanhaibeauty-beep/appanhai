import React, { useState, useRef, useEffect } from 'react';

/**
 * TextZoneEditor - Component cho phép người dùng đánh dấu vùng text trên template
 * Sau khi đánh dấu, text mới sẽ được render chính xác lên vị trí đó
 */
export default function TextZoneEditor({
    imageUrl,
    textSlots = [],
    onSaveZones,
    existingZones = []
}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [zones, setZones] = useState(existingZones);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentZone, setCurrentZone] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(textSlots[0]?.id || '');
    const [imageLoaded, setImageLoaded] = useState(false);
    const [scale, setScale] = useState(1);

    // Draw zones helper function (moved before useEffect to avoid reference before declaration)
    const drawZones = (ctx, zoneList, currentScale) => {
        zoneList.forEach((zone, index) => {
            const x = zone.x * currentScale;
            const y = zone.y * currentScale;
            const width = zone.width * currentScale;
            const height = zone.height * currentScale;

            // Draw zone rectangle
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x, y, width, height);

            // Draw zone label
            ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
            ctx.fillRect(x, y - 25, Math.min(width, 150), 25);

            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.fillText(zone.label || `Zone ${index + 1}`, x + 5, y - 8);

            ctx.setLineDash([]);
        });
    };

    // Load image and setup canvas
    useEffect(() => {
        if (!imageUrl || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Calculate scale to fit container
            const container = containerRef.current;
            const maxWidth = container.clientWidth - 40;
            const maxHeight = 500;

            let newScale = 1;
            if (img.width > maxWidth) {
                newScale = maxWidth / img.width;
            }
            if (img.height * newScale > maxHeight) {
                newScale = maxHeight / img.height;
            }

            setScale(newScale);
            canvas.width = img.width * newScale;
            canvas.height = img.height * newScale;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setImageLoaded(true);

            // Redraw existing zones
            drawZones(ctx, zones, newScale);
        };

        img.src = imageUrl;
    }, [imageUrl]);

    // Redraw zones when they change
    useEffect(() => {
        if (!imageLoaded || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            drawZones(ctx, zones, scale);
        };

        img.src = imageUrl;
    }, [zones, imageLoaded, imageUrl, scale, drawZones]);

    const handleMouseDown = (e) => {
        if (!selectedSlot) {
            alert('Vui lòng chọn một text slot trước!');
            return;
        }

        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        setIsDrawing(true);
        setCurrentZone({
            slotId: selectedSlot,
            label: textSlots.find(s => s.id === selectedSlot)?.label || 'Text',
            x: x,
            y: y,
            width: 0,
            height: 0,
            fontSize: 48,
            fontFamily: 'Arial',
            color: '#FFFFFF',
            align: 'center'
        });
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || !currentZone) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        setCurrentZone(prev => ({
            ...prev,
            width: x - prev.x,
            height: y - prev.y
        }));

        // Redraw with current zone
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            drawZones(ctx, zones, scale);

            // Draw current zone
            const zx = currentZone.x * scale;
            const zy = currentZone.y * scale;
            const zw = (x - currentZone.x) * scale;
            const zh = (y - currentZone.y) * scale;

            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.strokeRect(zx, zy, zw, zh);
        };

        img.src = imageUrl;
    };

    const handleMouseUp = () => {
        if (!isDrawing || !currentZone) return;

        setIsDrawing(false);

        // Only add if zone is big enough
        if (Math.abs(currentZone.width) > 20 && Math.abs(currentZone.height) > 20) {
            // Normalize negative dimensions
            const normalizedZone = {
                ...currentZone,
                x: currentZone.width < 0 ? currentZone.x + currentZone.width : currentZone.x,
                y: currentZone.height < 0 ? currentZone.y + currentZone.height : currentZone.y,
                width: Math.abs(currentZone.width),
                height: Math.abs(currentZone.height)
            };

            setZones(prev => [...prev.filter(z => z.slotId !== selectedSlot), normalizedZone]);
        }

        setCurrentZone(null);
    };

    const removeZone = (slotId) => {
        setZones(prev => prev.filter(z => z.slotId !== slotId));
    };

    const updateZoneStyle = (slotId, field, value) => {
        setZones(prev => prev.map(z =>
            z.slotId === slotId ? { ...z, [field]: value } : z
        ));
    };

    const handleSave = () => {
        onSaveZones(zones);
    };

    return (
        <div className="text-zone-editor" ref={containerRef}>
            <div className="tze-header">
                <h3>📍 Đánh dấu vùng Text</h3>
                <p>Kéo chuột để vẽ vùng chứa text trên ảnh template</p>
            </div>

            <div className="tze-controls">
                <div className="tze-slot-select">
                    <label>Chọn Text Slot:</label>
                    <select
                        value={selectedSlot}
                        onChange={(e) => setSelectedSlot(e.target.value)}
                    >
                        {textSlots.map(slot => (
                            <option key={slot.id} value={slot.id}>
                                {slot.label} {zones.find(z => z.slotId === slot.id) ? '✓' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="tze-canvas-container">
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: 'crosshair' }}
                />
            </div>

            {/* Zone list */}
            <div className="tze-zones-list">
                <h4>Các vùng đã đánh dấu ({zones.length})</h4>
                {zones.length === 0 ? (
                    <p className="tze-empty">Chưa có vùng nào. Kéo chuột trên ảnh để tạo vùng.</p>
                ) : (
                    zones.map(zone => (
                        <div key={zone.slotId} className="tze-zone-item">
                            <div className="tze-zone-info">
                                <span className="tze-zone-label">{zone.label}</span>
                                <span className="tze-zone-pos">
                                    ({Math.round(zone.x)}, {Math.round(zone.y)}) -
                                    {Math.round(zone.width)}x{Math.round(zone.height)}
                                </span>
                            </div>
                            <div className="tze-zone-style">
                                {/* Font Family */}
                                <select
                                    value={zone.fontFamily || 'Arial'}
                                    onChange={(e) => updateZoneStyle(zone.slotId, 'fontFamily', e.target.value)}
                                    title="Font"
                                    style={{ width: '100px' }}
                                >
                                    <option value="Arial">Arial</option>
                                    <option value="Roboto">Roboto</option>
                                    <option value="Inter">Inter</option>
                                    <option value="Montserrat">Montserrat</option>
                                    <option value="Open Sans">Open Sans</option>
                                    <option value="Playfair Display">Playfair Display</option>
                                    <option value="Oswald">Oswald</option>
                                    <option value="Dancing Script">Dancing Script</option>
                                </select>
                                {/* Font Size */}
                                <input
                                    type="number"
                                    value={zone.fontSize}
                                    onChange={(e) => updateZoneStyle(zone.slotId, 'fontSize', parseInt(e.target.value))}
                                    title="Font size"
                                    min="12"
                                    max="200"
                                    style={{ width: '50px' }}
                                />
                                {/* Text Color */}
                                <input
                                    type="color"
                                    value={zone.color}
                                    onChange={(e) => updateZoneStyle(zone.slotId, 'color', e.target.value)}
                                    title="Màu chữ"
                                />
                                {/* Stroke Color */}
                                <input
                                    type="color"
                                    value={zone.strokeColor || '#000000'}
                                    onChange={(e) => updateZoneStyle(zone.slotId, 'strokeColor', e.target.value)}
                                    title="Màu viền chữ"
                                />
                                {/* Alignment */}
                                <select
                                    value={zone.align}
                                    onChange={(e) => updateZoneStyle(zone.slotId, 'align', e.target.value)}
                                    style={{ width: '60px' }}
                                >
                                    <option value="left">⬅️</option>
                                    <option value="center">↔️</option>
                                    <option value="right">➡️</option>
                                </select>
                                <button
                                    className="tze-remove-btn"
                                    onClick={() => removeZone(zone.slotId)}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="tze-actions">
                <button className="tze-save-btn" onClick={handleSave}>
                    💾 Lưu vùng text
                </button>
            </div>

            <style>{`
                .text-zone-editor {
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    padding: 20px;
                    margin-top: 16px;
                }
                
                .tze-header h3 {
                    margin: 0 0 8px;
                    color: #60a5fa;
                }
                
                .tze-header p {
                    margin: 0;
                    opacity: 0.7;
                    font-size: 0.9rem;
                }
                
                .tze-controls {
                    margin: 16px 0;
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }
                
                .tze-slot-select {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .tze-slot-select select {
                    padding: 8px 12px;
                    border-radius: 6px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: white;
                }
                
                .tze-canvas-container {
                    border: 2px dashed rgba(255,255,255,0.2);
                    border-radius: 8px;
                    padding: 10px;
                    display: flex;
                    justify-content: center;
                    background: rgba(0,0,0,0.3);
                }
                
                .tze-canvas-container canvas {
                    border-radius: 4px;
                }
                
                .tze-zones-list {
                    margin-top: 16px;
                }
                
                .tze-zones-list h4 {
                    margin: 0 0 12px;
                    font-size: 0.95rem;
                }
                
                .tze-empty {
                    opacity: 0.5;
                    font-style: italic;
                }
                
                .tze-zone-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 6px;
                    margin-bottom: 8px;
                }
                
                .tze-zone-label {
                    font-weight: 600;
                    color: #60a5fa;
                }
                
                .tze-zone-pos {
                    font-size: 0.8rem;
                    opacity: 0.6;
                    margin-left: 8px;
                }
                
                .tze-zone-style {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                
                .tze-zone-style input[type="number"] {
                    width: 60px;
                    padding: 4px 8px;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: white;
                }
                
                .tze-zone-style input[type="color"] {
                    width: 32px;
                    height: 32px;
                    padding: 0;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                
                .tze-zone-style select {
                    padding: 4px 8px;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: white;
                }
                
                .tze-remove-btn {
                    width: 28px;
                    height: 28px;
                    border-radius: 4px;
                    background: rgba(239, 68, 68, 0.2);
                    border: none;
                    color: #ef4444;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .tze-remove-btn:hover {
                    background: rgba(239, 68, 68, 0.4);
                }
                
                .tze-actions {
                    margin-top: 16px;
                    display: flex;
                    justify-content: flex-end;
                }
                
                .tze-save-btn {
                    padding: 10px 24px;
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .tze-save-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                }
            `}</style>
        </div>
    );
}

/**
 * CanvasTemplateRenderer - Render text lên ảnh template (OPTIMIZED)
 * Features:
 * - Font loading with fallback
 * - Text stroke/outline for readability
 * - Better word wrapping
 * - Support for both horizontal and vertical alignment
 */

// Available fonts - can be extended
const AVAILABLE_FONTS = [
    'Arial',
    'Roboto',
    'Inter',
    'Montserrat',
    'Open Sans',
    'Playfair Display',
    'Lora',
    'Oswald',
    'Dancing Script',
    'Pacifico'
];

// Load Google Fonts dynamically
async function loadGoogleFonts(fontFamily) {
    if (!fontFamily || fontFamily === 'Arial' || fontFamily.includes('sans-serif')) {
        return true; // System fonts, no need to load
    }

    try {
        // Check if font is already loaded
        if (document.fonts.check(`12px "${fontFamily}"`)) {
            return true;
        }

        // Try to load from Google Fonts
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;600;700&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        // Wait for font to load (with timeout)
        await Promise.race([
            document.fonts.load(`600 48px "${fontFamily}"`),
            new Promise(resolve => setTimeout(resolve, 2000))
        ]);

        return document.fonts.check(`12px "${fontFamily}"`);
    } catch (_err) {
        console.warn(`Font ${fontFamily} failed to load, using fallback`);
        return false;
    }
}

export async function renderTemplateWithCanvas(templateImageBase64, textZones, formData) {
    // Pre-load all required fonts
    const uniqueFonts = [...new Set(textZones.map(z => z.fontFamily).filter(Boolean))];
    await Promise.all(uniqueFonts.map(loadGoogleFonts));

    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.crossOrigin = 'anonymous';
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;

                // Draw base template image
                ctx.drawImage(img, 0, 0);

                // Draw text in each zone
                textZones.forEach(zone => {
                    const text = formData[zone.slotId];
                    if (!text) return;

                    const fontSize = zone.fontSize || 48;
                    const fontFamily = zone.fontFamily || 'Arial, sans-serif';
                    const color = zone.color || '#FFFFFF';
                    const align = zone.align || 'center';
                    const hasStroke = zone.stroke !== false; // Default to true
                    const strokeColor = zone.strokeColor || '#000000';
                    const strokeWidth = zone.strokeWidth || Math.max(2, fontSize / 20);

                    // Calculate positions based on alignment
                    let textX;
                    if (align === 'left') {
                        textX = zone.x + zone.width * 0.05;
                    } else if (align === 'right') {
                        textX = zone.x + zone.width * 0.95;
                    } else {
                        textX = zone.x + zone.width / 2;
                    }

                    // Set text style
                    ctx.font = `bold ${fontSize}px "${fontFamily}", Arial, sans-serif`;
                    ctx.textAlign = align;
                    ctx.textBaseline = 'middle';

                    // Word wrap
                    const maxWidth = zone.width * 0.9;
                    const words = text.split(/\s+/);
                    let line = '';
                    let lines = [];

                    words.forEach(word => {
                        const testLine = line + (line ? ' ' : '') + word;
                        const metrics = ctx.measureText(testLine);
                        if (metrics.width > maxWidth && line !== '') {
                            lines.push(line);
                            line = word;
                        } else {
                            line = testLine;
                        }
                    });
                    if (line) lines.push(line);

                    // Auto-adjust font size if text doesn't fit
                    let adjustedFontSize = fontSize;
                    while (lines.length > 4 && adjustedFontSize > 16) {
                        adjustedFontSize -= 4;
                        ctx.font = `bold ${adjustedFontSize}px "${fontFamily}", Arial, sans-serif`;

                        lines = [];
                        line = '';
                        words.forEach(word => {
                            const testLine = line + (line ? ' ' : '') + word;
                            const metrics = ctx.measureText(testLine);
                            if (metrics.width > maxWidth && line !== '') {
                                lines.push(line);
                                line = word;
                            } else {
                                line = testLine;
                            }
                        });
                        if (line) lines.push(line);
                    }

                    // Calculate vertical positioning
                    const lineHeight = adjustedFontSize * 1.25;
                    const totalHeight = lines.length * lineHeight;
                    const startY = zone.y + (zone.height - totalHeight) / 2 + lineHeight / 2;

                    // Draw each line with stroke (outline) first, then fill
                    lines.forEach((lineText, index) => {
                        const lineY = startY + index * lineHeight;

                        // Draw stroke (outline) for better readability
                        if (hasStroke) {
                            ctx.strokeStyle = strokeColor;
                            ctx.lineWidth = strokeWidth;
                            ctx.lineJoin = 'round';
                            ctx.miterLimit = 2;
                            ctx.strokeText(lineText, textX, lineY);
                        }

                        // Draw text shadow
                        ctx.shadowColor = 'rgba(0,0,0,0.5)';
                        ctx.shadowBlur = adjustedFontSize / 10;
                        ctx.shadowOffsetX = 2;
                        ctx.shadowOffsetY = 2;

                        // Draw main text
                        ctx.fillStyle = color;
                        ctx.fillText(lineText, textX, lineY);

                        // Reset shadow
                        ctx.shadowColor = 'transparent';
                        ctx.shadowBlur = 0;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;
                    });
                });

                // Convert to high-quality PNG
                resolve(canvas.toDataURL('image/png', 1.0));
            };

            img.onerror = (err) => {
                console.error('Failed to load template image:', err);
                reject(new Error('Failed to load template image. Please check the image URL.'));
            };

            img.src = templateImageBase64;
        } catch (error) {
            console.error('Canvas rendering error:', error);
            reject(error);
        }
    });
}

// Export available fonts for UI
export { AVAILABLE_FONTS };
