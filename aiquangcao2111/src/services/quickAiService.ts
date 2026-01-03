// Quick AI Service - Phân tích chiến dịch với OpenAI
import { supabase } from "@/integrations/supabase/client";

export interface QuickCampaignParseResult {
  campaignName: string;
  adSetName: string;
  adName: string;
  budget: number;
  ageMin: number;
  ageMax: number;
  gender: 'all' | 'male' | 'female';
  locations: string[];
  locationRadius?: number;
  interestKeywords: string[];
  postUrl: string;
  greetingMessage?: string;
  iceBreakers?: Array<{ question: string; payload: string }>;
  headline?: string;
  message?: string;
}

export const parseQuickCampaignPrompt = async (
  promptText: string
): Promise<QuickCampaignParseResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-parse-campaign', {
      body: { promptText }
    });

    if (error) throw error;
    if (!data || !data.data) {
      throw new Error("Không nhận được phản hồi từ AI");
    }

    const parsed = data.data;
    
    // Validate và normalize data
    return {
      campaignName: parsed.campaignName || "Campaign mới",
      adSetName: parsed.adSetName || "AdSet mới",
      adName: parsed.adName || "Ad mới",
      budget: Number(parsed.budget) || 400000,
      ageMin: Number(parsed.ageMin) || 18,
      ageMax: Number(parsed.ageMax) || 65,
      gender: ['all', 'male', 'female'].includes(parsed.gender) ? parsed.gender : 'all',
      locations: Array.isArray(parsed.locations) ? parsed.locations : [],
      locationRadius: parsed.locationRadius ? Number(parsed.locationRadius) : undefined,
      interestKeywords: Array.isArray(parsed.interestKeywords) ? parsed.interestKeywords : [],
      postUrl: parsed.postUrl || "",
      greetingMessage: parsed.greetingMessage,
      iceBreakers: parsed.iceBreakers,
      headline: parsed.headline,
      message: parsed.message,
    };
  } catch (error: any) {
    console.error('AI parsing error:', error);
    throw new Error(`Lỗi phân tích AI: ${error.message}`);
  }
};
