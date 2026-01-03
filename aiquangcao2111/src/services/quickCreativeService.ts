// Quick Creative Service - Phân tích chiến dịch creative với OpenAI
import { supabase } from "@/integrations/supabase/client";

export interface QuickCreativeParseResult {
  campaignName: string;
  budget: number;
  ageMin: number;
  ageMax: number;
  gender: 'all' | 'male' | 'female';
  locations: string[];
  locationRadius?: number | null;
  // Lifetime budget fields
  budgetType?: 'DAILY' | 'LIFETIME';
  lifetimeBudget?: number;
  startTime?: string;
  endTime?: string;
  enableSchedule?: boolean;
  scheduleSlots?: Array<{
    days: number[];
    startHour: number;
    endHour: number;
  }>;
  _dateError?: string;
  // Other fields
  interestKeywords: string[];
  adContent: string;
  adHeadline: string;
  greetingText?: string;
  iceBreakerQuestions?: string[];
}

export const parseQuickCreativePrompt = async (
  promptText: string
): Promise<QuickCreativeParseResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-parse-creative', {
      body: { promptText }
    });

    if (error) throw error;
    if (!data || !data.data) {
      throw new Error("Không nhận được phản hồi từ AI");
    }

    const parsed = data.data;

    // Validate và normalize data
    // Chuẩn hóa radius: nhận "17", "17km", "17 km" → 17
    const normalizeRadius = (val: any): number | null => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'number' && !isNaN(val)) return val;
      const m = String(val).match(/([\d]+(?:\.\d+)?)/);
      const num = m ? parseFloat(m[1]) : NaN;
      return isNaN(num) ? null : num;
    };

    return {
      campaignName: parsed.campaignName || "Campaign Creative mới",
      budget: Number(parsed.budget) || 400000,
      ageMin: Number(parsed.ageMin) || 18,
      ageMax: Number(parsed.ageMax) || 65,
      gender: ['all', 'male', 'female'].includes(parsed.gender) ? parsed.gender : 'all',
      locations: Array.isArray(parsed.locations) ? parsed.locations : [],
      locationRadius: normalizeRadius(parsed.locationRadius),
      // Lifetime budget fields
      budgetType: parsed.budgetType || 'DAILY',
      lifetimeBudget: parsed.lifetimeBudget ? Number(parsed.lifetimeBudget) : undefined,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      enableSchedule: parsed.enableSchedule,
      scheduleSlots: parsed.scheduleSlots,
      _dateError: parsed._dateError,
      // Other fields
      interestKeywords: Array.isArray(parsed.interestKeywords) ? parsed.interestKeywords : [],
      adContent: parsed.adContent || "",
      adHeadline: parsed.adHeadline || "",
      greetingText: parsed.greetingText,
      iceBreakerQuestions: Array.isArray(parsed.iceBreakerQuestions)
        ? parsed.iceBreakerQuestions.slice(0, 4) // Max 4 ice breakers
        : undefined,
    };
  } catch (error: any) {
    console.error('AI creative parsing error:', error);
    throw new Error(`Lỗi phân tích AI: ${error.message}`);
  }
};
