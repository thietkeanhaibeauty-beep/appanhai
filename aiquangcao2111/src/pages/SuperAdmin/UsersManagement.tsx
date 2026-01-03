import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserTable, UserWithRoles } from '@/components/superadmin/UserTable';
import { AssignRoleButton } from '@/components/superadmin/AssignRoleButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw } from 'lucide-react';
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
import { AppRole } from '@/services/nocodb/userRolesService';
import {
  getAllUsers,
  assignRoleToUser,
  removeRoleFromUser,
  deleteUser,
} from '@/services/nocodb/superAdminService';
import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from '@/services/nocodb/config';
import { addCoins } from '@/services/nocodb/userBalancesService';

export default function UsersManagement() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignRoleDialogOpen, setAssignRoleDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('user');

  // Add Tokens Dialog
  const [addTokensDialogOpen, setAddTokensDialogOpen] = useState(false);
  const [tokenUserId, setTokenUserId] = useState<string | null>(null);
  const [tokenUserEmail, setTokenUserEmail] = useState('');
  const [tokensToAdd, setTokensToAdd] = useState('');

  const fetchTokenUsage = async (): Promise<Record<string, number>> => {
    try {
      const headers = await getNocoDBHeaders();
      const response = await fetch(
        `${getNocoDBUrl(NOCODB_CONFIG.TABLES.OPENAI_USAGE_LOGS)}?fields=user_id,total_tokens&limit=10000`,
        { headers }
      );

      if (!response.ok) return {};

      const data = await response.json();
      const logs: { user_id: string; total_tokens: number }[] = data.list || [];

      // Group by user_id and sum tokens
      const tokensByUser: Record<string, number> = {};
      logs.forEach(log => {
        if (log.user_id) {
          tokensByUser[log.user_id] = (tokensByUser[log.user_id] || 0) + (log.total_tokens || 0);
        }
      });

      return tokensByUser;
    } catch (error) {
      console.error('Error fetching token usage:', error);
      return {};
    }
  };

  const fetchTokenBalances = async (): Promise<Record<string, number>> => {
    try {
      const headers = await getNocoDBHeaders();
      const response = await fetch(
        `${getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_BALANCES)}?fields=user_id,balance&limit=10000`,
        { headers }
      );

      if (!response.ok) return {};

      const data = await response.json();
      const balances: { user_id: string; balance: number }[] = data.list || [];

      console.log('🔍 Balances from NocoDB:', balances);

      const balancesByUser: Record<string, number> = {};
      balances.forEach(b => {
        if (b.user_id) {
          balancesByUser[b.user_id] = b.balance || 0;
        }
      });

      console.log('🔍 BalancesByUser map:', balancesByUser);

      return balancesByUser;
    } catch (error) {
      console.error('Error fetching token balances:', error);
      return {};
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch users, token usage and balances in parallel
      const [usersWithRoles, tokensByUser, balancesByUser] = await Promise.all([
        getAllUsers(),
        fetchTokenUsage(),
        fetchTokenBalances()
      ]);

      console.log('🔍 User IDs:', usersWithRoles.map(u => ({ id: u.id, email: u.email })));

      // Merge token data into users
      const usersWithTokens = usersWithRoles.map(user => ({
        ...user,
        totalTokens: tokensByUser[user.id] || 0,
        tokenBalance: balancesByUser[user.id] || 0
      }));

      setUsers(usersWithTokens);
      setFilteredUsers(usersWithTokens);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(
        (user) =>
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const handleAssignRole = (userId: string) => {
    setSelectedUserId(userId);
    setAssignRoleDialogOpen(true);
  };

  const handleConfirmAssignRole = async () => {
    if (!selectedUserId) return;

    try {
      await assignRoleToUser(selectedUserId, selectedRole);
      toast.success(`Đã gán vai trò ${selectedRole} thành công`);
      setAssignRoleDialogOpen(false);
      setSelectedUserId(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      if (error.message?.includes('already has this role')) {
        toast.error('Người dùng đã có vai trò này');
      } else {
        toast.error('Không thể gán vai trò');
      }
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    try {
      await removeRoleFromUser(userId, role);
      toast.success(`Đã xóa vai trò ${role} thành công`);
      fetchUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Không thể xóa vai trò');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác và sẽ xóa tất cả dữ liệu liên quan.'
    );

    if (!confirmed) return;

    try {
      await deleteUser(userId);
      toast.success('Đã xóa người dùng thành công');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      if (error.message?.includes('last super admin')) {
        toast.error('Không thể xóa quản trị viên cao cấp cuối cùng');
      } else if (error.message?.includes('your own account')) {
        toast.error('Không thể xóa tài khoản của chính bạn');
      } else {
        toast.error('Không thể xóa người dùng');
      }
    }
  };

  const handleAddTokens = (userId: string, email: string) => {
    setTokenUserId(userId);
    setTokenUserEmail(email);
    setTokensToAdd('');
    setAddTokensDialogOpen(true);
  };

  const handleConfirmAddTokens = async () => {
    if (!tokenUserId || !tokensToAdd) return;

    const amount = parseInt(tokensToAdd);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Số lượng tokens không hợp lệ');
      return;
    }

    try {
      await addCoins(tokenUserId, amount);
      toast.success(`Đã thêm ${amount.toLocaleString()} tokens cho ${tokenUserEmail}`);
      setAddTokensDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error adding tokens:', error);
      toast.error('Không thể thêm tokens');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Quản lý người dùng</h2>
        <p className="text-muted-foreground">
          Quản lý người dùng và phân quyền
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo email hoặc tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <AssignRoleButton onSuccess={fetchUsers} />
        <Button onClick={fetchUsers} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Làm mới
        </Button>
      </div>

      <UserTable
        users={filteredUsers}
        onAssignRole={handleAssignRole}
        onRemoveRole={handleRemoveRole}
        onDeleteUser={handleDeleteUser}
        onAddTokens={handleAddTokens}
      />

      <Dialog open={assignRoleDialogOpen} onOpenChange={setAssignRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Phân quyền</DialogTitle>
            <DialogDescription>
              Chọn vai trò để gán cho người dùng này
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as AppRole)}
            >
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignRoleDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleConfirmAssignRole}>Gán</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tokens Dialog */}
      <Dialog open={addTokensDialogOpen} onOpenChange={setAddTokensDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Tokens</DialogTitle>
            <DialogDescription>
              Thêm tokens cho: <strong>{tokenUserEmail}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              placeholder="Nhập số lượng tokens"
              value={tokensToAdd}
              onChange={(e) => setTokensToAdd(e.target.value)}
              min="1"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddTokensDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleConfirmAddTokens}>Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
