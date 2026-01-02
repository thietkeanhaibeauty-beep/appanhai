import React, { useState, useEffect } from 'react';
import TemplateCard from '../components/TemplateCard';
import TemplateModal from '../components/TemplateModal';
import CanvasPreview from '../components/CanvasPreview';
import { templatesApi, designsApi, getImageUrl } from '../services/api';

const MOCK_TEMPLATES = [
    {
        id: 'canvas-demo',
        title: "🎯 Demo Canvas Render",
        category: "banner",
        image: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?q=80&w=800",
        users: 0,
        images: 1,
        colors: 2,
        description: "Template demo với zones đã định nghĩa - dùng để test Canvas Render",
        isCustom: true,
        // Text slots for form
        textSlots: [
            { id: 'headline', label: 'Tiêu đề', defaultValue: 'SALE 50%' },
            { id: 'subline', label: 'Mô tả', defaultValue: 'Ưu đãi hấp dẫn' },
            { id: 'cta', label: 'Call to Action', defaultValue: 'MUA NGAY' },
        ],
        // Image slots for form
        imageSlots: [
            { id: 'product', label: 'Ảnh sản phẩm', description: 'Ảnh sản phẩm chính' }
        ],
        // Color slots for form
        colorSlots: [
            { id: 'primary', label: 'Màu chính', defaultValue: '#FF6B6B' },
            { id: 'secondary', label: 'Màu phụ', defaultValue: '#4ECDC4' },
        ],
        // TEXT ZONES - positions for Canvas Render
        textZones: [
            {
                slotId: 'headline',
                label: 'Tiêu đề',
                x: 50, y: 20, // Percentage from top-left
                maxWidth: 80,
                fontSize: 72,
                fontWeight: 'bold',
                fontFamily: 'Arial Black, sans-serif',
                color: '#FFFFFF',
                textAlign: 'center',
                textBaseline: 'middle',
                shadow: true,
                shadowColor: 'rgba(0,0,0,0.5)',
                shadowBlur: 8
            },
            {
                slotId: 'subline',
                label: 'Mô tả',
                x: 50, y: 35,
                maxWidth: 60,
                fontSize: 28,
                fontWeight: 'normal',
                fontFamily: 'Arial, sans-serif',
                color: '#FFFFFF',
                textAlign: 'center',
                textBaseline: 'middle',
                shadow: true
            },
            {
                slotId: 'cta',
                label: 'Call to Action',
                x: 50, y: 85,
                maxWidth: 40,
                fontSize: 24,
                fontWeight: 'bold',
                fontFamily: 'Arial, sans-serif',
                color: '#FFD93D',
                textAlign: 'center',
                textBaseline: 'middle',
                strokeColor: '#000000',
                strokeWidth: 2
            }
        ],
        // IMAGE ZONES - positions for Canvas Render
        imageZones: [
            {
                slotId: 'product',
                label: 'Ảnh sản phẩm',
                x: 60, y: 40, // Top-left corner as percentage
                width: 35, height: 40, // Size as percentage
                shape: 'rounded',
                borderRadius: 15
            }
        ]
    },
    {
        id: 1,
        title: "Banner Tết - Làm đẹp đón xuân",
        category: "banner",
        image: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?q=80&w=800",
        users: 7,
        images: 2,
        colors: 4,
        description: "Template banner quảng cáo Tết với khung tròn, người mẫu, và các element trang trí truyền thống"
    },
    {
        id: 2,
        title: "Banner Tết - Làm đẹp đón xuân",
        category: "banner",
        image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800",
        users: 7,
        images: 2,
        colors: 5,
        description: "Template banner quảng cáo Tết với thiết kế hiện đại và sang trọng"
    },
    {
        id: 3,
        title: "Sale Cuối Năm",
        category: "banner",
        image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800",
        users: 12,
        images: 3,
        colors: 6,
        description: "Template khuyến mãi cuối năm với màu sắc nổi bật"
    },
    {
        id: 4,
        title: "Poster Spa & Beauty",
        category: "poster",
        image: "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?q=80&w=800",
        users: 5,
        images: 2,
        colors: 3,
        description: "Template poster cho spa và dịch vụ làm đẹp"
    },
    {
        id: 5,
        title: "Social Media - Fashion",
        category: "social",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800",
        users: 15,
        images: 4,
        colors: 5,
        description: "Template cho bài đăng thời trang trên mạng xã hội"
    },
    {
        id: 6,
        title: "Quảng cáo sản phẩm",
        category: "product",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800",
        users: 8,
        images: 1,
        colors: 4,
        description: "Template quảng cáo sản phẩm với thiết kế tối giản"
    },
];

export default function Gallery({ searchValue, activeCategory }) {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allTemplates, setAllTemplates] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [_isLoading, setIsLoading] = useState(true);

    // Canvas Preview state
    const [showCanvasPreview, setShowCanvasPreview] = useState(false);
    const [canvasPreviewData, setCanvasPreviewData] = useState(null);

    // Load templates and favorites on mount
    useEffect(() => {
        loadTemplates();
        loadFavorites();
    }, []);

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            // Try loading from Backend API first
            const serverTemplates = await templatesApi.getAll();
            console.log('✅ Loaded templates from server:', serverTemplates.length);

            // Format server templates
            const formattedServerTemplates = serverTemplates.map(t => ({
                ...t,
                // Handle image path from server
                image: t.image_path ? getImageUrl(t.image_path) : t.image,
                // Normalize category field - server uses category_id
                category: t.category_id || t.category,
                users: 0,
                images: t.imageSlots?.length || 0,
                colors: t.colorSlots?.length || 0,
                textSlots: t.textSlots || [],
                imageSlots: t.imageSlots || [],
                colorSlots: t.colorSlots || [],
                isCustom: true
            }));

            // Combine with mock templates (server templates first)
            setAllTemplates([...formattedServerTemplates, ...MOCK_TEMPLATES]);
        } catch (error) {
            console.warn('⚠️ Server offline, loading from localStorage:', error.message);

            // Fallback to localStorage
            const customTemplates = JSON.parse(localStorage.getItem('custom_templates') || '[]');
            const formattedCustomTemplates = customTemplates.map(t => ({
                ...t,
                users: 0,
                images: t.imageSlots?.length || 0,
                colors: t.colorSlots?.length || 0,
                isCustom: true
            }));

            setAllTemplates([...formattedCustomTemplates, ...MOCK_TEMPLATES]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadFavorites = () => {
        const savedFavorites = JSON.parse(localStorage.getItem('favorite_templates') || '[]');
        setFavorites(savedFavorites);
    };

    const handleToggleFavorite = (templateId) => {
        let newFavorites;
        if (favorites.includes(templateId)) {
            // Remove from favorites
            newFavorites = favorites.filter(id => id !== templateId);
        } else {
            // Add to favorites
            newFavorites = [...favorites, templateId];
        }
        setFavorites(newFavorites);
        localStorage.setItem('favorite_templates', JSON.stringify(newFavorites));
    };

    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedTemplate(null);
    };

    // Helper function to convert image URL to Base64
    const imageUrlToBase64 = async (imageUrl) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error converting image to base64:', error);
            throw error;
        }
    };

    const handleGenerate = async (formData) => {
        console.log('Generating with data:', formData);
        console.log('Form data keys:', Object.keys(formData));
        console.log('Uploaded images:', formData.images);

        const { template, images: uploadedImages, imageModel } = formData;

        // ====== CANVAS RENDER MODE - 100% Accurate! ======
        if (imageModel === 'canvas-render') {
            console.log('🎯 Using Canvas Render mode - 100% accurate!');

            // Check if template has zones defined
            if (!template.textZones || template.textZones.length === 0) {
                // If no zones defined, warn and fallback to AI automatically
                console.warn('⚠️ Template missing zones for Canvas Render. Falling back to AI model.');

                // alert(
                //     '⚠️ Template này chưa hỗ trợ chế độ "Canvas Render".\n\n' +
                //     'Hệ thống sẽ tự động chuyển sang dùng AI (Gemini 2.0) để tạo ảnh.\n' +
                //     '(Để dùng Canvas Render, template cần được định nghĩa Zone trong Admin)'
                // );

                // Fall back to AI - change model
                formData.imageModel = 'gemini-2.0-flash-exp';
            } else {
                // Prepare data for Canvas Preview
                const textContent = {};
                template.textSlots?.forEach(slot => {
                    textContent[slot.id] = formData[slot.id] || slot.defaultValue || '';
                });

                const colorContent = {};
                template.colorSlots?.forEach(slot => {
                    colorContent[slot.id] = formData[slot.id] || slot.defaultValue || '';
                });

                // Set canvas preview data and open preview
                setCanvasPreviewData({
                    template,
                    textContent,
                    imageContent: uploadedImages || {},
                    colorContent
                });
                setShowCanvasPreview(true);
                setIsModalOpen(false);
                return; // Exit - Canvas Preview handles everything
            }
        }

        // Check API provider - prioritize Gemini if available
        const apiProvider = localStorage.getItem('api_provider') || 'gemini';
        const geminiKey = localStorage.getItem('gemini_api_key');
        const openaiKey = localStorage.getItem('openai_api_key');

        // Determine which API to use
        const useGemini = apiProvider === 'gemini' && geminiKey;
        const apiKey = useGemini ? geminiKey : openaiKey;

        if (!apiKey) {
            alert(`Vui lòng cấu hình ${useGemini ? 'Gemini' : 'OpenAI'} API Key trong Quản lý Template > Cài đặt API trước!`);
            return;
        }

        // Show loading
        const updateLoadingMessage = (message) => {
            const loadingText = document.querySelector('#generating-alert .loading-step');
            const loadingDesc = document.querySelector('#generating-alert .loading-desc');
            if (loadingText) loadingText.textContent = message;
            if (loadingDesc) loadingDesc.textContent = useGemini
                ? 'Gemini đang tái tạo thiết kế dựa trên template mẫu...'
                : 'Đang tạo thiết kế với AI...';
        };

        const loadingAlert = document.createElement('div');
        loadingAlert.id = 'generating-alert';
        loadingAlert.innerHTML = `
            <div style="position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;">
                <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:48px;border-radius:20px;text-align:center;color:white;box-shadow:0 25px 50px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);">
                    <div style="width:60px;height:60px;border:4px solid ${useGemini ? '#4285f4' : '#3b82f6'};border-top-color:${useGemini ? '#ea4335' : '#8b5cf6'};border-radius:50%;margin:0 auto 24px;animation:spin 0.8s linear infinite;"></div>
                    <p class="loading-step" style="font-size:1.3rem;font-weight:600;margin-bottom:8px;">Đang tạo thiết kế với ${useGemini ? 'Gemini' : 'OpenAI'}...</p>
                    <p class="loading-desc" style="opacity:0.7;font-size:0.95rem;">${useGemini ? 'Gemini đang tái tạo thiết kế dựa trên template mẫu...' : 'Đang phân tích và tái tạo thiết kế...'}</p>
                </div>
            </div>
            <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
        `;
        document.body.appendChild(loadingAlert);

        try {
            let imageUrl = null;
            let usedPrompt = '';

            if (useGemini) {
                // ====== GEMINI + IMAGEN 3 - Two-step process for high quality images ======
                console.log('Using Gemini + Imagen 3 for generation...');

                // Get saved models from settings - PRIORITY: formData > localStorage
                // ⚠️ FIX: Modal passes imageModel via formData, not localStorage!
                const savedImageModel = formData.imageModel || localStorage.getItem('image_model') || localStorage.getItem('gemini_image_model') || 'gemini-2.0-flash-exp';
                const savedVisionModel = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';

                // ========== DEBUG: MODEL INFO ==========
                console.log('\n%c╔══════════════════════════════════════════════════════════════╗', 'color: #ff00ff; font-weight: bold;');
                console.log('%c║            🤖 MODEL CONFIGURATION DEBUG                      ║', 'color: #ff00ff; font-weight: bold;');
                console.log('%c╚══════════════════════════════════════════════════════════════╝', 'color: #ff00ff; font-weight: bold;');
                console.log('%c📦 formData.imageModel:', 'color: #00ff00; font-weight: bold;', formData.imageModel || '(not set)');
                console.log('%c💾 localStorage[image_model]:', 'color: #ffff00;', localStorage.getItem('image_model') || '(not set)');
                console.log('%c💾 localStorage[gemini_image_model]:', 'color: #ffff00;', localStorage.getItem('gemini_image_model') || '(not set)');
                console.log('%c✅ SELECTED IMAGE MODEL:', 'color: #00ff00; font-weight: bold; font-size: 14px;', savedImageModel);
                console.log('%c👁️ Vision model:', 'color: #00bfff;', savedVisionModel);

                // Check if model is optimal for image editing
                const optimalImageModels = ['gemini-2.0-flash-exp-image-generation', 'gemini-2.0-flash-exp'];
                const isOptimalModel = optimalImageModels.includes(savedImageModel);
                if (!isOptimalModel) {
                    console.log('%c⚠️ WARNING: Model may not be optimal for image editing!', 'color: #ff9900; font-weight: bold;');
                    console.log('%cRecommended models:', 'color: #ff9900;', optimalImageModels.join(', '));
                } else {
                    console.log('%c✅ Using optimal image editing model', 'color: #00ff00;');
                }
                console.log('%c════════════════════════════════════════════════════════════════\n', 'color: #ff00ff;');

                // List available models (async, don't wait)
                fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
                    .then(r => r.json())
                    .then(data => {
                        const imageModels = (data.models || [])
                            .filter(m => m.name.includes('gemini') || m.name.includes('imagen'))
                            .filter(m => m.supportedGenerationMethods?.includes('generateContent') || m.supportedGenerationMethods?.includes('predict'))
                            .map(m => ({
                                name: m.name.replace('models/', ''),
                                displayName: m.displayName,
                                methods: m.supportedGenerationMethods
                            }));
                        console.log('%cAvailable image-capable models:', 'color: #00bfff;', imageModels);
                    })
                    .catch(e => console.log('%cCannot list models:', 'color: #ff9900;', e.message));

                console.log('%c=============================================\n', 'color: #00ff00;');

                // Convert template image to base64
                let imageBase64 = template.image;
                if (template.image.includes('localhost') || template.image.startsWith('/') || template.image.startsWith('http')) {
                    console.log('Converting template image to Base64...');
                    imageBase64 = await imageUrlToBase64(template.image);
                }

                // Extract base64 data without prefix
                const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
                const mimeType = imageBase64.includes('data:') ? imageBase64.split(';')[0].split(':')[1] : 'image/png';

                // Build content changes description from FORMDATA (user input), not template defaults
                let contentChanges = '';

                // Collect uploaded images for reference
                const uploadedImageDescriptions = [];
                if (uploadedImages && Object.keys(uploadedImages).length > 0) {
                    console.log('Processing uploaded images:', Object.keys(uploadedImages));
                    for (const [slotId, imageData] of Object.entries(uploadedImages)) {
                        if (imageData && imageData.preview) {
                            const slot = template.imageSlots?.find(s => s.id === slotId);
                            const label = slot?.label || slotId;
                            uploadedImageDescriptions.push(`- ${label}: User has uploaded a custom image for this slot`);
                            console.log(`Image uploaded for slot: ${slotId} (${label})`);
                        }
                    }
                }

                // Extract TEXT values from formData - the user's actual input
                if (template.textSlots && template.textSlots.length > 0) {
                    contentChanges += 'TEXT CONTENT (replace original text with these):\n';
                    template.textSlots.forEach(slot => {
                        // Get user's input from formData, fallback to defaultValue
                        const userValue = formData[slot.id];
                        const value = userValue !== undefined && userValue !== '' ? userValue : slot.defaultValue;
                        console.log(`Text slot "${slot.label}" (${slot.id}): user input = "${userValue}", using = "${value}"`);
                        if (value) {
                            contentChanges += `- ${slot.label}: "${value}"\n`;
                        }
                    });
                }

                // Extract COLOR values from formData
                if (template.colorSlots && template.colorSlots.length > 0) {
                    contentChanges += '\nCOLOR SCHEME:\n';
                    template.colorSlots.forEach(slot => {
                        const userValue = formData[slot.id];
                        const value = userValue !== undefined && userValue !== '' ? userValue : slot.defaultValue;
                        console.log(`Color slot "${slot.label}" (${slot.id}): user input = "${userValue}", using = "${value}"`);
                        if (value) {
                            contentChanges += `- ${slot.label}: ${value}\n`;
                        }
                    });
                }

                // Add uploaded image descriptions
                if (uploadedImageDescriptions.length > 0) {
                    contentChanges += '\nIMAGES:\n';
                    contentChanges += uploadedImageDescriptions.join('\n') + '\n';
                }

                // ========== DEBUG: FINAL CONTENT CHANGES ==========
                console.log('\n%c========== 📝 FINAL CONTENT CHANGES ==========', 'color: #00ff00; font-weight: bold; font-size: 14px;');
                console.log('%cNội dung sẽ được thay thế vào template:', 'color: #ffff00;');
                console.log(contentChanges);
                console.log('%c===============================================\n', 'color: #00ff00;');

                // Check which model type to use
                const imagenGenerateModels = ['imagen-3.0-generate-002', 'imagen-3.0-generate-001', 'imagen-3.0-fast-generate-001', 'imagen-4.0-generate-001'];
                const imagenEditModels = ['imagen-3.0-capability-001', 'imagen-3.0-capability-preview-0409'];
                const directImageGenModels = ['gemini-2.0-flash-exp', 'gemini-2.0-flash-exp-image-generation', 'gemini-exp-image'];

                // ========== DEBUG: TEMPLATE IMAGE INFO ==========
                console.log('\n%c========== 🖼️ TEMPLATE IMAGE INFO ==========', 'color: #00bfff; font-weight: bold; font-size: 14px;');
                console.log('%cTemplate image source:', 'color: #ffff00;', template.image.substring(0, 100) + '...');
                console.log('%cBase64 length:', 'color: #ffff00;', base64Data.length, 'characters');
                console.log('%cMIME type:', 'color: #ffff00;', mimeType);
                console.log('%cValid base64:', 'color: #ffff00;', base64Data.length > 1000 ? '✅ YES' : '❌ NO (too short)');
                console.log('%c==============================================\n', 'color: #00bfff;');

                // ========== DEBUG: UPLOADED IMAGES INFO ==========
                if (uploadedImages && Object.keys(uploadedImages).length > 0) {
                    console.log('\n%c========== 📷 UPLOADED IMAGES INFO ==========', 'color: #ff69b4; font-weight: bold; font-size: 14px;');
                    for (const [slotId, imageData] of Object.entries(uploadedImages)) {
                        if (imageData && imageData.preview) {
                            const slot = template.imageSlots?.find(s => s.id === slotId);
                            const label = slot?.label || slotId;
                            const imgBase64 = imageData.preview.includes(',') ? imageData.preview.split(',')[1] : imageData.preview;
                            const imgMime = imageData.preview.includes('data:') ? imageData.preview.split(';')[0].split(':')[1] : 'unknown';
                            console.log(`%c${label} (${slotId}):`, 'color: #ffff00;');
                            console.log(`  - Base64 length: ${imgBase64.length} characters`);
                            console.log(`  - MIME type: ${imgMime}`);
                            console.log(`  - Valid: ${imgBase64.length > 1000 ? '✅ YES' : '❌ NO'}`);
                        }
                    }
                    console.log('%c==============================================\n', 'color: #ff69b4;');
                } else {
                    console.log('%c⚠️ No uploaded images found!', 'color: #ff9900; font-weight: bold;');
                }

                if (imagenEditModels.includes(savedImageModel)) {
                    // ====== IMAGEN 3 EDIT MODE - Best for template editing! ======
                    console.log('%c╔═══════════════════════════════════════════════════════════╗', 'color: #ff6b6b; font-weight: bold;');
                    console.log('%c║  🖼️ BRANCH: IMAGEN 3 EDIT MODE (imagen-3.0-capability-*)  ║', 'color: #ff6b6b; font-weight: bold;');
                    console.log('%c╚═══════════════════════════════════════════════════════════╝', 'color: #ff6b6b; font-weight: bold;');
                    updateLoadingMessage('Đang chỉnh sửa template với Imagen 3 Edit...');

                    // *** THÊM: Kiểm tra và log stylePrompt ***
                    const hasStylePrompt = template.stylePrompt && template.stylePrompt.trim().length > 50;
                    if (hasStylePrompt) {
                        console.log('%c✅ Imagen Edit: Có stylePrompt gốc', 'color: #00ff00; font-weight: bold;');
                    }

                    // Build edit prompt - specific for editing
                    // *** SỬA: Thêm ORIGINAL DESIGN PROMPT từ template ***
                    const editPrompt = `Edit this advertising poster image:

${hasStylePrompt ? `
ORIGINAL DESIGN CONTEXT (Template Creator's Intent):
${template.stylePrompt}

Based on the above design intent, apply the following changes:
` : ''}

${contentChanges}

Keep the exact same layout, background, and design elements. Only change the text content and replace any person/model with the provided reference images if available.`;

                    console.log('Imagen 3 Edit prompt:', editPrompt);

                    // Prepare the request with base image and optional mask
                    const editRequestBody = {
                        instances: [{
                            prompt: editPrompt,
                            image: {
                                bytesBase64Encoded: base64Data
                            }
                        }],
                        parameters: {
                            sampleCount: 1,
                            // Edit mode parameters
                            editMode: "inpainting-insert",
                            // Optionally add reference images
                        }
                    };

                    // Add reference images if available
                    if (uploadedImages && Object.keys(uploadedImages).length > 0) {
                        const refImages = [];
                        for (const [_slotId, imageData] of Object.entries(uploadedImages)) {
                            if (imageData && imageData.preview) {
                                const imgBase64 = imageData.preview.includes(',')
                                    ? imageData.preview.split(',')[1]
                                    : imageData.preview;
                                refImages.push({
                                    bytesBase64Encoded: imgBase64,
                                    referenceType: "REFERENCE_TYPE_SUBJECT"
                                });
                            }
                        }
                        if (refImages.length > 0) {
                            editRequestBody.instances[0].referenceImages = refImages;
                        }
                    }

                    const editResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${savedImageModel}:predict?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(editRequestBody)
                    });

                    const editData = await editResponse.json();
                    console.log('Imagen 3 Edit response:', editData);

                    if (editData.error) {
                        // If edit mode fails, fall back to Gemini 2.0 Flash
                        console.warn('Imagen 3 Edit failed, falling back to Gemini 2.0 Flash:', editData.error.message);
                        throw new Error(`Imagen 3 Edit: ${editData.error.message}. Thử chọn "Gemini 2.0 Flash" thay thế.`);
                    }

                    const predictions = editData.predictions || [];
                    if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
                        imageUrl = `data:image/png;base64,${predictions[0].bytesBase64Encoded}`;
                        console.log('✅ Imagen 3 Edit generated image successfully');
                        usedPrompt = editPrompt;
                    } else {
                        throw new Error('Imagen 3 Edit không trả về ảnh. Thử đổi model.');
                    }

                } else if (imagenGenerateModels.includes(savedImageModel)) {
                    // ====== TWO-STEP PROCESS: Gemini Vision → Imagen 3 ======
                    console.log('%c╔═══════════════════════════════════════════════════════════╗', 'color: #4ecdc4; font-weight: bold;');
                    console.log('%c║  🚀 BRANCH: IMAGEN 3 GENERATE (imagen-3.0-generate-*)     ║', 'color: #4ecdc4; font-weight: bold;');
                    console.log('%c║  ⚠️ NOTE: This model CANNOT edit images, only generate!   ║', 'color: #ffcc00; font-weight: bold;');
                    console.log('%c╚═══════════════════════════════════════════════════════════╝', 'color: #4ecdc4; font-weight: bold;');
                    updateLoadingMessage('Bước 1: Đang phân tích template...');

                    // *** THÊM: Kiểm tra và log stylePrompt ***
                    const hasStylePrompt = template.stylePrompt && template.stylePrompt.trim().length > 50;
                    if (hasStylePrompt) {
                        console.log('%c✅ Template có stylePrompt gốc:', 'color: #00ff00; font-weight: bold;');
                        console.log(template.stylePrompt.substring(0, 300) + '...');
                    } else {
                        console.log('%c⚠️ Template không có stylePrompt, sẽ phân tích từ ảnh', 'color: #ff9900;');
                    }

                    // STEP 1: Use Gemini Vision to analyze template and create detailed prompt
                    // *** SỬA: Thêm ORIGINAL DESIGN PROMPT từ template ***
                    const analysisPrompt = `Analyze this advertising poster/banner image in extreme detail and create an English prompt for Imagen 3 to recreate it.

${hasStylePrompt ? `
=== ORIGINAL DESIGN PROMPT FROM TEMPLATE CREATOR ===
${template.stylePrompt}
=== END ORIGINAL PROMPT ===

IMPORTANT: The above is the ORIGINAL prompt used to create this template. Use it as the PRIMARY source for understanding the design intent, layout, style, colors, and composition.
` : ''}

CRITICAL INSTRUCTION:
- IGNORE the actual text content visible in the image. 
- Use the NEW TEXT provided below for the description.
- The goal is to create a NEW image with the SAME LAYOUT/STYLE but DIFFERENT TEXT.

NEW CONTENT TO USE:
${contentChanges}

Create a detailed prompt that describes:
1. Overall style (modern, vintage, minimalist, luxury, medical, beauty, etc.)
2. Color palette (specific hex colors or color names)
3. Typography style and placement (Describe the font style/size, but specify the NEW TEXT content: "${contentChanges.replace(/\n/g, ', ')}")
4. Layout composition (where elements are positioned)
5. Background design and effects (gradients, textures, patterns)
6. Any models/people (gender, pose, clothing, expression)
7. Decorative elements (icons, shapes, lines, borders)
8. Lighting and mood

OUTPUT FORMAT:
Return ONLY the prompt text, nothing else. The prompt should be in English, highly detailed, and optimized for Imagen 3.
Start with the style, then describe each element precisely. Ensure the prompt explicitly states exactly what text to write.`;

                    const visionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${savedVisionModel}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: analysisPrompt },
                                    { inline_data: { mime_type: mimeType, data: base64Data } }
                                ]
                            }],
                            generationConfig: {
                                temperature: 0.7,
                                maxOutputTokens: 2048,
                            }
                        })
                    });

                    const visionData = await visionResponse.json();
                    console.log('Vision analysis response:', visionData);

                    if (visionData.error) {
                        throw new Error(`Gemini Vision Error: ${visionData.error.message}`);
                    }

                    const generatedPrompt = visionData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    console.log('Generated prompt for Imagen 3:', generatedPrompt);
                    usedPrompt = generatedPrompt;

                    if (!generatedPrompt) {
                        throw new Error('Gemini không thể phân tích template. Vui lòng thử lại.');
                    }

                    // STEP 2: Use Gemini 2.0 Flash Exp (as Imagen 3 Engine) to generate image
                    updateLoadingMessage('Bước 2: Đang tạo ảnh với Gemini/Imagen...');
                    console.log('Calling GenAI Image Model (Gemini 2.0 Flash Exp)...');

                    // Sử dụng Gemini 2.0 Flash Exp để vẽ ảnh từ prompt chi tiết
                    const finalPrompt = "Generate a high-quality advertising poster image based on this description:\n\n" + generatedPrompt;
                    // ⚠️ FIX: Use gemini-2.0-flash-exp-image-generation for image output
                    const imageGenUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`;
                    console.log('%c🚀 Calling API:', 'color: #00ff00;', imageGenUrl.split('?')[0]);

                    const imagenResponse = await fetch(imageGenUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{ text: finalPrompt }]
                            }],
                            generationConfig: {
                                responseModalities: ["TEXT", "IMAGE"], // ⚠️ CRITICAL: Required for image generation!
                                temperature: 0.4,
                                topP: 0.95,
                                topK: 40
                            }
                        })
                    });

                    const imagenData = await imagenResponse.json();
                    console.log('Image Generation Response:', imagenData);

                    if (imagenData.error) {
                        throw new Error(`Generation Error: ${imagenData.error.message}`);
                    }

                    // Extract image
                    const candidates = imagenData.candidates || [];
                    let textReason = '';

                    if (candidates.length > 0) {
                        // Check inline data
                        const parts = candidates[0].content?.parts || [];
                        const imgPart = parts.find(p => p.inline_data);
                        if (imgPart) {
                            imageUrl = `data:${imgPart.inline_data.mime_type};base64,${imgPart.inline_data.data}`;
                            console.log('✅ Generated image successfully');
                        } else {
                            // If no image, looks for text reason
                            const textPart = parts.find(p => p.text);
                            if (textPart) textReason = textPart.text;
                        }
                    }

                    if (!imageUrl) {
                        console.warn('Gemini 2.0 response without image:', imagenData);
                        const reason = textReason ? `: "${textReason}"` : '.';
                        throw new Error(`Không thể tạo ảnh${reason} (Model có thể từ chối do chính sách an toàn hoặc prompt quá phức tạp).`);
                    }

                } else if (directImageGenModels.includes(savedImageModel)) {
                    // ====== GEMINI DIRECT GENERATION (Improved Prompt Engineering) ======
                    console.log('%c╔═══════════════════════════════════════════════════════════╗', 'color: #00ff00; font-weight: bold;');
                    console.log('%c║  ✨ BRANCH: GEMINI DIRECT GENERATION (gemini-2.0-flash-*) ║', 'color: #00ff00; font-weight: bold;');
                    console.log('%c║  ✅ This model CAN edit images with responseModalities!   ║', 'color: #00ff00; font-weight: bold;');
                    console.log('%c╚═══════════════════════════════════════════════════════════╝', 'color: #00ff00; font-weight: bold;');
                    console.log('Selected model:', savedImageModel);
                    updateLoadingMessage('Gemini đang xử lý hình ảnh (có User Data)...');

                    // 1. Thu thập dữ liệu User Input (Text)
                    const userTextInputs = [];
                    if (template.textSlots && template.textSlots.length > 0) {
                        template.textSlots.forEach(slot => {
                            const val = formData[slot.id] || slot.defaultValue;
                            if (val) {
                                userTextInputs.push({ label: slot.label, value: val });
                            }
                        });
                    }

                    // 2. Thu thập dữ liệu User Input (Images)
                    const userImagesParts = [];
                    let imagePromptInstructions = "";

                    if (uploadedImages && Object.keys(uploadedImages).length > 0) {
                        let imgIndex = 0;
                        for (const [slotId, imageData] of Object.entries(uploadedImages)) {
                            if (imageData && imageData.preview) {
                                const slot = template.imageSlots?.find(s => s.id === slotId);
                                const label = slot?.label || slotId;
                                const imgLetter = String.fromCharCode(66 + imgIndex); // B, C, D...

                                // NEW STRATEGY: Identity vs Context
                                imagePromptInstructions += `   - FACE REFERENCE: Use ONLY the face/head from User Image ${imgLetter}. Ignore the clothes/background in this image.\n`;
                                imagePromptInstructions += `   - TARGET CHARACTER: This face belongs to the SINGLE Doctor character in the final poster.\n`;

                                // Chuẩn bị part ảnh
                                const imgBase64 = imageData.preview.includes(',') ? imageData.preview.split(',')[1] : imageData.preview;
                                const imgMime = imageData.preview.includes('data:') ? imageData.preview.split(';')[0].split(':')[1] : 'image/png';
                                userImagesParts.push({
                                    inline_data: { mime_type: imgMime, data: imgBase64 }
                                });
                                imgIndex++;
                            }
                        }
                    }

                    // 3. Xây dựng Prompt Template-based (Structured Prompt)
                    // *** CRITICAL: Sử dụng stylePrompt gốc từ template nếu có ***
                    const hasStylePrompt = template.stylePrompt && template.stylePrompt.trim().length > 50;

                    let prompt = `ROLE: Professional AI Photographer & Image Compositor.\n`;
                    prompt += `TASK: Create a HIGH-REALISM commercial image (Background + Character) based on the Reference Image A.\n`;
                    prompt += `CRITICAL GOAL: The output must be a CLEAN IMAGE with NO TEXT, NO LOGOS, NO WATERMARKS. (Text will be added manually later).\n\n`;

                    prompt += `--- INPUT SOURCE KEY ---\n`;
                    prompt += `1. IMAGE A (Reference): Defines the SCENE, OUTFIT, POSE, LIGHTING, and COMPOSITION.\n`;
                    prompt += `2. IMAGE B (Identity): Defines the FACE of the main character.\n\n`;

                    // *** STYLE BOOSTER (User's Quality Standard) ***
                    const MEDICAL_STYLE_BOOSTER = `
                    Vertical poster 4:5. Futuristic medical laboratory background. White, silver and light cyan color palette.
                    Soft glowing medical lighting. A clean 3D medical environment with subtle circular energy rings.
                    One Asian female dermatologist, upper body. Light gray-blue medical uniform. Blue surgical cap.
                    Professional, confident expression. Soft lighting on face. Standing naturally, integrated into background.
                    `;

                    if (hasStylePrompt) {
                        prompt += `--- SCENE & STYLE DESCRIPTION (From Template) ---\n`;
                        prompt += `${template.stylePrompt}\n`;
                        prompt += `INSTRUCTION: Use the above description as the specific layout guide, but apply the High-End aesthetic defined below.\n`;
                    }

                    prompt += `--- AESTHETIC STANDARD (MUST FOLLOW) ---\n`;
                    prompt += `${MEDICAL_STYLE_BOOSTER}\n`;
                    prompt += `CRITICAL: The final image must match this high-end, clean, futuristic medical aesthetic.\n\n`;

                    prompt += `--- COMPOSITION INSTRUCTIONS (STRICT) ---\n`;
                    prompt += `1. THE SUBJECT (Identity Merge):\n`;
                    prompt += `   - USE THE EXACT face from Image B. Keep the same facial features, age, and ethnicity.\n`;
                    prompt += `   - BUT place this face onto the BODY/OUTFIT of Image A (Gray-Blue Scrubs + Blue Cap).\n`;
                    prompt += `   - POSE: Must match the pose in Image A exactly.\n`;
                    prompt += `2. THE BACKGROUND:\n`;
                    prompt += `   - Recreate the Futuristic 3D Lab Cylindrical Machine details from Image A.\n`;
                    prompt += `   - Lighting: Professional Studio Lighting (Match Image A).\n`;

                    prompt += `\n--- COLOR OVERRIDES ---\n`;
                    if (hasColorChanges) {
                        if (template.colorSlots && template.colorSlots.length > 0) {
                            template.colorSlots.forEach(slot => {
                                const userValue = formData[slot.id];
                                if (userValue) prompt += `   - CHANGE "${slot.label}" to: ${userValue}\n`;
                            });
                        }
                    } else {
                        prompt += `   (None. Keep original template colors).\n`;
                    }

                    prompt += `\n*** FINAL CHECK: Is the image clean? Is there NO TEXT? Does the character look like Image B wearing Image A's clothes? ***\n`; prompt += `\n*** FINAL CHECK: Clean Background? No Text? Correct Face? ***\n`;

                    console.log('Final Gemini Prompt:', prompt);

                    // 4. Build Request
                    const requestParts = [{ text: prompt }];

                    // Template (Image A)
                    requestParts.push({
                        inline_data: { mime_type: mimeType, data: base64Data }
                    });

                    // User Images (Image B...)
                    if (userImagesParts.length > 0) {
                        requestParts.push(...userImagesParts);
                    }

                    // DEBUG PAYLOAD
                    console.log('%c[DEBUG] Payload sent to Gemini:', 'color: orange; font-weight: bold;');
                    console.log('Text Content:', userTextInputs);
                    console.log('Images Count:', userImagesParts.length);
                    console.log('Prompt Length:', prompt.length);

                    // 5. Call API
                    // ⚠️ FIX: Use standard gemini-2.0-flash-exp for multimodal generation
                    const modelName = savedImageModel.includes('flash') ? 'gemini-2.0-flash-exp' : savedImageModel;
                    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                    console.log('%c🚀 Calling API:', 'color: #00ff00;', geminiUrl.split('?')[0]);

                    const response = await fetch(geminiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: requestParts }],
                            generationConfig: {
                                responseModalities: ["TEXT", "IMAGE"], // ⚠️ CRITICAL: Required to make Gemini return image!
                                temperature: 0.1, // LOW TEMP for strict adherence to reference
                                topP: 0.95,
                                topK: 40
                            }
                        })
                    });

                    const geminiData = await response.json();

                    if (geminiData.error) {
                        throw new Error(`Gemini API Error: ${geminiData.error.message}`);
                    }

                    // Extract Image
                    let foundImage = false;
                    let textReason = '';

                    if (geminiData.candidates && geminiData.candidates.length > 0) {
                        const parts = geminiData.candidates[0].content.parts || [];
                        for (const part of parts) {
                            if (part.inline_data) {
                                imageUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
                                foundImage = true;
                                console.log('✅ Received image from Gemini.');
                                break;
                            }
                            if (part.text) {
                                textReason += part.text;
                            }
                        }
                    }

                    if (!foundImage) {
                        console.warn('No image in response. Text:', textReason);
                        throw new Error('Gemini không trả về ảnh. Lý do (nếu có): ' + textReason.substring(0, 100));
                    }
                } else {
                    // Fallback to Gemini image generation model
                    console.log('Unknown model, falling back to gemini-2.0-flash-preview-image-generation');
                    const geminiPrompt = `Tái tạo poster quảng cáo này với nội dung mới:\n${contentChanges}\n\nGiữ nguyên layout, chỉ đổi text. Tạo ảnh ngay.`;
                    usedPrompt = geminiPrompt;

                    const fallbackResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: geminiPrompt },
                                    { inline_data: { mime_type: mimeType, data: base64Data } }
                                ]
                            }],
                            generationConfig: {
                                responseModalities: ["TEXT", "IMAGE"],
                                temperature: 0.4,
                            }
                        })
                    });

                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData.error) throw new Error(`Gemini Error: ${fallbackData.error.message}`);

                    for (const candidate of (fallbackData.candidates || [])) {
                        for (const part of (candidate.content?.parts || [])) {
                            if (part.inlineData) {
                                imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                                console.log('✅ Fallback Gemini generated image');
                                break;
                            }
                        }
                    }

                    if (!imageUrl) throw new Error('Không thể tạo ảnh. Vui lòng thử lại.');
                }

            } else {
                // ====== OPENAI DALL-E (Fallback) ======
                console.log('Using OpenAI DALL-E for generation...');

                // Convert image to Base64 for vision
                let templateImageForVision = template.image;
                if (template.image.includes('localhost') || template.image.startsWith('/')) {
                    templateImageForVision = await imageUrlToBase64(template.image);
                }

                // Build prompt with user's actual input values
                let userContentText = `Phân tích và tái tạo ảnh quảng cáo này với nội dung mới:`;

                if (template.textSlots && template.textSlots.length > 0) {
                    userContentText += '\n\nTHAY ĐỔI TEXT:';
                    template.textSlots.forEach(slot => {
                        const userValue = formData[slot.id];
                        const value = userValue !== undefined && userValue !== '' ? userValue : slot.defaultValue;
                        console.log(`OpenAI - Text slot "${slot.label}" (${slot.id}): user input = "${userValue}", using = "${value}"`);
                        if (value) userContentText += `\n- ${slot.label}: "${value}"`;
                    });
                }

                if (template.colorSlots && template.colorSlots.length > 0) {
                    userContentText += '\n\nMÀU SẮC:';
                    template.colorSlots.forEach(slot => {
                        const userValue = formData[slot.id];
                        const value = userValue !== undefined && userValue !== '' ? userValue : slot.defaultValue;
                        if (value) userContentText += `\n- ${slot.label}: ${value}`;
                    });
                }

                userContentText += '\n\nTạo prompt DALL-E 3 chi tiết để tái tạo CHÍNH XÁC layout này. Output chỉ prompt, không giải thích.';

                // Build content array with template and uploaded images
                const contentParts = [
                    { type: 'text', text: userContentText },
                    { type: 'image_url', image_url: { url: templateImageForVision, detail: 'high' } }
                ];

                // Add uploaded images to the vision request
                if (uploadedImages && Object.keys(uploadedImages).length > 0) {
                    console.log('Adding user-uploaded images to OpenAI vision request...');
                    for (const [slotId, imageData] of Object.entries(uploadedImages)) {
                        if (imageData && imageData.preview) {
                            const slot = template.imageSlots?.find(s => s.id === slotId);
                            const label = slot?.label || slotId;
                            contentParts.push({ type: 'text', text: `\n[Reference image for "${label}" - incorporate this into the design:]` });
                            contentParts.push({ type: 'image_url', image_url: { url: imageData.preview, detail: 'high' } });
                            console.log(`Added uploaded image for OpenAI: ${label}`);
                        }
                    }
                }

                // Step 1: Vision analysis
                const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [{
                            role: 'user',
                            content: contentParts
                        }],
                        max_tokens: 1500
                    })
                });

                const visionData = await visionResponse.json();
                if (visionData.error) throw new Error(visionData.error.message);

                let enhancedPrompt = visionData.choices?.[0]?.message?.content || 'Professional advertising poster design';
                enhancedPrompt += '\n\nIMPORTANT: High-quality, photorealistic, clear readable text, commercial-ready design. 1024x1024 format.';
                usedPrompt = enhancedPrompt;

                updateLoadingMessage('Đang tạo ảnh...');

                // Step 2: DALL-E generation
                const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'dall-e-3',
                        prompt: enhancedPrompt,
                        n: 1,
                        size: '1024x1024',
                        quality: 'hd',
                        style: 'vivid'
                    })
                });

                const imageData = await imageResponse.json();
                if (imageData.error) throw new Error(imageData.error.message);
                imageUrl = imageData.data?.[0]?.url;
            }

            // Remove loading
            document.getElementById('generating-alert')?.remove();

            if (imageUrl) {
                // Save to Server first (to avoid localStorage quota limits)
                let savedDesignFromServer = null;
                try {
                    console.log('Saving design to server...');
                    const serverResponse = await designsApi.save({
                        templateId: template.id,
                        image: imageUrl, // Send base64 to server
                        formData: {
                            prompt: usedPrompt,
                            provider: useGemini ? 'gemini' : 'openai',
                            originalFormData: formData
                        }
                    });

                    savedDesignFromServer = serverResponse;
                    console.log('✅ Design saved to server:', savedDesignFromServer);
                } catch (serverError) {
                    console.error('Failed to save to server:', serverError);
                    // Continue to try local storage as fallback/hybrid
                }

                // Update Local Storage for Frontend Compatibility
                // We use the Server URL if available, otherwise base64 (which might fail quota)
                const displayImageUrl = savedDesignFromServer
                    ? getImageUrl(savedDesignFromServer.image_path)
                    : imageUrl;

                try {
                    const myDesigns = JSON.parse(localStorage.getItem('my_designs') || '[]');

                    const newDesign = {
                        id: savedDesignFromServer ? savedDesignFromServer.id : Date.now(),
                        templateId: template.id,
                        templateTitle: template.title,
                        templateImage: template.image,
                        // Fix regarding user error: NEVER use the placeholder string '[Image generated...]'
                        // Use the valid Server URL or the Base64 data directly.
                        imageUrl: displayImageUrl,
                        prompt: usedPrompt.substring(0, 500),
                        provider: useGemini ? 'gemini' : 'openai',
                        createdAt: new Date().toISOString()
                    };

                    myDesigns.unshift(newDesign);

                    // Keep only last 20 designs
                    const trimmedDesigns = myDesigns.slice(0, 20);

                    localStorage.setItem('my_designs', JSON.stringify(trimmedDesigns));
                } catch (storageError) {
                    console.warn('Storage quota exceeded for localStorage even with Server URL?', storageError);
                    alert('Lưu ý: Không thể lưu vào lịch sử trình duyệt (LocalStorage đầy), nhưng ảnh đã được lưu trên Server.');
                }

                // Deduct credits
                const currentCredits = parseInt(localStorage.getItem('user_credits') || '100');
                localStorage.setItem('user_credits', Math.max(0, currentCredits - 10).toString());

                // Show success
                // Show success
                alert(`✅ Tạo thiết kế thành công với ${useGemini ? 'Gemini' : 'OpenAI'}!\n\nThông tin thiết kế đã được lưu vào "Thiết Kế Của Tôi".`);

                // Open image - for Gemini base64, create blob URL
                if (imageUrl.startsWith('data:')) {
                    const blob = await (await fetch(imageUrl)).blob();
                    const blobUrl = URL.createObjectURL(blob);
                    window.open(blobUrl, '_blank');
                } else {
                    window.open(imageUrl, '_blank');
                }

                handleCloseModal();
            } else {
                alert('Không nhận được ảnh từ API. Vui lòng thử lại.');
            }
        } catch (error) {
            document.getElementById('generating-alert')?.remove();
            console.error('Generate error:', error);
            alert('Lỗi khi tạo ảnh: ' + error.message);
        }
    };

    const filteredTemplates = allTemplates.filter((template) => {
        const matchesSearch = template.title && template.title.toLowerCase().includes((searchValue || '').toLowerCase());

        // Handle favorites category
        if (activeCategory === 'favorites') {
            return matchesSearch && favorites.includes(template.id);
        }

        // Default to 'all' logic if no active category
        if (!activeCategory || activeCategory === 'all') {
            return matchesSearch;
        }

        // Check both category and category_id fields for matching
        // Convert both to string for safe comparison
        const templateCategory = String(template.category || template.category_id || '');
        const targetCategory = String(activeCategory);

        return matchesSearch && templateCategory === targetCategory;
    });

    // Get title based on category
    const getTitle = () => {
        if (activeCategory === 'favorites') {
            return 'Mẫu Yêu Thích';
        }
        return 'Thư Viện Template';
    };

    const getSubtitle = () => {
        if (activeCategory === 'favorites') {
            return `${filteredTemplates.length} mẫu đã lưu`;
        }
        return 'Chọn template và tùy chỉnh để tạo thiết kế của bạn';
    };

    return (
        <div className="gallery-container">
            {/* Title Section */}
            <div className="gallery-header">
                <h1 className="gallery-title">{getTitle()}</h1>
                <p className="gallery-subtitle">{getSubtitle()}</p>
            </div>

            {/* Templates Grid */}
            <div className="templates-grid">
                {filteredTemplates.map((template) => (
                    <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={handleSelectTemplate}
                        onToggleFavorite={handleToggleFavorite}
                        isFavorite={favorites.includes(template.id)}
                    />
                ))}
            </div>

            {filteredTemplates.length === 0 && (
                <div className="no-results">
                    {activeCategory === 'favorites' ? (
                        <>
                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.3, marginBottom: '16px' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                            <p>Chưa có mẫu yêu thích nào</p>
                            <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Click vào ngôi sao trên template để thêm vào yêu thích</span>
                        </>
                    ) : (
                        <p>Không tìm thấy template nào</p>
                    )}
                </div>
            )}

            {/* Template Modal */}
            <TemplateModal
                template={selectedTemplate}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onGenerate={handleGenerate}
            />

            {/* Canvas Preview Modal */}
            {showCanvasPreview && canvasPreviewData && (
                <CanvasPreview
                    template={canvasPreviewData.template}
                    textContent={canvasPreviewData.textContent}
                    imageContent={canvasPreviewData.imageContent}
                    colorContent={canvasPreviewData.colorContent}
                    onClose={() => {
                        setShowCanvasPreview(false);
                        setCanvasPreviewData(null);
                    }}
                    onDownload={(_imageData) => {
                        console.log('Design downloaded!');
                    }}
                />
            )}
        </div>
    );
}
