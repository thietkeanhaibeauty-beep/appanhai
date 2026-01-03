import React, { useState, useEffect, useRef } from 'react';

// Image Generation Models (2025 - Từ Gemini API thực tế)
const IMAGE_MODELS = {
    openai: [
        { value: 'dall-e-3', label: 'DALL-E 3', description: 'Chất lượng cao nhất OpenAI', price: 0.04 },
        { value: 'gpt-image-1', label: 'GPT Image 1', description: 'Model mới của OpenAI', price: 0.04 },
    ],
    gemini: [
        // Imagen 4 Series (Best Quality 2025) - Paid
        { value: 'imagen-4.0-ultra-generate-001', label: '⭐ Imagen 4 Ultra', description: '🏆 Chất lượng CAO NHẤT, text rendering hoàn hảo', price: 0.06 },
        { value: 'imagen-4.0-generate-001', label: '🎯 Imagen 4', description: '✅ Flagship model, 2K, photorealistic - KHUYÊN DÙNG', price: 0.04 },
        { value: 'imagen-4.0-fast-generate-001', label: '⚡ Imagen 4 Fast', description: '🚀 Nhanh 10x, phù hợp tạo số lượng lớn', price: 0.02 },

        // Gemini 3 Series (Preview)
        { value: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image', description: '4K resolution, physics-aware rendering', price: 0.24 },

        // Gemini 2.5 Series
        { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', description: 'Nhanh, đa dạng style, real-time editing', price: 0.04 },

        // Gemini 2.0 Series
        { value: 'gemini-2.0-flash-exp-image-generation', label: 'Gemini 2.0 Flash Image', description: 'Tạo + chỉnh sửa ảnh trong hội thoại', price: 0 },

        // Canvas Render (Local)
        { value: 'canvas-render', label: '🎯 Canvas Render', description: '100% chính xác text, không cần AI', price: 0 },
    ],
    replicate: [
        { value: 'black-forest-labs/flux-1.1-pro', label: 'FLUX 1.1 Pro', description: 'Model hot nhất hiện tại', price: 0.05 },
        { value: 'stability-ai/sdxl', label: 'Stable Diffusion XL', description: 'Open source, linh hoạt', price: 0.02 },
    ]
};

export default function TemplateModal({
    template, isOpen, onClose, onGenerate, onSaveTemplate, generatedImage,
    // New props for Gallery enhancements
    onDelete, onToggleStar, onUpdateCategory, isSuperAdmin, categories = []
}) {
    const [activeTab, setActiveTab] = useState('text');
    const [formData, setFormData] = useState({});
    const [imageUploads, setImageUploads] = useState({});


    const [selectedImageModel, setSelectedImageModel] = useState('openai-dall-e-3'); // Default high quality
    const [apiProvider, setApiProvider] = useState('openai');
    const [colorSectionOpen, setColorSectionOpen] = useState(false);

    // Professional Mode State
    const [isAdvancedMode, setIsAdvancedMode] = useState(false);
    const [customStylePrompt, setCustomStylePrompt] = useState('');
    const [isSaving, setIsSaving] = useState(false); // Validating save state

    const fileInputRefs = useRef({});

    // Check if template is custom (has slots from AI analysis)
    const isCustomTemplate = template?.isCustom && (
        template.textSlots?.length > 0 ||
        template.imageSlots?.length > 0 ||
        template.colorSlots?.length > 0
    );

    // Initialize form data when template changes
    useEffect(() => {
        if (template && isOpen) {
            if (isCustomTemplate) {
                // Initialize from custom template slots
                const initialData = {};

                // Text slots
                template.textSlots?.forEach(slot => {
                    initialData[slot.id] = slot.defaultValue || '';
                });

                // Color slots
                template.colorSlots?.forEach(slot => {
                    initialData[slot.id] = slot.defaultValue || '#3b82f6';
                });

                setFormData(initialData);
                setImageUploads({});
            } else {
                // Default form data for mock templates
                setFormData({
                    clinicName: '',
                    titleLine1: '',
                    titleLine2: '',
                    subtitle: '',
                    internationalLine: '',
                    leftPanelText: '',
                    backgroundColor: '#0a1628',
                    primaryColor: '#00E5FF',
                    panelColor: '#002850',
                    titleColor: '#00E5FF',
                    subtitleColor: '#1A1A1A',
                });
                setImageUploads({});
            }

            // Load API settings
            const savedProvider = localStorage.getItem('api_provider') || 'openai';
            const savedImageModel = localStorage.getItem('image_model') || '';
            setApiProvider(savedProvider);

            // Set default image model based on provider if not saved
            if (savedImageModel) {
                setSelectedImageModel(savedImageModel);
            } else {
                const defaultModels = IMAGE_MODELS[savedProvider] || IMAGE_MODELS.openai;
                setSelectedImageModel(defaultModels[0]?.value || 'dall-e-3');
            }

            // Reset Advanced Mode
            setIsAdvancedMode(false);
            setCustomStylePrompt(template.stylePrompt || template.style_prompt || '');
        }
    }, [template, isOpen, isCustomTemplate]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleImageUpload = (slotId, e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUploads(prev => ({
                    ...prev,
                    [slotId]: {
                        file: file,
                        preview: reader.result
                    }
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageModelChange = (model) => {
        setSelectedImageModel(model);
        localStorage.setItem('image_model', model);
    };

    const handleGenerate = () => {
        onGenerate({
            ...formData,
            images: imageUploads,
            template: template,
            imageModel: selectedImageModel,
            apiProvider: apiProvider,
            // Pass advanced mode data
            isAdvancedMode: isAdvancedMode,
            customStylePrompt: isAdvancedMode ? customStylePrompt : null
        });
    };

    if (!isOpen || !template) return null;

    // Render custom template form (with dynamic slots)
    const renderCustomForm = () => (
        <div className="form-scroll-area">
            {/* Section A - Text Content */}
            {template.textSlots?.length > 0 && (
                <div className="form-section">
                    <div className="section-header">
                        <span className="section-badge section-badge-a">A</span>
                        <span className="section-title">Nội dung văn bản ({template.textSlots.length})</span>
                    </div>

                    <div className="form-grid">
                        {template.textSlots.map(slot => (
                            <div key={slot.id} className="form-group">
                                <label className="form-label">{slot.label}</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder={slot.placeholder || `Nhập ${slot.label}...`}
                                    value={formData[slot.id] || ''}
                                    onChange={(e) => handleChange(slot.id, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section B - Images */}
            {template.imageSlots?.length > 0 && (
                <div className="form-section">
                    <div className="section-header">
                        <span className="section-badge section-badge-b">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </span>
                        <span className="section-title">Hình ảnh ({template.imageSlots.length})</span>
                    </div>

                    <div className="form-grid">
                        {template.imageSlots.map(slot => (
                            <div key={slot.id} className="form-group">
                                <label className="form-label">{slot.label}</label>
                                <p className="form-hint">{slot.description}</p>
                                <div className="image-upload-compact">
                                    <div className="image-preview-small">
                                        {imageUploads[slot.id]?.preview ? (
                                            <img src={imageUploads[slot.id].preview} alt={slot.label} />
                                        ) : (
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="upload-btn-small"
                                        onClick={() => fileInputRefs.current[slot.id]?.click()}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Tải lên
                                    </button>
                                    <input
                                        ref={el => fileInputRefs.current[slot.id] = el}
                                        type="file"
                                        accept="image/*"
                                        className="hidden-input"
                                        onChange={(e) => handleImageUpload(slot.id, e)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section C - Colors (Collapsible) */}
            {template.colorSlots?.length > 0 && (
                <div className="form-section collapsible-section">
                    <div
                        className="section-header section-header-clickable"
                        onClick={() => setColorSectionOpen(!colorSectionOpen)}
                    >
                        <span className="section-badge section-badge-c">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                            </svg>
                        </span>
                        <span className="section-title">Màu sắc ({template.colorSlots.length})</span>
                        <svg className={`toggle-icon ${colorSectionOpen ? 'open' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>

                    {colorSectionOpen && (
                        <div className="form-grid color-grid color-grid-compact">
                            {template.colorSlots.map(slot => (
                                <div key={slot.id} className="form-group form-group-compact">
                                    <label className="form-label form-label-small">{slot.label}</label>
                                    <div className="color-input-mini">
                                        <div className="color-preview-mini" style={{ backgroundColor: formData[slot.id] || slot.defaultValue }} />
                                        <input
                                            type="color"
                                            className="color-picker-mini"
                                            value={formData[slot.id] || slot.defaultValue || '#000000'}
                                            onChange={(e) => handleChange(slot.id, e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    // Render default form for mock templates
    const renderDefaultForm = () => (
        <div className="form-scroll-area">
            {/* Section A - Text Content */}
            <div className="form-section">
                <div className="section-header">
                    <span className="section-badge section-badge-a">A</span>
                    <span className="section-title">Nội dung văn bản</span>
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Tên clinic</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Nhập Tên clinic..."
                            value={formData.clinicName || ''}
                            onChange={(e) => handleChange('clinicName', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Dòng phụ quốc tế</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Nhập Dòng phụ quốc tế..."
                            value={formData.internationalLine || ''}
                            onChange={(e) => handleChange('internationalLine', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Tiêu đề dòng 1</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Nhập Tiêu đề dòng 1..."
                            value={formData.titleLine1 || ''}
                            onChange={(e) => handleChange('titleLine1', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Tiêu đề dòng 2</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Nhập Tiêu đề dòng 2..."
                            value={formData.titleLine2 || ''}
                            onChange={(e) => handleChange('titleLine2', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Subtitle (nền trắng)</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Nhập Subtitle..."
                            value={formData.subtitle || ''}
                            onChange={(e) => handleChange('subtitle', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Text panel trái</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Nhập Text panel trái..."
                            value={formData.leftPanelText || ''}
                            onChange={(e) => handleChange('leftPanelText', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Section B - Images */}
            <div className="form-section">
                <div className="section-header">
                    <span className="section-badge section-badge-b">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </span>
                    <span className="section-title">Hình ảnh</span>
                </div>

                <div className="form-grid">
                    {/* Portrait Image Upload */}
                    <div className="form-group">
                        <label className="form-label">Ảnh chân dung</label>
                        <div className="image-upload-compact">
                            <div className="image-preview-small">
                                {imageUploads['portrait']?.preview ? (
                                    <img src={imageUploads['portrait'].preview} alt="Portrait" />
                                ) : (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </div>
                            <button
                                type="button"
                                className="upload-btn-small"
                                onClick={() => fileInputRefs.current['portrait']?.click()}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Tải lên
                            </button>
                            <input
                                ref={el => fileInputRefs.current['portrait'] = el}
                                type="file"
                                accept="image/*"
                                className="hidden-input"
                                onChange={(e) => handleImageUpload('portrait', e)}
                            />
                        </div>
                    </div>

                    {/* Logo Upload */}
                    <div className="form-group">
                        <label className="form-label">Logo Clinic</label>
                        <div className="image-upload-compact">
                            <div className="image-preview-small">
                                {imageUploads['logo']?.preview ? (
                                    <img src={imageUploads['logo'].preview} alt="Logo" />
                                ) : (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </div>
                            <button
                                type="button"
                                className="upload-btn-small"
                                onClick={() => fileInputRefs.current['logo']?.click()}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Tải lên
                            </button>
                            <input
                                ref={el => fileInputRefs.current['logo'] = el}
                                type="file"
                                accept="image/*"
                                className="hidden-input"
                                onChange={(e) => handleImageUpload('logo', e)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Section C - Colors */}
            <div className="form-section">
                <div className="section-header">
                    <span className="section-badge section-badge-c">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                        </svg>
                    </span>
                    <span className="section-title">Màu sắc</span>
                </div>

                <div className="form-grid color-grid">
                    <div className="form-group">
                        <label className="form-label">Màu nền đậm</label>
                        <div className="color-input-compact">
                            <div className="color-preview-small" style={{ backgroundColor: formData.backgroundColor }} />
                            <input
                                type="text"
                                className="form-input color-text-input"
                                value={formData.backgroundColor || ''}
                                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                            />
                            <input
                                type="color"
                                className="color-picker-small"
                                value={formData.backgroundColor || '#000000'}
                                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Màu chính (Cyan)</label>
                        <div className="color-input-compact">
                            <div className="color-preview-small" style={{ backgroundColor: formData.primaryColor }} />
                            <input
                                type="text"
                                className="form-input color-text-input"
                                value={formData.primaryColor || ''}
                                onChange={(e) => handleChange('primaryColor', e.target.value)}
                            />
                            <input
                                type="color"
                                className="color-picker-small"
                                value={formData.primaryColor || '#000000'}
                                onChange={(e) => handleChange('primaryColor', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Màu panel</label>
                        <div className="color-input-compact">
                            <div className="color-preview-small" style={{ backgroundColor: formData.panelColor }} />
                            <input
                                type="text"
                                className="form-input color-text-input"
                                value={formData.panelColor || ''}
                                onChange={(e) => handleChange('panelColor', e.target.value)}
                            />
                            <input
                                type="color"
                                className="color-picker-small"
                                value={formData.panelColor || '#000000'}
                                onChange={(e) => handleChange('panelColor', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Màu tiêu đề</label>
                        <div className="color-input-compact">
                            <div className="color-preview-small" style={{ backgroundColor: formData.titleColor }} />
                            <input
                                type="text"
                                className="form-input color-text-input"
                                value={formData.titleColor || ''}
                                onChange={(e) => handleChange('titleColor', e.target.value)}
                            />
                            <input
                                type="color"
                                className="color-picker-small"
                                value={formData.titleColor || '#000000'}
                                onChange={(e) => handleChange('titleColor', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Màu subtitle</label>
                        <div className="color-input-compact">
                            <div className="color-preview-small" style={{ backgroundColor: formData.subtitleColor }} />
                            <input
                                type="text"
                                className="form-input color-text-input"
                                value={formData.subtitleColor || ''}
                                onChange={(e) => handleChange('subtitleColor', e.target.value)}
                            />
                            <input
                                type="color"
                                className="color-picker-small"
                                value={formData.subtitleColor || '#000000'}
                                onChange={(e) => handleChange('subtitleColor', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container modal-wide" onClick={(e) => e.stopPropagation()}>
                {/* Close Button */}
                <button className="modal-close" onClick={onClose}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="modal-content">
                    {/* Left Side - Preview */}
                    {/* Left Side - Preview */}
                    <div className="modal-preview" style={generatedImage ? { display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' } : {}}>

                        {/* Original Template */}
                        <div className="preview-image-wrapper" style={generatedImage ? { height: '200px', flex: '0 0 auto' } : {}}>
                            <img src={template.image} alt={template.title} className="preview-image" style={{ objectFit: 'contain' }} />
                            <div className="preview-overlay">
                                <div className="preview-badge">{generatedImage ? 'Template Gốc' : 'Preview'}</div>
                            </div>
                        </div>

                        {/* Generated Result */}
                        {generatedImage && (
                            <div className="preview-image-wrapper" style={{ flex: '1 0 auto', border: '2px solid #00E5FF', boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)' }}>
                                <img src={generatedImage} alt="Generated Design" className="preview-image" style={{ objectFit: 'contain' }} />
                                <div className="preview-overlay">
                                    <div className="preview-badge" style={{ background: '#00E5FF', color: '#000' }}>✨ Kết Quả AI</div>
                                </div>
                                <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '12px' }}>
                                    <a
                                        href={generatedImage}
                                        download={`design_${Date.now()}.png`}
                                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', background: '#00E5FF', color: '#000', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold' }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Tải Về
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Side - Form */}
                    <div className="modal-form">
                        <div className="form-header">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <h2 className="form-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {template.isStarred && <span style={{ color: '#fbbf24' }}>⭐</span>}
                                        {template.title}
                                    </h2>
                                    <p className="form-description">
                                        {template.description || 'Template banner quảng cáo với khung tròn, người mẫu và các element trang trí'}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    {/* Star Button - SuperAdmin only */}
                                    {isSuperAdmin && onToggleStar && (
                                        <button
                                            onClick={() => onToggleStar(template.id, !template.isStarred)}
                                            title={template.isStarred ? 'Bỏ gắn sao' : 'Gắn sao (hiển thị nổi bật)'}
                                            style={{
                                                padding: '8px 12px',
                                                background: template.isStarred ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'var(--bg-tertiary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '1rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            {template.isStarred ? '⭐' : '☆'}
                                        </button>
                                    )}

                                    {/* Delete Button */}
                                    {onDelete && (
                                        <button
                                            onClick={() => onDelete(template.id)}
                                            title="Xóa template"
                                            style={{
                                                padding: '8px 12px',
                                                background: 'var(--bg-tertiary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '1rem',
                                                color: '#ef4444'
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Category Dropdown - SuperAdmin only */}
                            {isSuperAdmin && onUpdateCategory && categories.length > 0 && (
                                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>📁 Danh mục:</span>
                                    <select
                                        value={template.category || ''}
                                        onChange={(e) => onUpdateCategory(template.id, e.target.value)}
                                        style={{
                                            padding: '6px 12px',
                                            background: 'var(--bg-tertiary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            flex: 1,
                                            maxWidth: '200px'
                                        }}
                                    >
                                        <option value="">-- Chưa phân loại --</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.icon} {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {isCustomTemplate && (
                                <div className="template-info" style={{ marginTop: '8px' }}>
                                    <span className="info-badge text-badge">{template.textSlots?.length || 0} text</span>
                                    <span className="info-badge image-badge">{template.imageSlots?.length || 0} ảnh</span>
                                    <span className="info-badge color-badge">{template.colorSlots?.length || 0} màu</span>
                                </div>
                            )}
                        </div>

                        {/* Professional Mode Toggle */}
                        <div className="advanced-mode-toggle">
                            <div className="toggle-header" onClick={() => setIsAdvancedMode(!isAdvancedMode)}>
                                <div className="toggle-label-container">
                                    <span className="toggle-icon">⚡</span>
                                    <div>
                                        <div className="toggle-title">Chế độ Chuyên gia (Prompt Editor)</div>
                                        <div className="toggle-subtitle">Can thiệp vào quá trình tạo ảnh</div>
                                    </div>
                                </div>
                                <div className={`toggle-switch ${isAdvancedMode ? 'active' : ''}`}>
                                    <div className="toggle-knob" />
                                </div>
                            </div>

                            {/* Advanced Editor */}
                            {/* Advanced Editor */}
                            {isAdvancedMode && (
                                <div className="advanced-editor">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <label className="editor-label" style={{ marginBottom: 0 }}>
                                            Style Prompt (DNA của Template)
                                        </label>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (isSaving || !onSaveTemplate) return;
                                                setIsSaving(true);
                                                const result = await onSaveTemplate(template.id, { stylePrompt: customStylePrompt });
                                                setIsSaving(false);
                                                if (result.success) {
                                                    // Simple feedback - could be improved with a toast
                                                    const btn = e.target;
                                                    const originalText = btn.innerHTML;
                                                    btn.innerHTML = '✅ Đã lưu';
                                                    btn.style.background = '#059669';
                                                    setTimeout(() => {
                                                        btn.innerHTML = originalText;
                                                        btn.style.background = '';
                                                    }, 2000);
                                                }
                                            }}
                                            className="save-prompt-btn"
                                            style={{
                                                background: isSaving ? '#94a3b8' : '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                padding: '4px 12px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                cursor: isSaving ? 'wait' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {isSaving ? 'Đang lưu...' : (
                                                <>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                                    </svg>
                                                    Lưu Prompt gốc
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <textarea
                                        value={customStylePrompt}
                                        onChange={(e) => setCustomStylePrompt(e.target.value)}
                                        placeholder={template.stylePrompt ? "" : "Mô tả phong cách, bố cục, màu sắc chủ đạo của template này..."}
                                        className="editor-textarea"
                                    />
                                    <div className="editor-hint">
                                        * Mẹo: Sửa prompt này để thay đổi style nhưng vẫn giữ bố cục chung. Hệ thống sẽ tự động chèn nội dung của bạn vào prompt này.
                                    </div>
                                </div>
                            )}
                        </div>

                        {isCustomTemplate ? renderCustomForm() : renderDefaultForm()}



                        {/* Model Selection */}
                        <div className="model-selection-section">
                            <div className="model-selector-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                                <div className="model-label">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span>Model tạo ảnh</span>
                                </div>
                                {(() => {
                                    // Robust Price Lookup
                                    const allModels = [...IMAGE_MODELS.openai, ...IMAGE_MODELS.gemini, ...IMAGE_MODELS.replicate];
                                    const model = allModels.find(m => m.value === selectedImageModel);
                                    const price = model?.price || 0;

                                    if (price > 0) {
                                        return (
                                            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                                ${price}/ảnh
                                            </span>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                            <div className="model-selector">
                                <select
                                    className="model-dropdown"
                                    value={selectedImageModel}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        handleImageModelChange(newValue);

                                        // Auto-detect provider
                                        let newProvider = 'openai';
                                        if (IMAGE_MODELS.gemini.some(m => m.value === newValue)) newProvider = 'gemini';
                                        else if (IMAGE_MODELS.replicate.some(m => m.value === newValue)) newProvider = 'replicate';

                                        setApiProvider(newProvider);
                                        localStorage.setItem('api_provider', newProvider);
                                    }}
                                >
                                    <optgroup label="Google Gemini / Imagen">
                                        {IMAGE_MODELS.gemini.map(model => (
                                            <option key={model.value} value={model.value}>
                                                {model.label} {model.price > 0 ? `($${model.price})` : ''}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="OpenAI (DALL-E)">
                                        {IMAGE_MODELS.openai.map(model => (
                                            <option key={model.value} value={model.value}>
                                                {model.label} {model.price > 0 ? `($${model.price})` : ''}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Replicate (FLUX)">
                                        {IMAGE_MODELS.replicate.map(model => (
                                            <option key={model.value} value={model.value}>
                                                {model.label} {model.price > 0 ? `($${model.price})` : ''}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                            <div className="model-description">
                                {(() => {
                                    const allModels = [...IMAGE_MODELS.openai, ...IMAGE_MODELS.gemini, ...IMAGE_MODELS.replicate];
                                    return allModels.find(m => m.value === selectedImageModel)?.description || '';
                                })()}
                            </div>
                        </div>

                        {/* Generate Button */}
                        <div className="form-actions">
                            <button className="generate-btn" onClick={handleGenerate}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                                </svg>
                                <span>
                                    {(() => {
                                        const allModels = [...IMAGE_MODELS.openai, ...IMAGE_MODELS.gemini, ...IMAGE_MODELS.replicate];
                                        const price = allModels.find(m => m.value === selectedImageModel)?.price || 0;
                                        return price > 0 ? `Tạo Thiết Kế ($${price})` : 'Tạo Thiết Kế (Miễn phí)';
                                    })()}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
