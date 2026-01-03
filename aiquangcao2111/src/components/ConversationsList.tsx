import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ConversationLoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Search, MessageSquare, Clock } from "lucide-react";
import { getConversations } from "@/services/facebook";
import { callServiceWithRetry } from "@/utils/apiHelpers";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import type { Conversation } from "@/types";

interface ConversationsListProps {
  pageId: string;
  pageToken: string;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string;
}

export function ConversationsList({
  pageId,
  pageToken,
  onSelectConversation,
  selectedConversationId,
}: ConversationsListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadConversations();
  }, [pageId, pageToken]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const result = await callServiceWithRetry(
        () => getConversations(pageId, pageToken),
        { maxRetries: 3 }
      );

      if (result.success && result.data) {
        setConversations(result.data);
      } else {
        toast({
          title: "Lỗi tải hội thoại",
          description: result.error?.message || "Không thể tải danh sách hội thoại",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi tải hội thoại",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    
    const participantNames = conv.participants.data
      .map((p) => p.name.toLowerCase())
      .join(" ");
    
    const snippet = (conv.snippet || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return participantNames.includes(query) || snippet.includes(query);
  });

  if (loading) {
    return <ConversationLoadingSkeleton />;
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full">
        {/* Search Header */}
        <div className="p-4 border-b bg-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Tìm kiếm hội thoại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="mt-2 text-sm text-muted-foreground">
            {filteredConversations.length} hội thoại
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? "Không tìm thấy hội thoại" : "Chưa có hội thoại"}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={conversation.id === selectedConversationId}
                  onClick={() => onSelectConversation(conversation)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </ErrorBoundary>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  const participant = conversation.participants.data[0];
  const timeAgo = conversation.updated_time
    ? formatDistanceToNow(new Date(conversation.updated_time), {
        addSuffix: true,
        locale: vi,
      })
    : "";

  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-accent/50 ${
        isSelected ? "bg-accent border-primary" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold truncate">
                {participant?.name || "Unknown"}
              </h3>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <Clock className="w-3 h-3" />
                <span>{timeAgo}</span>
              </div>
            </div>

            {/* Snippet */}
            {conversation.snippet && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {conversation.snippet}
              </p>
            )}

            {/* Badges */}
            <div className="flex gap-2 mt-2">
              {conversation.unread_count && conversation.unread_count > 0 && (
                <Badge variant="default" className="text-xs">
                  {conversation.unread_count} mới
                </Badge>
              )}
              
              {conversation.message_count && (
                <Badge variant="secondary" className="text-xs">
                  {conversation.message_count} tin nhắn
                </Badge>
              )}
              
              {!conversation.can_reply && (
                <Badge variant="destructive" className="text-xs">
                  Không thể trả lời
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
