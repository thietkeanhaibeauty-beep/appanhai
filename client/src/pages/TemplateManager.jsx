import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { templatesApi, categoriesApi, getImageUrl } from '../services/api';

export default function TemplateManager() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // State
    const [step, setStep] = useState(1);
    const [_imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [prompt, setPrompt] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');
    const [category, setCategory] = useState('banner');

    // Generated slots from AI analysis
    const [textSlots, setTextSlots] = useState([]);
    const [imageSlots, setImageSlots] = useState([]);
    const [colorSlots, setColorSlots] = useState([]);

    // API Settings
    const [showSettings, setShowSettings] = useState(false);
    const [apiProvider, setApiProvider] = useState(localStorage.getItem('api_provider') || 'openai');
    const [openaiKey, setOpenaiKey] = useState(localStorage.getItem('openai_api_key') || '');
    const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '');
    const [openaiModel, setOpenaiModel] = useState(localStorage.getItem('openai_model') || 'gpt-4o');
    const [geminiModel, setGeminiModel] = useState(localStorage.getItem('gemini_model') || 'gemini-1.5-flash');
    const [imageModel, setImageModel] = useState(localStorage.getItem('image_model') || 'dall-e-3');
    const [apiStatus, setApiStatus] = useState({ checking: false, result: null });

    // === NEW: Tab and Management States ===
    const [activeTab, setActiveTab] = useState('create'); // 'create', 'manage', 'categories'
    const [savedTemplates, setSavedTemplates] = useState([]);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    // Categories management
    const [categories, setCategories] = useState([
        { id: 'banner', name: 'Banner', icon: '🖼️' },
        { id: 'poster', name: 'Poster', icon: '📄' },
        { id: 'social', name: 'Social Media', icon: '📱' },
        { id: 'product', name: 'Sản phẩm', icon: '🛍️' },
    ]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
    const [editingCategory, setEditingCategory] = useState(null);
    const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(null);

    // Model Options for Analysis
    const openaiModels = [
        { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4-vision-preview', label: 'GPT-4 Vision' },
    ];

    const geminiModels = [
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast)' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Powerful)' },
        { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Newest)' },
    ];

    // Image Generation Models
    const imageModels = {
        openai: [
            { value: 'dall-e-3', label: 'DALL-E 3 (Best Quality)' },
            { value: 'dall-e-2', label: 'DALL-E 2 (Faster)' },
            { value: 'gpt-image-1', label: 'GPT Image 1' },
        ],
        gemini: [
            { value: 'imagen-3.0-generate-001', label: 'Imagen 3 (Latest)' },
            { value: 'imagen-2.0-generate-001', label: 'Imagen 2' },
            { value: 'nano-bana', label: '🍌 Nano Bana' },
        ],
    };

    // Hàm nén ảnh để giảm kích thước lưu trữ
    const compressImage = (file, maxWidth = 800, quality = 0.7) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Resize nếu ảnh quá lớn
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to compressed JPEG
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedDataUrl);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageDrop = async (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files[0] || e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);

            // Nén ảnh trước khi preview và lưu
            try {
                const compressedImage = await compressImage(file, 800, 0.7);
                setImagePreview(compressedImage);
            } catch (_error) {
                // Fallback nếu nén lỗi
                const reader = new FileReader();
                reader.onloadend = () => setImagePreview(reader.result);
                reader.readAsDataURL(file);
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // Test API Key
    const testApiKey = async () => {
        const apiKey = apiProvider === 'openai' ? openaiKey : geminiKey;

        if (!apiKey) {
            setApiStatus({ checking: false, result: 'error', message: 'Vui lòng nhập API Key!' });
            return;
        }

        setApiStatus({ checking: true, result: null });

        try {
            if (apiProvider === 'openai') {
                const response = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (response.ok) {
                    setApiStatus({ checking: false, result: 'success', message: 'API Key hợp lệ!' });
                } else {
                    const data = await response.json();
                    setApiStatus({ checking: false, result: 'error', message: data.error?.message || 'API Key không hợp lệ!' });
                }
            } else {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                if (response.ok) {
                    setApiStatus({ checking: false, result: 'success', message: 'API Key hợp lệ!' });
                } else {
                    const data = await response.json();
                    setApiStatus({ checking: false, result: 'error', message: data.error?.message || 'API Key không hợp lệ!' });
                }
            }
        } catch (error) {
            setApiStatus({ checking: false, result: 'error', message: 'Lỗi kết nối: ' + error.message });
        }
    };

    const saveApiKeys = () => {
        localStorage.setItem('openai_api_key', openaiKey);
        localStorage.setItem('gemini_api_key', geminiKey);
        localStorage.setItem('api_provider', apiProvider);
        localStorage.setItem('openai_model', openaiModel);
        localStorage.setItem('gemini_model', geminiModel);
        localStorage.setItem('image_model', imageModel);
        setShowSettings(false);
        setApiStatus({ checking: false, result: null });
    };

    const analyzeWithAI = async () => {
        const apiKey = apiProvider === 'openai' ? openaiKey : geminiKey;

        if (!apiKey) {
            alert('Vui lòng cấu hình API Key trong Cài đặt!');
            setShowSettings(true);
            return;
        }

        if (!imagePreview || !prompt.trim()) {
            alert('Vui lòng tải ảnh và nhập prompt!');
            return;
        }

        setIsAnalyzing(true);
        setStep(2); // Move to step 2 while analyzing

        try {
            let analysisResult;

            if (apiProvider === 'openai') {
                analysisResult = await analyzeWithOpenAI(imagePreview, prompt, apiKey);
            } else {
                analysisResult = await analyzeWithGemini(imagePreview, prompt, apiKey);
            }

            // Parse the result and create slots
            if (analysisResult) {
                setTextSlots(analysisResult.textSlots || []);
                setImageSlots(analysisResult.imageSlots || []);
                setColorSlots(analysisResult.colorSlots || []);
                setStep(3); // Move to step 3 after successful analysis
            }
        } catch (error) {
            console.error('Analysis error:', error);
            alert('Lỗi phân tích: ' + error.message);
            setStep(1); // Go back to step 1 on error
        } finally {
            setIsAnalyzing(false);
        }
    };

    const analyzeWithOpenAI = async (image, promptText, apiKey) => {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: openaiModel,
                messages: [
                    {
                        role: 'system',
                        content: `Bạn là AI chuyên gia phân tích thiết kế quảng cáo/banner. Nhiệm vụ:

1. PHÂN TÍCH ẢNH RẤT CHI TIẾT:
   - Đọc TẤT CẢ text trong ảnh (tiêu đề lớn, slogan, thông tin, số liệu, địa chỉ, SĐT...)
   - Xác định CHÍNH XÁC màu sắc bằng mã HEX (#RRGGBB):
     * Màu nền chính (background)
     * Màu nền phụ/gradient (nếu có)
     * Màu text chính (tiêu đề)
     * Màu text phụ (nội dung)
     * Màu accent/nhấn mạnh
     * Màu viền/border
   - Xác định các vùng ảnh: người mẫu, sản phẩm, logo, icon...
   - Nhận diện hiệu ứng: gradient, shadow, glow, pattern...

2. SO SÁNH VỚI PROMPT để hiểu ý đồ thiết kế

3. TRẢ VỀ JSON CHÍNH XÁC:
{
  "textSlots": [
    {"id": "text_1", "label": "Tiêu đề chính", "placeholder": "VD: Khuyến mãi HOT", "defaultValue": "Giá trị đọc từ ảnh"}
  ],
  "imageSlots": [
    {"id": "img_1", "label": "Ảnh người mẫu", "description": "Ảnh chân dung, nền trong suốt hoặc studio"}
  ],
  "colorSlots": [
    {"id": "bg_main", "label": "Màu nền chính", "defaultValue": "#004D52"},
    {"id": "bg_secondary", "label": "Màu nền phụ", "defaultValue": "#003338"},
    {"id": "text_main", "label": "Màu text chính", "defaultValue": "#E5CBA3"},
    {"id": "text_secondary", "label": "Màu text phụ", "defaultValue": "#FFFFFF"},
    {"id": "accent", "label": "Màu nhấn mạnh", "defaultValue": "#FFD700"}
  ]
}

LƯU Ý QUAN TRỌNG:
- Mã màu HEX phải CHÍNH XÁC từ ảnh (dùng color picker ảo)
- Nếu có gradient, tách thành 2 màu riêng biệt
- Liệt kê ĐẦY ĐỦ tất cả màu quan trọng trong thiết kế
- ID phải unique và mô tả rõ mục đích`
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Phân tích ảnh quảng cáo này và prompt sau để trích xuất các thành phần tùy chỉnh:\n\nPrompt gốc: ${promptText}\n\nHãy phân tích và trả về JSON với các slots.`
                            },
                            {
                                type: 'image_url',
                                image_url: { url: image }
                            }
                        ]
                    }
                ],
                max_tokens: 4000
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const content = data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Không thể phân tích response từ AI');
    };

    const analyzeWithGemini = async (image, promptText, apiKey) => {
        const base64Data = image.split(',')[1];
        const mimeType = image.split(';')[0].split(':')[1];

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        {
                            text: `Bạn là AI chuyên gia phân tích thiết kế quảng cáo/banner. 

PROMPT GỐC TỪ NGƯỜI DÙNG: ${promptText}

NHIỆM VỤ PHÂN TÍCH ẢNH:

1. ĐỌC TẤT CẢ TEXT trong ảnh:
   - Tiêu đề lớn, slogan, tagline
   - Số liệu (%, giá, khuyến mãi)
   - Thông tin liên hệ (SĐT, địa chỉ, website)
   - Text nhỏ, ghi chú

2. XÁC ĐỊNH MÀU SẮC CHÍNH XÁC (mã HEX):
   - Màu nền chính của thiết kế
   - Màu nền phụ/gradient (nếu có)
   - Màu của text tiêu đề
   - Màu của text nội dung
   - Màu accent/nhấn mạnh (border, button, icon...)
   - Màu shadow/hiệu ứng

3. XÁC ĐỊNH VÙNG ẢNH:
   - Ảnh người (model, chân dung)
   - Ảnh sản phẩm
   - Logo, icon
   - Background pattern

4. SO SÁNH với prompt người dùng để hiểu đúng ý đồ

TRẢ VỀ JSON CHÍNH XÁC (CHỈ JSON, KHÔNG TEXT KHÁC):
{
  "textSlots": [
    {"id": "text_1", "label": "Tiêu đề chính", "placeholder": "Nhập tiêu đề...", "defaultValue": "Giá trị đọc từ ảnh"}
  ],
  "imageSlots": [
    {"id": "img_1", "label": "Ảnh người mẫu", "description": "Mô tả chi tiết"}
  ],
  "colorSlots": [
    {"id": "bg_main", "label": "Màu nền chính", "defaultValue": "#XXXXXX"},
    {"id": "bg_gradient", "label": "Màu gradient", "defaultValue": "#XXXXXX"},
    {"id": "text_title", "label": "Màu tiêu đề", "defaultValue": "#XXXXXX"},
    {"id": "text_body", "label": "Màu text nội dung", "defaultValue": "#XXXXXX"},
    {"id": "accent", "label": "Màu nhấn mạnh", "defaultValue": "#XXXXXX"}
  ]
}

CHÚ Ý: Mã màu HEX phải CHÍNH XÁC từ ảnh thực tế!`
                        },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const content = data.candidates[0].content.parts[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Không thể phân tích response từ Gemini');
    };

    const [isSaving, setIsSaving] = useState(false);
    const [serverOnline, setServerOnline] = useState(true);

    const saveTemplate = async () => {
        // Validation
        if (!templateName.trim()) {
            alert('Vui lòng nhập tên template!');
            return;
        }

        if (!imagePreview) {
            alert('Vui lòng tải ảnh mẫu!');
            return;
        }

        setIsSaving(true);

        try {
            // Clone slots để tránh reference issues
            const cleanTextSlots = textSlots.map(s => ({
                id: s.id,
                label: s.label || '',
                placeholder: s.placeholder || '',
                defaultValue: s.defaultValue || ''
            }));

            const cleanImageSlots = imageSlots.map(s => ({
                id: s.id,
                label: s.label || '',
                description: s.description || ''
            }));

            const cleanColorSlots = colorSlots.map(s => ({
                id: s.id,
                label: s.label || '',
                defaultValue: s.defaultValue || '#000000'
            }));

            const templateData = {
                title: templateName.trim(),
                description: templateDescription.trim(),
                category: category,
                image: imagePreview,
                stylePrompt: prompt.substring(0, 2000),
                textSlots: cleanTextSlots,
                imageSlots: cleanImageSlots,
                colorSlots: cleanColorSlots,
            };

            // Try to save to Backend API first
            if (serverOnline) {
                try {
                    const savedTemplate = await templatesApi.create(templateData);
                    console.log('✅ Template saved to server:', savedTemplate);

                    // Reload templates from server
                    const templates = await templatesApi.getAll();
                    setSavedTemplates(templates);

                    alert('✅ Đã lưu template thành công!');
                    navigate('/');
                    return;
                } catch (apiError) {
                    console.error('❌ Server save failed:', apiError);
                    alert('❌ Lỗi lưu template: ' + apiError.message + '\n\nVui lòng kiểm tra server đang chạy!');
                }
            } else {
                alert('❌ Server offline! Vui lòng khởi động server trước khi lưu.');
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Lỗi khi lưu template: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const addTextSlot = () => {
        setTextSlots([...textSlots, {
            id: `text_${Date.now()}`,
            label: 'Text mới',
            placeholder: 'Nhập nội dung...',
            defaultValue: ''
        }]);
    };

    const addImageSlot = () => {
        setImageSlots([...imageSlots, {
            id: `img_${Date.now()}`,
            label: 'Ảnh mới',
            description: 'Tải ảnh lên'
        }]);
    };

    const addColorSlot = () => {
        setColorSlots([...colorSlots, {
            id: `color_${Date.now()}`,
            label: 'Màu mới',
            defaultValue: '#3b82f6'
        }]);
    };

    const removeSlot = (type, id) => {
        if (type === 'text') setTextSlots(textSlots.filter(s => s.id !== id));
        if (type === 'image') setImageSlots(imageSlots.filter(s => s.id !== id));
        if (type === 'color') setColorSlots(colorSlots.filter(s => s.id !== id));
    };

    const updateSlot = (type, id, field, value) => {
        if (type === 'text') {
            setTextSlots(textSlots.map(s => s.id === id ? { ...s, [field]: value } : s));
        }
        if (type === 'image') {
            setImageSlots(imageSlots.map(s => s.id === id ? { ...s, [field]: value } : s));
        }
        if (type === 'color') {
            setColorSlots(colorSlots.map(s => s.id === id ? { ...s, [field]: value } : s));
        }
    };


    // === Load templates and categories from Server first, fallback to localStorage ===
    useEffect(() => {
        const loadData = async () => {
            // Try loading from server first
            try {
                const [serverTemplates, serverCategories] = await Promise.all([
                    templatesApi.getAll(),
                    categoriesApi.getAll()
                ]);

                // Transform server data to match expected format
                const formattedTemplates = serverTemplates.map(t => ({
                    ...t,
                    image: t.image_path ? getImageUrl(t.image_path) : t.image,
                    textSlots: t.textSlots || [],
                    imageSlots: t.imageSlots || [],
                    colorSlots: t.colorSlots || [],
                }));

                setSavedTemplates(formattedTemplates);
                setServerOnline(true);
                console.log('✅ Loaded from server:', formattedTemplates.length, 'templates');

                if (serverCategories && serverCategories.length > 0) {
                    setCategories(serverCategories);
                    if (!serverCategories.find(c => c.id === category)) {
                        setCategory(serverCategories[0].id);
                    }
                }
            } catch (error) {
                console.error('❌ Server offline:', error);
                setServerOnline(false);
                setSavedTemplates([]);
                // Keep default categories
            }
        };

        loadData();
    }, []);

    // === NEW: Template Management Functions ===
    const handleEditTemplate = (template) => {
        setEditingTemplate(template);
        setTemplateName(template.title);
        setTemplateDescription(template.description || '');
        setCategory(template.category);
        setImagePreview(template.image);
        setTextSlots(template.textSlots || []);
        setImageSlots(template.imageSlots || []);
        setColorSlots(template.colorSlots || []);
        const loadedPrompt = template.stylePrompt || template.style_prompt || '';
        setPrompt(loadedPrompt);
        // Auto-fill description from prompt if description is missing (for better UI)
        if (!template.description && loadedPrompt) {
            setTemplateDescription(loadedPrompt.substring(0, 50) + '...');
        } else {
            setTemplateDescription(template.description || '');
        }
        setStep(3);
        setActiveTab('create');
    };

    const handleDeleteTemplate = async (id) => {
        try {
            if (serverOnline) {
                await templatesApi.delete(id);
                const templates = await templatesApi.getAll();
                const formattedTemplates = templates.map(t => ({
                    ...t,
                    image: t.image_path ? getImageUrl(t.image_path) : t.image,
                }));
                setSavedTemplates(formattedTemplates);
            } else {
                const templates = savedTemplates.filter(t => t.id !== id);
                localStorage.setItem('custom_templates', JSON.stringify(templates));
                setSavedTemplates(templates);
            }
            setConfirmDelete(null);
        } catch (error) {
            console.error('Delete error:', error);
            alert('Lỗi xóa template: ' + error.message);
        }
    };

    const handleUpdateTemplate = async () => {
        if (!editingTemplate) return;

        setIsSaving(true);
        try {
            const updateData = {
                title: templateName,
                description: templateDescription,
                category: category,
                image: imagePreview,
                stylePrompt: prompt.substring(0, 2000),
                textSlots,
                imageSlots,
                colorSlots
            };

            if (serverOnline) {
                await templatesApi.update(editingTemplate.id, updateData);
                const templates = await templatesApi.getAll();
                const formattedTemplates = templates.map(t => ({
                    ...t,
                    image: t.image_path ? getImageUrl(t.image_path) : t.image,
                }));
                setSavedTemplates(formattedTemplates);
            } else {
                const templates = savedTemplates.map(t =>
                    t.id === editingTemplate.id ? { ...t, ...updateData } : t
                );
                localStorage.setItem('custom_templates', JSON.stringify(templates));
                setSavedTemplates(templates);
            }

            setEditingTemplate(null);
            setStep(1);
            setImagePreview(null);
            setTemplateName('');
            setTemplateDescription('');
            setPrompt('');
            setTextSlots([]);
            setImageSlots([]);
            setColorSlots([]);
            setActiveTab('manage');
            alert('✅ Đã cập nhật template!');
        } catch (error) {
            console.error('Update error:', error);
            alert('Lỗi cập nhật: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const cancelEdit = () => {
        setEditingTemplate(null);
        setStep(1);
        setImagePreview(null);
        setTemplateName('');
        setTemplateDescription('');
        setPrompt('');
        setTextSlots([]);
        setImageSlots([]);
        setColorSlots([]);
    };

    // === Category Management Functions (with API support) ===
    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) { alert('Nhập tên danh mục!'); return; }

        try {
            const newCat = { name: newCategoryName.trim(), icon: newCategoryIcon };

            if (serverOnline) {
                const _created = await categoriesApi.create(newCat);
                const allCats = await categoriesApi.getAll();
                setCategories(allCats);
            } else {
                const localCat = { id: `cat_${Date.now()}`, ...newCat };
                const updated = [...categories, localCat];
                setCategories(updated);
                localStorage.setItem('custom_categories', JSON.stringify(updated));
            }

            window.dispatchEvent(new Event('categoriesUpdated'));
            setNewCategoryName('');
            setNewCategoryIcon('📁');
        } catch (error) {
            console.error('Add category error:', error);
            alert('Lỗi thêm danh mục: ' + error.message);
        }
    };

    const handleUpdateCategory = async () => {
        if (!editingCategory?.name.trim()) return;

        try {
            if (serverOnline) {
                await categoriesApi.update(editingCategory.id, editingCategory);
                const allCats = await categoriesApi.getAll();
                setCategories(allCats);
            } else {
                const updated = categories.map(c => c.id === editingCategory.id ? editingCategory : c);
                setCategories(updated);
                localStorage.setItem('custom_categories', JSON.stringify(updated));
            }

            window.dispatchEvent(new Event('categoriesUpdated'));
            setEditingCategory(null);
        } catch (error) {
            console.error('Update category error:', error);
            alert('Lỗi cập nhật danh mục: ' + error.message);
        }
    };

    const handleDeleteCategory = async (id) => {
        if (savedTemplates.some(t => t.category === id || t.category_id === id)) {
            alert('Không thể xóa - có template đang dùng!');
            setConfirmDeleteCategory(null);
            return;
        }

        try {
            if (serverOnline) {
                await categoriesApi.delete(id);
                const allCats = await categoriesApi.getAll();
                setCategories(allCats);
            } else {
                const updated = categories.filter(c => c.id !== id);
                setCategories(updated);
                localStorage.setItem('custom_categories', JSON.stringify(updated));
            }

            window.dispatchEvent(new Event('categoriesUpdated'));
            setConfirmDeleteCategory(null);
        } catch (error) {
            console.error('Delete category error:', error);
            alert('Lỗi xóa danh mục: ' + error.message);
        }
    };


    const currentApiKey = apiProvider === 'openai' ? openaiKey : geminiKey;
    const hasApiKey = !!currentApiKey;

    return (
        <div className="template-manager">
            {/* Header */}
            <div className="tm-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Quay lại
                </button>
                <h1 className="tm-title">Tạo Template Mới</h1>
                <button className="settings-btn" onClick={() => setShowSettings(true)}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Cài đặt API
                    {hasApiKey && <span className="api-status-dot success" />}
                </button>
            </div>

            {/* === NEW: Tab Navigation === */}
            <div className="tm-tabs">
                <button className={`tm-tab ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
                    {editingTemplate ? '✏️ Chỉnh sửa' : '➕ Tạo mới'}
                </button>
                <button className={`tm-tab ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => setActiveTab('manage')}>
                    📋 Quản lý mẫu ({savedTemplates.length})
                </button>
                <button className={`tm-tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
                    🏷️ Danh mục ({categories.length})
                </button>
            </div>

            {/* === Tab: Create (original content wrapped) === */}
            {activeTab === 'create' && (
                <>
                    {/* Steps indicator */}
                    <div className="steps-indicator">
                        <div className={`step ${step >= 1 ? 'active' : ''}`}>
                            <span className="step-num">1</span>
                            <span className="step-label">Tải ảnh mẫu</span>
                        </div>
                        <div className="step-line" />
                        <div className={`step ${step >= 2 ? 'active' : ''}`}>
                            <span className="step-num">2</span>
                            <span className="step-label">Nhập Prompt</span>
                        </div>
                        <div className="step-line" />
                        <div className={`step ${step >= 3 ? 'active' : ''}`}>
                            <span className="step-num">3</span>
                            <span className="step-label">Tùy chỉnh Slots</span>
                        </div>
                        <div className="step-line" />
                        <div className={`step ${step >= 4 ? 'active' : ''}`}>
                            <span className="step-num">4</span>
                            <span className="step-label">Lưu Template</span>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="tm-content">
                        {/* Left: Image Preview */}
                        <div className="tm-preview-section">
                            <div
                                className={`image-drop-zone ${imagePreview ? 'has-image' : ''}`}
                                onDrop={handleImageDrop}
                                onDragOver={handleDragOver}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Template preview" className="preview-img" />
                                ) : (
                                    <div className="drop-placeholder">
                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p>Kéo thả ảnh mẫu vào đây</p>
                                        <span>hoặc click để chọn file</span>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden-input"
                                    onChange={handleImageDrop}
                                />
                            </div>

                            {/* Image URL Input */}
                            <div className="image-url-input" style={{ marginTop: '12px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                    Hoặc dán link ảnh (Drive, URL):
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        id="image-url-input"
                                        placeholder="https://drive.google.com/... hoặc URL ảnh"
                                        className="form-input"
                                        style={{ flex: 1, fontSize: '0.85rem' }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                document.getElementById('load-image-btn')?.click();
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        id="load-image-btn"
                                        className="add-slot-btn"
                                        style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}
                                        onClick={async () => {
                                            const input = document.getElementById('image-url-input');
                                            const url = input.value.trim();
                                            if (!url) return;

                                            let finalUrl = url;

                                            // Check if it's a Google Drive link
                                            const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                                            if (driveMatch) {
                                                const fileId = driveMatch[1];
                                                // Use lh3.googleusercontent (thumbnail) which bypasses CORS
                                                finalUrl = `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
                                            }

                                            // Test if image loads
                                            const btn = document.getElementById('load-image-btn');
                                            const originalText = btn.innerText;
                                            btn.innerText = 'Đang tải...';
                                            btn.disabled = true;

                                            try {
                                                // Create a test image to verify URL works
                                                await new Promise((resolve, reject) => {
                                                    const img = new Image();
                                                    img.onload = resolve;
                                                    img.onerror = reject;
                                                    img.src = finalUrl;
                                                    // Timeout after 10 seconds
                                                    setTimeout(() => reject(new Error('Timeout')), 10000);
                                                });

                                                setImagePreview(finalUrl);
                                                input.value = '';
                                            } catch (error) {
                                                console.error('Failed to load image:', error);
                                                alert('Không thể tải ảnh từ link này. Vui lòng kiểm tra:\n1. Link ảnh có public không?\n2. Đối với Google Drive: Chia sẻ file ở chế độ "Anyone with the link"');
                                            } finally {
                                                btn.innerText = originalText;
                                                btn.disabled = false;
                                            }
                                        }}
                                    >
                                        Tải ảnh
                                    </button>
                                </div>
                                <small style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                    💡 Google Drive: File phải được share "Anyone with the link" để hiển thị
                                </small>
                            </div>
                        </div>

                        {/* Right: Form */}
                        <div className="tm-form-section">
                            {/* Step 2: Prompt Input - Always visible */}
                            <div className="form-block">
                                <h3 className="block-title">
                                    <span className="block-num">2</span>
                                    Style Prompt (DNA của Template)
                                    <span className="api-warning" style={{ fontSize: '0.8em', marginLeft: '10px', fontWeight: 'normal' }}>
                                        *Prompt gốc cho AI tạo ảnh
                                    </span>
                                </h3>
                                <textarea
                                    className="prompt-input"
                                    placeholder="Nhập prompt đã dùng để tạo ảnh mẫu này...&#10;&#10;Ví dụ: Tạo banner quảng cáo spa làm đẹp với nền hồng pastel, có ảnh người mẫu ở giữa, logo ở góc trái, tiêu đề 'Biến hình Môi xinh' font chữ nghệ thuật màu hồng đậm, phía dưới có slogan và thông tin liên hệ..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    rows={4}
                                />
                            </div>

                            {/* Step 3: Slots Configuration - Compact */}
                            <div className="form-block" style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <h3 className="block-title" style={{ margin: 0 }}>
                                        <span className="block-num">3</span>
                                        Slots ({textSlots.length + imageSlots.length + colorSlots.length})
                                    </h3>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button className="add-slot-btn" onClick={addTextSlot} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>+ Text</button>
                                        <button className="add-slot-btn" onClick={addImageSlot} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>+ Ảnh</button>
                                        <button className="add-slot-btn" onClick={addColorSlot} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>+ Màu</button>
                                    </div>
                                </div>

                                {/* All slots in compact list */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {textSlots.map((slot) => (
                                        <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--input-bg)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>📝</span>
                                            <input type="text" value={slot.label} onChange={(e) => updateSlot('text', slot.id, 'label', e.target.value)} placeholder="Tên" style={{ width: '80px', border: 'none', background: 'transparent', fontSize: '0.8rem' }} />
                                            <button onClick={() => removeSlot('text', slot.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px' }}>×</button>
                                        </div>
                                    ))}
                                    {imageSlots.map((slot) => (
                                        <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--input-bg)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>🖼️</span>
                                            <input type="text" value={slot.label} onChange={(e) => updateSlot('image', slot.id, 'label', e.target.value)} placeholder="Tên" style={{ width: '80px', border: 'none', background: 'transparent', fontSize: '0.8rem' }} />
                                            <button onClick={() => removeSlot('image', slot.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px' }}>×</button>
                                        </div>
                                    ))}
                                    {colorSlots.map((slot) => (
                                        <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--input-bg)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                            <input type="color" value={slot.defaultValue} onChange={(e) => updateSlot('color', slot.id, 'defaultValue', e.target.value)} style={{ width: '20px', height: '20px', border: 'none', padding: 0, cursor: 'pointer' }} />
                                            <input type="text" value={slot.label} onChange={(e) => updateSlot('color', slot.id, 'label', e.target.value)} placeholder="Tên" style={{ width: '60px', border: 'none', background: 'transparent', fontSize: '0.8rem' }} />
                                            <button onClick={() => removeSlot('color', slot.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px' }}>×</button>
                                        </div>
                                    ))}
                                    {textSlots.length + imageSlots.length + colorSlots.length === 0 && (
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Chưa có slot nào. Bấm nút bên trên để thêm.</span>
                                    )}
                                </div>
                            </div>

                            {/* Step 4: Save Template - with labels */}
                            <div className="form-block" style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span className="block-num">4</span>
                                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Lưu Template</span>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                    {/* Tên Template */}
                                    <div style={{ flex: '1', minWidth: '150px' }}>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                                            Tên Template <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="VD: Banner Tết 2026"
                                            value={templateName}
                                            onChange={(e) => setTemplateName(e.target.value)}
                                            style={{ width: '100%', fontSize: '0.85rem', padding: '8px' }}
                                        />
                                    </div>
                                    {/* Mô tả */}
                                    <div style={{ flex: '1', minWidth: '120px' }}>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                                            Mô tả ngắn
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="VD: Poster khuyến mãi spa"
                                            value={templateDescription}
                                            onChange={(e) => setTemplateDescription(e.target.value)}
                                            style={{ width: '100%', fontSize: '0.85rem', padding: '8px' }}
                                        />
                                    </div>
                                    {/* Danh mục */}
                                    <div style={{ minWidth: '140px' }}>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                                            Danh mục
                                        </label>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <select
                                                className="form-input"
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                style={{ flex: '1', fontSize: '0.85rem', padding: '8px' }}
                                            >
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>
                                                        {cat.icon} {cat.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const name = window.prompt('Nhập tên danh mục mới:');
                                                    if (name && name.trim()) {
                                                        try {
                                                            const newCat = { id: `cat_${Date.now()}`, name: name.trim(), icon: '📁' };
                                                            // Add to local state immediately
                                                            const updatedCategories = [...categories, newCat];
                                                            setCategories(updatedCategories);
                                                            setCategory(newCat.id);
                                                            // Try to save to server
                                                            if (serverOnline) {
                                                                await categoriesApi.create({ name: name.trim(), icon: '📁' });
                                                                window.dispatchEvent(new Event('categoriesUpdated'));
                                                            }
                                                            alert('✅ Đã tạo danh mục: ' + name.trim());
                                                        } catch (error) {
                                                            console.error('Error creating category:', error);
                                                            alert('⚠️ Đã thêm danh mục tạm thời. Lưu vào server khi online.');
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: 'var(--bg-tertiary)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '1rem'
                                                }}
                                                title="Tạo danh mục mới"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    {/* Save Button */}
                                    <button
                                        className="save-template-btn"
                                        onClick={editingTemplate ? handleUpdateTemplate : saveTemplate}
                                        disabled={isSaving}
                                        style={{ padding: '8px 20px', whiteSpace: 'nowrap', height: '38px' }}
                                    >
                                        {isSaving ? '⏳ Đang lưu...' : (editingTemplate ? '✓ Cập nhật' : '💾 Lưu Template')}
                                    </button>
                                </div>
                                {/* Server Status - small inline */}
                                <div style={{ fontSize: '0.7rem', color: serverOnline ? '#22c55e' : '#f59e0b', marginTop: '8px' }}>
                                    {serverOnline ? '● Server Online - Lưu vào NocoDB' : '● Server Offline - Không thể lưu'}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* === Tab: Manage Templates === */}
            {activeTab === 'manage' && (
                <div className="tm-manage-section">
                    <div className="manage-header">
                        <h2>📋 Danh sách mẫu đã tạo</h2>
                    </div>
                    {savedTemplates.length === 0 ? (
                        <div className="empty-templates">
                            <p>Chưa có mẫu nào được tạo</p>
                            <button onClick={() => setActiveTab('create')}>➕ Tạo mẫu đầu tiên</button>
                        </div>
                    ) : (
                        <div className="templates-list">
                            {savedTemplates.map(t => (
                                <div key={t.id} className="template-item">
                                    <div className="template-thumb">
                                        <img src={t.image} alt={t.title} />
                                    </div>
                                    <div className="template-details">
                                        <h3>{t.title}</h3>
                                        <p>{t.description || 'Không có mô tả'}</p>
                                        <span className="template-category">{t.category}</span>
                                    </div>
                                    <div className="template-actions">
                                        <button className="edit-btn" onClick={() => handleEditTemplate(t)}>✏️ Sửa</button>
                                        <button className="delete-btn" onClick={() => setConfirmDelete(t.id)}>🗑️ Xóa</button>
                                    </div>
                                    {confirmDelete === t.id && (
                                        <div className="delete-confirm-overlay">
                                            <div className="delete-confirm-box">
                                                <p>Xác nhận xóa mẫu này?</p>
                                                <button onClick={() => setConfirmDelete(null)}>Hủy</button>
                                                <button className="confirm-delete" onClick={() => handleDeleteTemplate(t.id)}>Xóa</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )
            }

            {/* === Tab: Categories === */}
            {
                activeTab === 'categories' && (
                    <div className="tm-manage-section">
                        <div className="manage-header">
                            <h2>🏷️ Quản lý Danh mục</h2>
                        </div>
                        <div className="add-category-form">
                            <input type="text" className="emoji-input" value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} maxLength={2} placeholder="📁" />
                            <input type="text" className="form-input" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nhập tên danh mục..." />
                            <button className="add-category-btn" onClick={handleAddCategory}>➕ Thêm</button>
                        </div>
                        <div className="categories-list">
                            {categories.map(cat => (
                                <div key={cat.id} className="category-item">
                                    {editingCategory?.id === cat.id ? (
                                        <div className="category-edit-row">
                                            <input type="text" className="emoji-input" value={editingCategory.icon} onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })} maxLength={2} />
                                            <input type="text" className="form-input" value={editingCategory.name} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })} />
                                            <button onClick={handleUpdateCategory}>✓ Lưu</button>
                                            <button onClick={() => setEditingCategory(null)}>✕ Hủy</button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="category-icon">{cat.icon}</span>
                                            <span className="category-name">{cat.name}</span>
                                            <span className="category-id">({cat.id})</span>
                                            <button className="edit-cat-btn" onClick={() => setEditingCategory({ ...cat })}>✏️</button>
                                            <button className="delete-cat-btn" onClick={() => setConfirmDeleteCategory(cat.id)}>🗑️</button>
                                            {confirmDeleteCategory === cat.id && (
                                                <div className="delete-confirm-overlay">
                                                    <div className="delete-confirm-box">
                                                        <p>Xóa danh mục "{cat.name}"?</p>
                                                        <button onClick={() => setConfirmDeleteCategory(null)}>Hủy</button>
                                                        <button className="confirm-delete" onClick={() => handleDeleteCategory(cat.id)}>Xóa</button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* === Update Bar for Edit Mode === */}
            {
                editingTemplate && activeTab === 'create' && (
                    <div className="update-template-bar">
                        <button className="cancel-edit-btn" onClick={cancelEdit}>❌ Hủy chỉnh sửa</button>
                        <button className="update-btn" onClick={handleUpdateTemplate}>✅ Cập nhật Template</button>
                    </div>
                )
            }

            {/* Settings Modal */}
            {
                showSettings && (
                    <div className="settings-modal-overlay" onClick={() => setShowSettings(false)}>
                        <div className="settings-modal" onClick={e => e.stopPropagation()}>
                            <h2>Cài đặt API</h2>

                            <div className="api-provider-select">
                                <label className={apiProvider === 'openai' ? 'selected' : ''}>
                                    <input
                                        type="radio"
                                        value="openai"
                                        checked={apiProvider === 'openai'}
                                        onChange={(e) => { setApiProvider(e.target.value); setApiStatus({ checking: false, result: null }); }}
                                    />
                                    OpenAI (GPT-4 Vision)
                                </label>
                                <label className={apiProvider === 'gemini' ? 'selected' : ''}>
                                    <input
                                        type="radio"
                                        value="gemini"
                                        checked={apiProvider === 'gemini'}
                                        onChange={(e) => { setApiProvider(e.target.value); setApiStatus({ checking: false, result: null }); }}
                                    />
                                    Google Gemini
                                </label>
                            </div>

                            <div className="api-key-input">
                                <label>
                                    {apiProvider === 'openai' ? 'OpenAI API Key' : 'Gemini API Key'}
                                </label>
                                <div className="api-input-row">
                                    <input
                                        type="password"
                                        placeholder={apiProvider === 'openai' ? 'sk-...' : 'AIza...'}
                                        value={apiProvider === 'openai' ? openaiKey : geminiKey}
                                        onChange={(e) => apiProvider === 'openai' ? setOpenaiKey(e.target.value) : setGeminiKey(e.target.value)}
                                    />
                                    <button
                                        className="test-api-btn"
                                        onClick={testApiKey}
                                        disabled={apiStatus.checking}
                                    >
                                        {apiStatus.checking ? (
                                            <div className="spinner-small" />
                                        ) : (
                                            'Kiểm tra'
                                        )}
                                    </button>
                                </div>

                                {apiStatus.result && (
                                    <div className={`api-status-message ${apiStatus.result}`}>
                                        {apiStatus.result === 'success' ? '✓' : '✗'} {apiStatus.message}
                                    </div>
                                )}
                            </div>

                            {/* Model Selection */}
                            <div className="api-key-input">
                                <label>Model phân tích (Vision)</label>
                                <select
                                    className="model-select"
                                    value={apiProvider === 'openai' ? openaiModel : geminiModel}
                                    onChange={(e) => apiProvider === 'openai' ? setOpenaiModel(e.target.value) : setGeminiModel(e.target.value)}
                                >
                                    {(apiProvider === 'openai' ? openaiModels : geminiModels).map(model => (
                                        <option key={model.value} value={model.value}>
                                            {model.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Image Generation Model */}
                            <div className="api-key-input">
                                <label>Model tạo ảnh</label>
                                <select
                                    className="model-select"
                                    value={imageModel}
                                    onChange={(e) => setImageModel(e.target.value)}
                                >
                                    {(imageModels[apiProvider] || imageModels.openai).map(model => (
                                        <option key={model.value} value={model.value}>
                                            {model.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="settings-actions">
                                <button className="cancel-btn" onClick={() => { setShowSettings(false); setApiStatus({ checking: false, result: null }); }}>
                                    Hủy
                                </button>
                                <button
                                    className="save-btn"
                                    onClick={saveApiKeys}
                                    disabled={apiStatus.result === 'error'}
                                >
                                    Lưu cài đặt
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
