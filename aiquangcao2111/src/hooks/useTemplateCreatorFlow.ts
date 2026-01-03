import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createServiceTemplate, ServiceTemplate } from '@/services/nocodb/serviceTemplatesService';
import { useToast } from '@/hooks/use-toast';

export interface TemplateFormData {
    keyword: string;
    campaignName: string;
    ageMin: number;
    ageMax: number;
    gender: 'all' | 'male' | 'female';
    budget: number;
    budgetType: 'daily' | 'lifetime';
    locationType: 'country' | 'city' | 'coordinate';
    locationName: string;
    latitude: string;
    longitude: string;
    radiusKm: number;
    interests: string;
    headlines: string;
    greetingText: string;
    frequentQuestions: string;
}

const DEFAULT_FORM_DATA: TemplateFormData = {
    keyword: '',
    campaignName: '',
    ageMin: 18,
    ageMax: 65,
    gender: 'all',
    budget: 200000,
    budgetType: 'daily',
    locationType: 'country',
    locationName: 'Việt Nam',
    latitude: '',
    longitude: '',
    radiusKm: 17,
    interests: '',
    headlines: '',
    greetingText: '',
    frequentQuestions: '',
};

// Keywords that trigger template creation
const TEMPLATE_CREATE_KEYWORDS = [
    'tạo mẫu đối tượng',
    'tạo mẫu nhắm mục tiêu',
    'tạo đối tượng nhắm mục tiêu',
    'tạo template',
    'tạo mẫu',
    'thêm template',
    'thêm mẫu',
    'tạo bảng đối tượng',  // Old keyword, keep for backward compatibility
];

export function useTemplateCreatorFlow() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<TemplateFormData>(DEFAULT_FORM_DATA);

    // Check if message matches template creation intent
    const detectTemplateCreation = useCallback((message: string): boolean => {
        const lowerMessage = message.toLowerCase().trim();
        return TEMPLATE_CREATE_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
    }, []);

    // Show the creator form
    const showCreator = useCallback(() => {
        setFormData(DEFAULT_FORM_DATA);
        setIsCreating(true);
    }, []);

    // Hide the creator form
    const hideCreator = useCallback(() => {
        setIsCreating(false);
        setFormData(DEFAULT_FORM_DATA);
    }, []);

    // Update form data
    const updateFormData = useCallback((updates: Partial<TemplateFormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    }, []);

    // Create template
    const createTemplate = useCallback(async (): Promise<{ success: boolean; templateName?: string; error?: string }> => {
        if (!user?.id) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        if (!formData.keyword.trim()) {
            return { success: false, error: 'Vui lòng nhập từ khóa kích hoạt' };
        }

        setIsSaving(true);

        try {
            // Format keyword with @# prefix
            const formattedKeyword = formData.keyword
                .split(',')
                .map(k => {
                    const cleaned = k.trim().replace(/\s+/g, '_');
                    return cleaned.startsWith('@#') ? cleaned : `@#${cleaned}`;
                })
                .join(', ');

            // Parse arrays from text
            const interestKeywords = formData.interests
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

            const headlines = formData.headlines
                .split('\n')
                .map(s => s.trim())
                .filter(Boolean);

            const frequentQuestions = formData.frequentQuestions
                .split('\n')
                .map(s => s.trim())
                .filter(Boolean);

            // Build template data
            const templateData: Partial<ServiceTemplate> = {
                user_id: user.id,
                name: formattedKeyword,
                campaign_name: formData.campaignName || '',
                template_type: 'message',
                age_min: formData.ageMin,
                age_max: formData.ageMax,
                gender: formData.gender,
                budget: formData.budget,
                budget_type: formData.budgetType,
                location_type: formData.locationType,
                location_name: formData.locationType === 'coordinate' ? '' : formData.locationName,
                latitude: formData.locationType === 'coordinate' ? formData.latitude : '',
                longitude: formData.locationType === 'coordinate' ? formData.longitude : '',
                radius_km: formData.locationType !== 'country' ? formData.radiusKm : undefined,
                interest_keywords: interestKeywords,
                interest_ids: [],
                headline: headlines,
                greeting_template: formData.greetingText || '',
                frequent_questions: frequentQuestions,
                is_default: false,
            };

            await createServiceTemplate(templateData);

            toast({
                title: '✅ Tạo template thành công',
                description: `Template ${formattedKeyword} đã được lưu`,
            });

            hideCreator();
            return { success: true, templateName: formattedKeyword };

        } catch (error: any) {
            console.error('Error creating template:', error);
            toast({
                title: 'Lỗi',
                description: error.message || 'Không thể tạo template',
                variant: 'destructive',
            });
            return { success: false, error: error.message };
        } finally {
            setIsSaving(false);
        }
    }, [user?.id, formData, hideCreator, toast]);

    return {
        // State
        isCreating,
        isSaving,
        formData,

        // Actions
        detectTemplateCreation,
        showCreator,
        hideCreator,
        updateFormData,
        createTemplate,
    };
}
