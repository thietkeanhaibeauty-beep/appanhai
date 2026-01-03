import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { MessageLoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Phone, Tag, RefreshCw } from "lucide-react";
import { getConversationMessages, sendMessage } from "@/services/facebook";
import { extractPhoneNumber } from "@/services/ai";
import { callServiceWithRetry } from "@/utils/apiHelpers";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import type { Conversation, Message } from "@/types";

interface ConversationDetailProps {
  conversation: Conversation;
  pageToken: string;
  onBack?: () => void;
}

export function ConversationDetail({
  conversation,
  pageToken,
  onBack,
}: ConversationDetailProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [extractedPhone, setExtractedPhone] = useState<string | null>(null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const result = await callServiceWithRetry(
        () => getConversationMessages(conversation.id, pageToken),
        { maxRetries: 3 }
      );

      if (result.success && result.data) {
        setMessages(result.data.reverse()); // Oldest first
      } else {
        toast({
          title: "Lỗi tải tin nhắn",
          description: result.error?.message || "Không thể tải tin nhắn",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi tải tin nhắn",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return;

    setSending(true);
    try {
      const result = await callServiceWithRetry(
        () => sendMessage(conversation.id, messageText.trim(), pageToken),
        { maxRetries: 3 }
      );

      if (result.success) {
        setMessageText("");
        toast({
          title: "Đã gửi",
          description: "Tin nhắn đã được gửi thành công",
        });
        
        // Reload messages after a short delay
        setTimeout(() => {
          loadMessages();
        }, 1000);
      } else {
        toast({
          title: "Lỗi gửi tin nhắn",
          description: result.error?.message || "Không thể gửi tin nhắn",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi gửi tin nhắn",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleExtractPhone = async () => {
    setExtracting(true);
    try {
      const conversationText = messages
        .map((m) => `${m.from.name}: ${m.message}`)
        .join("\n");

      const phone = await extractPhoneNumber(conversationText);

      if (phone) {
        setExtractedPhone(phone);
        toast({
          title: "Đã trích xuất số điện thoại",
          description: phone,
        });
      } else {
        toast({
          title: "Không tìm thấy",
          description: "Không tìm thấy số điện thoại trong hội thoại",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể trích xuất số điện thoại",
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

  const participant = conversation.participants.data[0];

  return (
    <ErrorBoundary>
      <Card className="flex flex-col h-full">
        {/* Header */}
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-semibold text-primary">
                  {participant?.name?.[0] || "?"}
                </span>
              </div>
              <div>
                <CardTitle className="text-lg">
                  {participant?.name || "Unknown"}
                </CardTitle>
                {participant?.email && (
                  <p className="text-xs text-muted-foreground">
                    {participant.email}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {extractedPhone && (
                <Badge variant="default" className="gap-1">
                  <Phone className="w-3 h-3" />
                  {extractedPhone}
                </Badge>
              )}
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleExtractPhone}
                disabled={extracting || loading}
              >
                {extracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang trích xuất...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Trích xuất SĐT
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={loadMessages}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <MessageLoadingSkeleton />
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Chưa có tin nhắn
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <CardContent className="border-t p-4">
          {conversation.can_reply === false ? (
            <div className="text-center text-sm text-muted-foreground p-4 bg-muted rounded-lg">
              Không thể trả lời hội thoại này
            </div>
          ) : (
            <div className="flex gap-2">
              <Textarea
                placeholder="Nhập tin nhắn..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="min-h-[60px] max-h-[120px]"
                disabled={sending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={sending || !messageText.trim()}
                className="flex-shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
}

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isFromPage = message.from.id.startsWith("page_"); // Simple heuristic
  const timeAgo = formatDistanceToNow(new Date(message.created_time), {
    addSuffix: true,
    locale: vi,
  });

  return (
    <div className={`flex ${isFromPage ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex gap-2 max-w-[70%] ${
          isFromPage ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              isFromPage ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {message.from.name?.[0] || "?"}
          </div>
        </div>

        {/* Message Content */}
        <div>
          <div
            className={`rounded-lg p-3 ${
              isFromPage
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.message}
            </p>
          </div>

          <div
            className={`text-xs text-muted-foreground mt-1 ${
              isFromPage ? "text-right" : "text-left"
            }`}
          >
            {timeAgo}
          </div>
        </div>
      </div>
    </div>
  );
}
