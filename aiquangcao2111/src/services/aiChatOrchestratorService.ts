// AI Chat Orchestrator Service - Điều phối toàn bộ quy trình
import { supabase } from "@/integrations/supabase/client";

export interface ChatIntentResult {
  intent: 'create_quick_campaign' | 'create_creative_campaign' | 'create_audience' | 'clone_campaign' | 'view_effective_campaigns' | 'view_effective_adsets' | 'provide_missing_info' | 'edit_info' | 'confirm' | 'cancel' | 'unknown';
  confidence: number;
  extractedData?: {
    campaignName?: string | null;
    budget?: number | null;
    ageMin?: number | null;
    ageMax?: number | null;
    gender?: number | null;
    locations?: string[] | null;
    interestKeywords?: string[] | null;
    postUrl?: string | null;
    locationRadius?: number | null;
    adContent?: string | null;
    adHeadline?: string | null;
    greetingText?: string | null;
    iceBreakerQuestions?: string[] | null;
    hasMedia?: boolean | null;
  };
  missingFieldValue?: string | number | null;
}

export const detectChatIntent = async (
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ChatIntentResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-intent', {
      body: {
        message: userMessage,
        conversationHistory: conversationHistory.slice(-6)
      }
    });

    if (error) {
      console.error('[detectChatIntent] Error:', error);
      return { intent: 'unknown', confidence: 0 };
    }

    return data as ChatIntentResult;
  } catch (error) {
    console.error('[detectChatIntent] Exception:', error);
    return { intent: 'unknown', confidence: 0 };
  }
};
