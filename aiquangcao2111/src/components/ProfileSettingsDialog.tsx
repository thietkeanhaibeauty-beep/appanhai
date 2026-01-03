import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast as sonnerToast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AIAssistantSettingsSection } from "@/components/ai-chat/AIAssistantSettingsSection";

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProfileSettingsDialog = ({ open, onOpenChange }: ProfileSettingsDialogProps) => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadProfile();
    }
  }, [open, user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('update-user-profile', {
        body: { action: 'get' }
      });

      if (error) throw error;

      if (data?.profile) {
        setFullName(data.profile.full_name || "");
        setEmail(data.profile.email || user.email || "");
        setAvatarUrl(data.profile.avatar_url || "");
      } else {
        setEmail(user.email || "");
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
      setEmail(user.email || "");
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      sonnerToast.error("Không tìm thấy thông tin người dùng");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-user-profile', {
        body: {
          action: 'update',
          full_name: fullName,
          avatar_url: avatarUrl,
        }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to update profile');
      }

      sonnerToast.success("Đã cập nhật thông tin cá nhân");
      window.dispatchEvent(new CustomEvent("profile-updated"));
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      const errorMessage = error?.message || "Không thể cập nhật thông tin";
      sonnerToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cài đặt thông tin cá nhân</DialogTitle>
          <DialogDescription>
            Cập nhật tên, avatar và cài đặt trợ lý AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {getInitials(fullName || email)}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email không thể thay đổi</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Tên đầy đủ</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Nhập tên của bạn"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          {/* AI Assistant Settings Section */}
          {user?.id && (
            <AIAssistantSettingsSection userId={user.id} />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSettingsDialog;
