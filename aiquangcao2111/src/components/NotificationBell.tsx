import { useState, useEffect } from "react";
import { Bell, Check, ChevronDown, ChevronUp, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { getUserNotifications, markNotificationAsRead, Notification } from "@/services/nocodb/notificationService";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";

const NotificationItem = ({ notification, onMarkRead }: { notification: Notification, onMarkRead: (id: string, Id?: number) => void }) => {
    const [expanded, setExpanded] = useState(false);

    const formatTime = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
        } catch (e) {
            return 'Vừa xong';
        }
    };

    // Split content by newline
    const lines = notification.content.split('\n').filter(line => line.trim() !== '');
    const titleLine = lines[0];
    const metricLines = lines.slice(1);

    // Check for automation rule execution
    const hasRules = notification.content.includes('Hoạt động quy tắc');
    const hasFailure = notification.content.includes('❌');
    const hasSuccess = notification.content.includes('✅');

    const handleClick = () => {
        setExpanded(!expanded);
        if (!expanded && !notification.is_read) {
            onMarkRead(notification.id, notification.Id);
        }
    };

    return (
        <div className={cn(
            "p-4 hover:bg-muted/50 transition-colors cursor-pointer group",
            expanded ? "bg-muted/30" : "",
            notification.is_read ? "bg-muted/5" : "bg-white"
        )} onClick={handleClick}>
            <div className="flex justify-between items-start gap-2">
                <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold leading-none text-foreground">{notification.title}</p>

                        {hasRules && (
                            <>
                                {hasFailure ? (
                                    <div className="flex items-center justify-center h-4 w-4 bg-red-100 rounded-full" title="Quy tắc thất bại">
                                        <Bot className="h-3 w-3 text-red-600" />
                                    </div>
                                ) : hasSuccess ? (
                                    <div className="flex items-center justify-center h-4 w-4 bg-green-100 rounded-full" title="Quy tắc thành công">
                                        <Bot className="h-3 w-3 text-green-600" />
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-4 w-4 bg-purple-100 rounded-full" title="Có quy tắc tự động thực thi">
                                        <Bot className="h-3 w-3 text-purple-600" />
                                    </div>
                                )}
                            </>
                        )}

                        {metricLines.length > 0 && (
                            <div className="text-muted-foreground group-hover:text-foreground">
                                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </div>
                        )}
                        {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 inline-block ml-auto" />
                        )}
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">{titleLine}</p>

                        {expanded ? (
                            <div className="space-y-1 pl-2 border-l-2 border-muted mt-1">
                                {metricLines.map((line, idx) => (
                                    <p key={idx} className="text-foreground font-medium">{line}</p>
                                ))}
                            </div>
                        ) : (
                            metricLines.length > 0 && (
                                <p className="text-foreground/70">{metricLines.length} chỉ số chi tiết...</p>
                            )
                        )}
                    </div>

                    <p className="text-[10px] text-muted-foreground pt-1">
                        {formatTime(notification.created_at)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export const NotificationBell = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const loadNotifications = async () => {
        if (!user?.id) return;
        try {
            const data = await getUserNotifications(user.id);
            setNotifications(data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        loadNotifications();
        // Poll every 60 seconds
        const interval = setInterval(loadNotifications, 60000);
        return () => clearInterval(interval);
    }, [user?.id]);

    const handleMarkAsRead = async (id: string, Id?: number) => {
        if (!Id) return;
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            await markNotificationAsRead(Id);
            // Don't show sonnerToast for every read action, it's annoying
        } catch (error) {
            console.error(error);
            // Revert if failed
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n));
        }
    };

    const handleMarkAllRead = async () => {
        const unread = notifications.filter(n => !n.is_read);
        // Optimistic
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

        for (const n of unread) {
            if (n.Id) await markNotificationAsRead(n.Id);
        }
        setOpen(false);
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-background px-1 min-w-[1.25rem]">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold">Thông báo</h4>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs h-auto p-0" onClick={handleMarkAllRead}>
                            Đánh dấu đã đọc tất cả
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            Không có thông báo mới
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <NotificationItem key={notification.id} notification={notification} onMarkRead={handleMarkAsRead} />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};
