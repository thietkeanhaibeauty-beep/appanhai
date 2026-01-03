import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppRole, assignRole } from '@/services/nocodb/userRolesService';
import { toast } from 'sonner';

interface AssignRoleButtonProps {
  onSuccess?: () => void;
}

export const AssignRoleButton: React.FC<AssignRoleButtonProps> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<AppRole>('user');
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!userId) {
      toast.error('Vui lòng nhập ID người dùng');
      return;
    }

    try {
      setLoading(true);
      await assignRole(userId, role);
      toast.success(`Đã gán vai trò ${role} thành công`);
      setOpen(false);
      setUserId('');
      setRole('user');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast.error(error.message || 'Không thể gán vai trò');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <ShieldPlus className="h-4 w-4 mr-2" />
        Gán vai trò
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gán vai trò cho người dùng</DialogTitle>
            <DialogDescription>
              Gán vai trò cho người dùng bằng cách nhập ID người dùng
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userId">ID người dùng</Label>
              <Input
                id="userId"
                placeholder="Nhập UUID người dùng"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Vai trò</Label>
              <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Người dùng</SelectItem>
                  <SelectItem value="admin">Quản trị viên</SelectItem>
                  <SelectItem value="super_admin">Quản trị viên cao cấp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button onClick={handleAssign} disabled={loading}>
              {loading ? 'Đang gán...' : 'Gán vai trò'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
