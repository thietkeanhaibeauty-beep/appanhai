/**
 * Canvas Template Renderer
 * 
 * Renders templates with user content using HTML5 Canvas
 * Guarantees 100% accurate placement of text and images
 */

/**
 * Render a template with user's content
 * @param {HTMLCanvasElement} canvas - Target canvas element
 * @param {Object} template - Template with zones defined
 * @param {Object} textContent - User's text values { slotId: value }
 * @param {Object} imageContent - User's images { slotId: { preview: base64 } }
 * @param {Object} colorContent - User's colors { slotId: value }
 * @returns {Promise<string>} - Base64 data URL of rendered image
 */
export async function renderTemplate(canvas, template, textContent, imageContent, colorContent) {
    const ctx = canvas.getContext('2d');

    // Load template background image
    const bgImage = await loadImage(template.image);

    // Set canvas size to match template
    canvas.width = bgImage.width;
    canvas.height = bgImage.height;

    // Draw template background
    ctx.drawImage(bgImage, 0, 0);

    // Render image zones first (behind text)
    if (template.imageZones && template.imageZones.length > 0) {
        for (const zone of template.imageZones) {
            const imageData = imageContent[zone.slotId];
            if (imageData && imageData.preview) {
                await renderImageZone(ctx, zone, imageData.preview, canvas);
            }
        }
    }

    // Render text zones
    if (template.textZones && template.textZones.length > 0) {
        for (const zone of template.textZones) {
            const text = textContent[zone.slotId] || zone.defaultValue || '';
            if (text) {
                // Get color override if exists
                const colorOverride = zone.colorSlotId ? colorContent[zone.colorSlotId] : null;
                renderTextZone(ctx, zone, text, colorOverride, canvas);
            }
        }
    }

    // Return as base64
    return canvas.toDataURL('image/png', 1.0);
}

/**
 * Load image from URL or base64
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (_e) => reject(new Error('Failed to load image: ' + src.substring(0, 50)));
        img.src = src;
    });
}

/**
 * Render an image zone
 */
async function renderImageZone(ctx, zone, imageSrc, canvas) {
    try {
        const img = await loadImage(imageSrc);

        // Calculate position (zone coords are percentages)
        const x = (zone.x / 100) * canvas.width;
        const y = (zone.y / 100) * canvas.height;
        const width = (zone.width / 100) * canvas.width;
        const height = (zone.height / 100) * canvas.height;

        ctx.save();

        // Apply clip path if zone has shape
        if (zone.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
            ctx.clip();
        } else if (zone.shape === 'rounded') {
            roundedRect(ctx, x, y, width, height, zone.borderRadius || 10);
            ctx.clip();
        }

        // Draw image with cover fit (fill entire zone, crop if needed)
        drawImageCover(ctx, img, x, y, width, height);

        ctx.restore();
    } catch (error) {
        console.error('Error rendering image zone:', error);
    }
}

/**
 * Render a text zone
 */
function renderTextZone(ctx, zone, text, colorOverride, canvas) {
    // Calculate position (zone coords are percentages)
    const x = (zone.x / 100) * canvas.width;
    const y = (zone.y / 100) * canvas.height;
    const maxWidth = zone.maxWidth ? (zone.maxWidth / 100) * canvas.width : canvas.width * 0.9;

    // Set font
    const fontSize = zone.fontSize || 32;
    const fontWeight = zone.fontWeight || 'bold';
    const fontFamily = zone.fontFamily || 'Arial, sans-serif';
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    // Set color
    ctx.fillStyle = colorOverride || zone.color || '#FFFFFF';

    // Set alignment
    ctx.textAlign = zone.textAlign || 'center';
    ctx.textBaseline = zone.textBaseline || 'middle';

    // Add shadow if specified
    if (zone.shadow !== false) {
        ctx.shadowColor = zone.shadowColor || 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = zone.shadowBlur || 4;
        ctx.shadowOffsetX = zone.shadowOffsetX || 2;
        ctx.shadowOffsetY = zone.shadowOffsetY || 2;
    }

    // Add stroke/outline if specified
    if (zone.strokeColor) {
        ctx.strokeStyle = zone.strokeColor;
        ctx.lineWidth = zone.strokeWidth || 2;
    }

    // Render text (with word wrap if needed)
    const lineHeight = zone.lineHeight || fontSize * 1.2;
    const lines = wrapText(ctx, text, maxWidth);

    let currentY = y;
    for (const line of lines) {
        if (zone.strokeColor) {
            ctx.strokeText(line, x, currentY);
        }
        ctx.fillText(line, x, currentY);
        currentY += lineHeight;
    }

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

/**
 * Wrap text to fit within maxWidth
 */
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

/**
 * Draw image with cover fit (crop to fill)
 */
function drawImageCover(ctx, img, x, y, width, height) {
    const imgRatio = img.width / img.height;
    const boxRatio = width / height;

    let sx, sy, sWidth, sHeight;

    if (imgRatio > boxRatio) {
        // Image is wider - crop sides
        sHeight = img.height;
        sWidth = img.height * boxRatio;
        sx = (img.width - sWidth) / 2;
        sy = 0;
    } else {
        // Image is taller - crop top/bottom
        sWidth = img.width;
        sHeight = img.width / boxRatio;
        sx = 0;
        sy = (img.height - sHeight) / 2;
    }

    ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, width, height);
}

/**
 * Draw rounded rectangle path
 */
function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Download canvas as image
 */
export function downloadCanvas(canvas, filename = 'design.png') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
}

export default { renderTemplate, downloadCanvas };
