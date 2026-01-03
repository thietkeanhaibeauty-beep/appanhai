import { supabase } from '@/integrations/supabase/client';

type Message = { role: "user" | "assistant"; content: string };

export async function streamAIChat({
  messages,
  accountId,
  userName,
  aiSelfPronoun,
  aiUserPronoun,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  accountId?: string;
  userName?: string;
  aiSelfPronoun?: string; // How AI refers to itself (e.g., "Em", "Em yêu")
  aiUserPronoun?: string; // How AI refers to user (e.g., "Anh", "Anh yêu")
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

  try {
    // ✅ Get authenticated user session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      onError("User not authenticated. Please login to use AI chat.");
      return;
    }

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`, // ✅ Use user's JWT token
      },
      body: JSON.stringify({
        messages,
        accountId, // ✅ Pass accountId to edge function
        userName, // ✅ Pass userName to edge function
        aiSelfPronoun, // ✅ AI self reference (e.g., "Em yêu")
        aiUserPronoun, // ✅ AI user reference (e.g., "Anh yêu")
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ error: "Unknown error" }));
      onError(errorData.error || `Request failed with status ${resp.status}`);
      return;
    }

    if (!resp.body) {
      onError("No response body");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;

      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Flush remaining buffer
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          // Ignore partial leftovers
        }
      }
    }

    onDone();
  } catch (error) {
    console.error("Stream error:", error);
    onError(error instanceof Error ? error.message : "Unknown error");
  }
}
