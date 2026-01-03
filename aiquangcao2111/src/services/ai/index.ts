// AI Service API
// This service handles AI-powered features
// CRITICAL: All AI operations must go through Edge Functions for security

import { supabase } from '@/integrations/supabase/client';
import type { Interest, ChatMessage } from '@/types';

// ============================================================================
// PHONE NUMBER EXTRACTION
// ============================================================================

export async function extractPhoneNumber(
  conversationText: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-extract-phone', {
      body: { conversationText }
    });
    
    if (error) throw error;
    return data?.phoneNumber || null;
  } catch (error) {
    console.error('Error extracting phone number:', error);
    throw new Error('Failed to extract phone number');
  }
}

// ============================================================================
// AUDIENCE ANALYSIS
// ============================================================================

export async function analyzeAudience(
  targetingData: {
    countries: string[];
    ageRange: [number, number];
    gender: 'all' | 'male' | 'female';
    interests: Interest[];
  }
): Promise<{
  analysis: string;
  suggestions: string[];
  score: number;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-analyze-audience', {
      body: { targetingData }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error analyzing audience:', error);
    throw new Error('Failed to analyze audience');
  }
}

// ============================================================================
// CREATIVE ANALYSIS
// ============================================================================

export async function analyzeCreative(
  creativeData: {
    message: string;
    hasImage: boolean;
    hasVideo: boolean;
  }
): Promise<{
  analysis: string;
  suggestions: string[];
  score: number;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-analyze-creative', {
      body: { creativeData }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error analyzing creative:', error);
    throw new Error('Failed to analyze creative');
  }
}

// ============================================================================
// AI CHAT
// ============================================================================

export async function* streamChatResponse(
  messages: ChatMessage[]
): AsyncGenerator<string, void, unknown> {
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
  
  // ✅ Get authenticated user session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("User not authenticated. Please login to use AI chat.");
  }

  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`, // ✅ Use user's JWT token
    },
    body: JSON.stringify({ messages }),
  });
  
  if (!response.ok || !response.body) {
    throw new Error('Failed to start chat stream');
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    textBuffer += decoder.decode(value, { stream: true });
    
    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;
      
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') return;
      
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        textBuffer = line + '\n' + textBuffer;
        break;
      }
    }
  }
  
  // Flush remaining buffer
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split('\n')) {
      if (!raw || raw.startsWith(':')) continue;
      if (!raw.startsWith('data: ')) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch { /* ignore */ }
    }
  }
}

// Helper function for non-streaming chat (if needed)
export async function sendChatMessage(
  messages: ChatMessage[]
): Promise<string> {
  let fullResponse = '';
  for await (const chunk of streamChatResponse(messages)) {
    fullResponse += chunk;
  }
  return fullResponse;
}
