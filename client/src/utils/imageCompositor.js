/**
 * Image Compositor Utility
 * 
 * This utility provides canvas-based image editing capabilities
 * to compose templates with user-provided content (text, images, colors)
 * This approach gives EXACT control over the output, unlike AI generation.
 */

/**
 * Create a composed image from template and user content
 * @param {Object} template - Template object with textZones, imageZones, colorZones
 * @param {Object} formData - User's form input values
 * @param {Object} uploadedImages - User's uploaded images { slotId: { preview: base64 } }
 * @returns {Promise<string>} - Base64 data URL of composed image
 */
export async function composeImage(template, formData, uploadedImages) {
    try {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Load template image first to get dimensions
        const templateImg = await loadImage(template.image);
        canvas.width = templateImg.width;
        canvas.height = templateImg.height;

        // Draw template as background
        ctx.drawImage(templateImg, 0, 0);

        // If template has defined zones, process them
        if (template.textZones && template.textZones.length > 0) {
            await processTextZones(ctx, template.textZones, formData, canvas);
        }

        if (template.imageZones && template.imageZones.length > 0) {
            await processImageZones(ctx, template.imageZones, uploadedImages);
        }

        // Export as base64
        return canvas.toDataURL('image/png', 1.0);
    } catch (error) {
        throw error;
    }
}

/**
 * Load an image from URL or base64
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Process text zones - draw text at specified positions
 */
async function processTextZones(ctx, textZones, formData, canvas) {
    for (const zone of textZones) {
        const text = formData[zone.id] || zone.defaultValue || '';
        if (!text) continue;

        // Set text style
        ctx.fillStyle = zone.color || '#FFFFFF';
        ctx.font = `${zone.fontWeight || 'bold'} ${zone.fontSize || 32}px ${zone.fontFamily || 'Arial'}`;
        ctx.textAlign = zone.textAlign || 'center';
        ctx.textBaseline = zone.textBaseline || 'middle';

        // Calculate position (percentages to pixels)
        const x = (zone.x / 100) * canvas.width;
        const y = (zone.y / 100) * canvas.height;
        const maxWidth = zone.maxWidth ? (zone.maxWidth / 100) * canvas.width : canvas.width * 0.9;

        // Add text shadow for readability
        if (zone.shadow !== false) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
        }

        // Draw text with word wrapping if needed
        wrapText(ctx, text, x, y, maxWidth, zone.lineHeight || (zone.fontSize || 32) * 1.2);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
}

/**
 * Process image zones - draw uploaded images at specified positions
 */
async function processImageZones(ctx, imageZones, uploadedImages) {
    for (const zone of imageZones) {
        const imageData = uploadedImages[zone.id];
        if (!imageData || !imageData.preview) continue;

        try {
            const img = await loadImage(imageData.preview);

            // Calculate position and size
            const x = (zone.x / 100) * ctx.canvas.width;
            const y = (zone.y / 100) * ctx.canvas.height;
            const width = (zone.width / 100) * ctx.canvas.width;
            const height = (zone.height / 100) * ctx.canvas.height;

            // Handle different fit modes
            if (zone.fit === 'cover') {
                drawImageCover(ctx, img, x, y, width, height, zone.borderRadius);
            } else if (zone.fit === 'contain') {
                drawImageContain(ctx, img, x, y, width, height);
            } else {
                // Default: stretch
                ctx.drawImage(img, x, y, width, height);
            }
        } catch (error) {
            console.warn(`Failed to load image for zone ${zone.id}:`, error);
        }
    }
}

/**
 * Word wrap text
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line.trim(), x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line.trim(), x, currentY);
}

/**
 * Draw image with cover fit (crop to fill)
 */
function drawImageCover(ctx, img, x, y, width, height, borderRadius = 0) {
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

    // If border radius, clip to rounded rect
    if (borderRadius > 0) {
        ctx.save();
        roundedRect(ctx, x, y, width, height, borderRadius);
        ctx.clip();
    }

    ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, width, height);

    if (borderRadius > 0) {
        ctx.restore();
    }
}

/**
 * Draw image with contain fit (letterbox)
 */
function drawImageContain(ctx, img, x, y, width, height) {
    const imgRatio = img.width / img.height;
    const boxRatio = width / height;

    let drawWidth, drawHeight, drawX, drawY;

    if (imgRatio > boxRatio) {
        drawWidth = width;
        drawHeight = width / imgRatio;
        drawX = x;
        drawY = y + (height - drawHeight) / 2;
    } else {
        drawHeight = height;
        drawWidth = height * imgRatio;
        drawX = x + (width - drawWidth) / 2;
        drawY = y;
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
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

export default { composeImage };
