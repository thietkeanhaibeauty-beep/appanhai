import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast as sonnerToast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChangePasswordDialog = ({ open, onOpenChange }: ChangePasswordDialogProps) => {
  const { updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword) {
      sonnerToast.error("Vui lòng nhập mật khẩu mới");
      return;
    }

    if (newPassword.length < 6) {
      sonnerToast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      sonnerToast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    try {
      const { error } = await updatePassword(newPassword);

      if (error) {
        sonnerToast.error(error.message || "Không thể đổi mật khẩu");
        return;
      }

      sonnerToast.success("Đã đổi mật khẩu thành công");
      setNewPassword("");
      setConfirmPassword("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to change password:", error);
      sonnerToast.error("Có lỗi xảy ra khi đổi mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewPassword("");
    setConfirmPassword("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Đổi mật khẩu</DialogTitle>
          <DialogDescription>
            Nhập mật khẩu mới để cập nhật tài khoản
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Mật khẩu mới</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Mật khẩu phải có ít nhất 6 ký tự
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Hủy
          </Button>
          <Button onClick={handleChangePassword} disabled={loading}>
            {loading ? "Đang đổi..." : "Đổi mật khẩu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;
