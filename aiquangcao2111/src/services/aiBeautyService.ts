
import { supabase } from "@/integrations/supabase/client";

export interface AIBeautyGenerationParams {
    postLink?: string;
    serviceName: string; // "Dịch vụ"
    location: string;
    budget: number;
    description: string;
    apiKey: string;
    gender?: string;
    age?: string;
    radius?: number;
    interests?: string[];
}

export interface AIBeautyResponse {
    success: boolean;
    data?: {
        campaigns: any[];
    };
    error?: string;
}

/**
 * Generates campaign content using AIBeautyPro API.
 * Currently mocks the response.
 */
export const generateCampaignContent = async (params: AIBeautyGenerationParams): Promise<AIBeautyResponse> => {
    if (!params.apiKey) {
        return {
            success: false,
            error: "Missing AIBeautyPro API Key"
        };
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock Response Data (matching the structure needed for DraftsPage)
    const mockCampaigns = [
        {
            name: `Chiến dịch AIBeauty - ${params.serviceName}`,
            objective: "MESSAGES",
            status: "PAUSED",
            adSets: [
                {
                    name: `Nhóm 1 - ${params.location} - ${params.gender || 'All'}`,
                    dailyBudget: Math.floor(params.budget / 2),
                    targeting: {
                        age_min: params.age ? parseInt(params.age.split('-')[0]) : 18,
                        age_max: params.age ? parseInt(params.age.split('-')[1]) : 65,
                        genders: params.gender === 'Nam' ? [1] : params.gender === 'Nữ' ? [2] : [1, 2],
                        geo_locations: {
                            countries: ['VN'],
                            cities: [{ key: '123', name: params.location, radius: params.radius || 10 }]
                        },
                        interests: params.interests || [
                            { id: '1', name: 'Làm đẹp' },
                            { id: '2', name: 'Spa' },
                            { id: '3', name: 'Chăm sóc da' }
                        ]
                    },
                    ads: [
                        {
                            name: "Quảng cáo 1 - AI Generated",
                            creative: {
                                title: `Ưu đãi ${params.serviceName} tại ${params.location}`,
                                body: `✨ ${params.description}\n\n👉 Đăng ký ngay để nhận ưu đãi đặc biệt!`,
                                link_url: params.postLink || "https://facebook.com/page",
                                image_url: "https://via.placeholder.com/1080x1080?text=AI+Beauty+Ad+1"
                            }
                        }
                    ]
                },
                {
                    name: `Nhóm 2 - Target Rộng`,
                    dailyBudget: Math.floor(params.budget / 2),
                    targeting: {
                        age_min: 25,
                        age_max: 55,
                        genders: [2], // Nữ
                        geo_locations: {
                            countries: ['VN'],
                            cities: [{ key: '123', name: params.location, radius: (params.radius || 10) + 5 }]
                        },
                        interests: [
                            { id: '4', name: 'Mỹ phẩm' },
                            { id: '5', name: 'Trị mụn' }
                        ]
                    },
                    ads: [
                        {
                            name: "Quảng cáo 2 - Variation B",
                            creative: {
                                title: `Giải pháp ${params.serviceName} hiệu quả`,
                                body: `🔥 Cơ hội duy nhất trong tháng này!\n\n${params.description}`,
                                link_url: params.postLink || "https://facebook.com/page",
                                image_url: "https://via.placeholder.com/1080x1080?text=AI+Beauty+Ad+2"
                            }
                        }
                    ]
                }
            ]
        }
    ];

    return {
        success: true,
        data: {
            campaigns: mockCampaigns
        }
    };
};
