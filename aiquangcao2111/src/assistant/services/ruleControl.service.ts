import { AutomationRule, GoldenRuleSet } from '@/types/automationRules';
import { supabase } from '@/integrations/supabase/client';

export type RuleIntent =
  | { type: 'CREATE_RULE'; input: string }
  | { type: 'CREATE_GOLDEN_RULE_SET'; input: string }
  | { type: 'UNKNOWN' };

export interface RuleMatch {
  rule: Partial<AutomationRule>;
  explanation: string;
}

export interface AIRuleResponse {
  success: boolean;
  type?: 'single_rule' | 'golden_rule_set' | 'clarification' | 'message';
  rule?: Partial<AutomationRule>;
  goldenRuleSet?: Partial<GoldenRuleSet>;
  question?: string;
  suggestedOptions?: string[];
  message?: string;
  explanation?: string;
  error?: string;
}

// =============================================================================
// 🔍 INTENT DETECTION - Simplified 2-step flow
// =============================================================================
export function parseRuleIntent(input: string): RuleIntent {
  const lower = input.toLowerCase().trim();

  // Step 1: Check for TRIGGER keywords (user wants to start rule creation)
  const triggerKeywords = [
    'tạo quy tắc', 'tạo rule', 'tạo quy tắc mới',
    'thiết lập quy tắc', 'đặt quy tắc', 'làm quy tắc',
    'create rule', 'new rule'
  ];

  if (triggerKeywords.some(kw => lower.includes(kw))) {
    return { type: 'CREATE_RULE', input }; // Trigger rule flow
  }

  // Step 2: Check if input looks like a RULE DESCRIPTION (has metrics + actions)
  // This is used when user is ALREADY in rule flow and provides description
  const hasMetric = /(?:tiêu|chi|spend|kết quả|result|cpa|chi phí|100k|50k|\d+k)/i.test(lower);
  const hasAction = /(?:tắt|bật|giảm|tăng|scale|off|on|decrease|increase)/i.test(lower);

  if (hasMetric && hasAction) {
    // Determine if it's multi-step or single
    const isMultiStep =
      (lower.match(/,/g) || []).length >= 1 || // Comma-separated
      lower.includes('bước') ||
      lower.includes('ưu tiên') ||
      lower.includes('cắt lỗ') ||
      lower.includes('scale');

    return {
      type: isMultiStep ? 'CREATE_GOLDEN_RULE_SET' : 'CREATE_RULE',
      input
    };
  }

  return { type: 'UNKNOWN' };
}


// =============================================================================
// 🤖 AI RULE GENERATION - Uses Edge Function
// =============================================================================
export async function generateRuleFromInput(
  userId: string,
  input: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<AIRuleResponse> {
  const MAX_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[ruleControl] Attempt ${attempt}/${MAX_RETRIES} - Calling AI Edge Function...`);

      // Get current session to ensure auth header is sent
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[ruleControl] Session exists:', !!session, 'User:', session?.user?.id);

      if (!session) {
        return { success: false, error: 'Vui lòng đăng nhập lại để sử dụng tính năng này.' };
      }

      // Call Edge Function instead of direct OpenAI API
      const { data, error } = await supabase.functions.invoke('create-automation-rule-with-ai', {
        body: {
          userId: userId, // Pass userId explicitly
          userRequest: input,
          conversationHistory: history.slice(-5).map(m => ({ role: m.role, content: m.content }))
        }
      });

      console.log('[ruleControl] Edge Function response:', { data, error });

      if (error) {
        // Check if it's a connection error - retry
        if (error.message?.includes('Failed to fetch') ||
          error.message?.includes('CONNECTION') ||
          error.message?.includes('timeout')) {
          console.warn(`[ruleControl] Connection error on attempt ${attempt}, will retry...`);
          if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 1000 * attempt)); // Wait 1s, 2s...
            continue;
          }
        }
        console.error('[ruleControl] Edge Function error:', error);
        return { success: false, error: error.message || 'Lỗi khi gọi AI' };
      }

      if (!data || !data.success) {
        return { success: false, error: data?.error || 'Không có phản hồi từ AI' };
      }

      console.log('[ruleControl] AI response type:', data.type);

      // Handle different response types
      switch (data.type) {
        case 'single_rule':
          return {
            success: true,
            type: 'single_rule',
            rule: {
              ...data.rule,
              user_id: userId,
              is_active: true,
              apply_to: 'all'
            },
            explanation: data.explanation,
            message: `✅ Đã tạo quy tắc: **${data.rule?.rule_name}**\n\n${data.explanation}`
          };

        case 'golden_rule_set':
          return {
            success: true,
            type: 'golden_rule_set',
            goldenRuleSet: {
              ...data.goldenRuleSet,
              user_id: userId,
              is_active: true
            },
            explanation: data.explanation,
            message: `✅ Đã tạo **Bộ quy tắc vàng**: **${data.goldenRuleSet?.name}**\n\n${data.explanation}\n\n📋 Gồm ${data.goldenRuleSet?.basic_rules?.length || 0} bước`
          };

        case 'clarification':
          return {
            success: true,
            type: 'clarification',
            question: data.question,
            suggestedOptions: data.suggestedOptions || [],
            message: `❓ ${data.question}`
          };

        case 'message':
          return {
            success: true,
            type: 'message',
            message: data.message
          };

        default:
          return { success: false, error: 'Unknown response type from AI' };
      }

    } catch (error: any) {
      console.error('[ruleControl] Error:', error);
      // On error, retry if within limit
      if (attempt < MAX_RETRIES) {
        console.warn(`[ruleControl] Error on attempt ${attempt}, retrying...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      return {
        success: false,
        error: error.message || 'Có lỗi xảy ra khi gọi AI.'
      };
    }
  }

  // Should never reach here, but TypeScript needs a return
  return { success: false, error: 'Đã hết số lần thử' };
}

// =============================================================================
// 🏷️ HELPER: Check if response is Golden Rule Set
// =============================================================================
export function isGoldenRuleSetResponse(response: AIRuleResponse): boolean {
  return response.success && response.type === 'golden_rule_set';
}

export function isSingleRuleResponse(response: AIRuleResponse): boolean {
  return response.success && response.type === 'single_rule';
}

export function isClarificationResponse(response: AIRuleResponse): boolean {
  return response.success && response.type === 'clarification';
}
