import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle, Plus } from "lucide-react";
import { deleteLabel, createLabel, CampaignLabel } from "@/services/nocodb/campaignLabelsService";
import { toast as sonnerToast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LabelsManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: CampaignLabel[];
  onLabelsChange: () => void;
  userId?: string;
}

const predefinedColors = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#14b8a6', '#a855f7', '#06b6d4', '#22c55e', '#eab308', '#f43f5e', '#6366f1',
];

export function LabelsManagerDialog({
  open,
  onOpenChange,
  labels,
  onLabelsChange,
  userId
}: LabelsManagerDialogProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CampaignLabel | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  const handleCreateLabel = async () => {
    if (!userId) {
      sonnerToast.error("Vui lòng đăng nhập để tạo nhãn");
      return;
    }
    if (!newLabelName.trim()) {
      sonnerToast.error("Vui lòng nhập tên nhãn");
      return;
    }

    setIsCreatingLabel(true);
    try {
      await createLabel({
        label_name: newLabelName.trim(),
        label_color: newLabelColor,
        user_id: userId
      });

      sonnerToast.success(`Đã tạo nhãn "${newLabelName}"`);
      setNewLabelName('');
      setNewLabelColor('#3b82f6');
      onLabelsChange();
    } catch (error: any) {
      console.error('Error creating label:', error);
      sonnerToast.error(`Lỗi khi tạo nhãn: ${error.message}`);
    } finally {
      setIsCreatingLabel(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      // Delete all labels one by one
      for (const label of labels) {
        if (label.Id) {
          await deleteLabel(label.Id);
        }
      }
      sonnerToast.success(`Đã xóa tất cả ${labels.length} nhãn`);
      onLabelsChange();
    } catch (error: any) {
      console.error('Error deleting all labels:', error);
      sonnerToast.error(`Lỗi khi xóa nhãn: ${error.message}`);
    } finally {
      setDeletingAll(false);
    }
  };

  const handleDelete = async (label: CampaignLabel) => {
    if (!label.Id) {
      sonnerToast.error('Không thể xóa nhãn này');
      return;
    }

    setDeletingId(label.Id);
    try {
      await deleteLabel(label.Id);
      sonnerToast.success(`Đã xóa nhãn: ${label.label_name}`);
      onLabelsChange();
    } catch (error: any) {
      console.error('Error deleting label:', error);
      sonnerToast.error(`Lỗi: ${error.message}`);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <Dialog open={open && !confirmDelete} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Quản lý nhãn dán</span>
              {labels.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                >
                  {deletingAll ? 'Đang xóa...' : `Xóa tất cả (${labels.length})`}
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              Xóa các nhãn không còn sử dụng. Lưu ý: Xóa nhãn sẽ không xóa các quy tắc đã sử dụng nhãn này.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Create Label Form */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <Label className="text-sm font-medium">Tạo nhãn mới</Label>
              <div>
                <Label htmlFor="label-name" className="text-xs">Tên nhãn</Label>
                <Input
                  id="label-name"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Ví dụ: Chiến dịch quan trọng"
                  className="mt-1.5"
                  disabled={isCreatingLabel}
                />
              </div>

              <div>
                <Label className="text-xs">Màu sắc</Label>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {predefinedColors.map((color, index) => (
                    <button
                      key={`${color}-${index}`}
                      type="button"
                      onClick={() => setNewLabelColor(color)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                        newLabelColor === color ? "border-foreground ring-2 ring-foreground ring-offset-2" : "border-muted"
                      )}
                      style={{ backgroundColor: color }}
                      disabled={isCreatingLabel}
                      title={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={newLabelColor}
                    onChange={(e) => setNewLabelColor(e.target.value)}
                    className="w-8 h-8 rounded-full cursor-pointer border-2 border-muted"
                    disabled={isCreatingLabel}
                    title="Chọn màu tùy chỉnh"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateLabel}
                  disabled={isCreatingLabel || !newLabelName.trim()}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isCreatingLabel ? 'Đang tạo...' : 'Tạo nhãn'}
                </Button>
                {newLabelName && (
                  <Badge
                    style={{ backgroundColor: newLabelColor }}
                    className="text-white"
                  >
                    {newLabelName}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto">
              <Label className="text-sm font-medium">Danh sách nhãn ({labels.length})</Label>
              {labels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có nhãn nào.
                </div>
              ) : (
                <div className="space-y-2">
                  {labels.map((label) => (
                    <div
                      key={label.Id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          style={{ backgroundColor: label.label_color }}
                          className="text-white"
                        >
                          {label.label_name}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ID: {label.Id}
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setConfirmDelete(label);
                        }}
                        disabled={deletingId === label.Id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deletingId === label.Id ? 'Đang xóa...' : 'Xóa'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog - Separate from main dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Xác nhận xóa nhãn
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  Bạn có chắc chắn muốn xóa nhãn{' '}
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white mx-1"
                    style={{ backgroundColor: confirmDelete?.label_color }}
                  >
                    {confirmDelete?.label_name}
                  </span>
                  ? Hành động này không thể hoàn tác.
                </p>
                <p className="mt-2 text-xs">
                  Lưu ý: Các quy tắc đã sử dụng nhãn này sẽ không bị xóa.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete(null)}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Xóa nhãn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
