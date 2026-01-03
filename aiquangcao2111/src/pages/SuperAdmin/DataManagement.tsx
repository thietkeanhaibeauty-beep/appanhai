import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Database, Trash2, Download, RefreshCw, AlertTriangle, FileJson } from 'lucide-react';
import { toast } from 'sonner';
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
import {
  cleanupOldData,
  exportUserData,
  getOrphanedRecords,
  downloadAsJson,
} from '@/services/nocodb/dataManagementService';
import { useAuth } from '@/contexts/AuthContext';

export default function DataManagement() {
  const { user } = useAuth();
  const [orphanedCount, setOrphanedCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [daysOld, setDaysOld] = useState('90');
  const [selectedTable, setSelectedTable] = useState('user_roles');
  const [exportUserId, setExportUserId] = useState('');

  useEffect(() => {
    fetchOrphanedRecords();
  }, []);

  const fetchOrphanedRecords = async () => {
    try {
      const records = await getOrphanedRecords();
      const total = Object.values(records).reduce((sum, count) => sum + count, 0);
      setOrphanedCount(total);
    } catch (error) {
      console.error('Error fetching orphaned records:', error);
    }
  };

  const handleCleanupOldData = async () => {
    if (!daysOld || parseInt(daysOld) < 1) {
      toast.error('Please enter a valid number of days');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete all ${selectedTable} records older than ${daysOld} days? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      const result = await cleanupOldData(parseInt(daysOld), selectedTable);
      toast.success(result.message);
      setCleanupDialogOpen(false);
      fetchOrphanedRecords();
    } catch (error: any) {
      console.error('Error cleaning up data:', error);
      toast.error(error.message || 'Failed to cleanup data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportUserData = async () => {
    if (!exportUserId) {
      toast.error('Please enter a user ID');
      return;
    }

    try {
      setLoading(true);
      const userData = await exportUserData(exportUserId);
      
      // Download as JSON
      const filename = `user_data_${exportUserId}_${new Date().toISOString().split('T')[0]}.json`;
      downloadAsJson(userData, filename);
      
      toast.success('User data exported successfully');
      setExportDialogOpen(false);
      setExportUserId('');
    } catch (error: any) {
      console.error('Error exporting user data:', error);
      toast.error(error.message || 'Failed to export user data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportMyData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userData = await exportUserData(user.id);
      
      const filename = `my_data_${new Date().toISOString().split('T')[0]}.json`;
      downloadAsJson(userData, filename);
      
      toast.success('Your data has been exported');
    } catch (error: any) {
      console.error('Error exporting data:', error);
      toast.error(error.message || 'Failed to export your data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Quản lý dữ liệu</h2>
        <p className="text-muted-foreground">
          Quản lý dữ liệu hệ thống, dọn dẹp và xuất dữ liệu
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Dọn dẹp dữ liệu
            </CardTitle>
            <CardDescription>
              Xóa các bản ghi cũ khỏi cơ sở dữ liệu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setCleanupDialogOpen(true)} 
              className="w-full"
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Dọn dẹp dữ liệu cũ
            </Button>
            <p className="text-sm text-muted-foreground">
              Cấu hình và xóa dữ liệu cũ hơn một ngày cụ thể
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Xuất dữ liệu người dùng
            </CardTitle>
            <CardDescription>
              Xuất dữ liệu người dùng để tuân thủ GDPR
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setExportDialogOpen(true)} 
              variant="outline" 
              className="w-full"
              disabled={loading}
            >
              <FileJson className="h-4 w-4 mr-2" />
              Xuất người dùng cụ thể
            </Button>
            <Button 
              onClick={handleExportMyData}
              variant="outline" 
              className="w-full"
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              Xuất dữ liệu của tôi
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Bản ghi mồ côi
            </CardTitle>
            <CardDescription>
              Các bản ghi thiếu tham chiếu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-destructive">{orphanedCount}</div>
              <p className="text-sm text-muted-foreground mt-1">Bản ghi tìm thấy</p>
            </div>
            <Button 
              onClick={fetchOrphanedRecords} 
              variant="outline" 
              className="w-full"
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Thống kê cơ sở dữ liệu
          </CardTitle>
          <CardDescription>
            Tổng quan về các bảng và số lượng bản ghi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <span className="text-sm font-medium">Bảng hồ sơ</span>
              <Badge variant="outline">Hoạt động</Badge>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <span className="text-sm font-medium">Bảng vai trò người dùng</span>
              <Badge variant="outline">Hoạt động</Badge>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <span className="text-sm font-medium">Bản ghi mồ côi</span>
              <Badge variant={orphanedCount > 0 ? 'destructive' : 'outline'}>
                {orphanedCount}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Dialog */}
      <Dialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dọn dẹp dữ liệu cũ</DialogTitle>
            <DialogDescription>
              Xóa các bản ghi cũ hơn số ngày được chỉ định
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="table">Bảng</Label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user_roles">Vai trò người dùng</SelectItem>
                  <SelectItem value="profiles">Hồ sơ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="days">Số ngày cũ</Label>
              <Input
                id="days"
                type="number"
                placeholder="90"
                value={daysOld}
                onChange={(e) => setDaysOld(e.target.value)}
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Các bản ghi cũ hơn số ngày này sẽ bị xóa
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCleanupDialogOpen(false)}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button onClick={handleCleanupOldData} disabled={loading}>
              {loading ? 'Đang dọn dẹp...' : 'Dọn dẹp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xuất dữ liệu người dùng</DialogTitle>
            <DialogDescription>
              Xuất tất cả dữ liệu cho một người dùng cụ thể (tuân thủ GDPR)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userId">ID người dùng</Label>
              <Input
                id="userId"
                placeholder="Nhập UUID người dùng"
                value={exportUserId}
                onChange={(e) => setExportUserId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Dữ liệu sẽ được xuất dưới dạng file JSON
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button onClick={handleExportUserData} disabled={loading}>
              {loading ? 'Đang xuất...' : 'Xuất'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
