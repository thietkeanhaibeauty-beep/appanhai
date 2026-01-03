import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Shield, User, UserCog, Coins, Plus, Wallet } from 'lucide-react';
import { AppRole } from '@/services/nocodb/userRolesService';

export interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: AppRole[];
  totalTokens?: number;  // Tokens đã dùng
  tokenBalance?: number; // Số dư tokens
}

interface UserTableProps {
  users: UserWithRoles[];
  onAssignRole: (userId: string) => void;
  onRemoveRole: (userId: string, role: AppRole) => void;
  onDeleteUser: (userId: string) => void;
  onAddTokens?: (userId: string, email: string) => void;
}

const roleConfig = {
  super_admin: {
    label: 'Quản trị viên cao cấp',
    icon: Shield,
    variant: 'destructive' as const,
  },
  admin: {
    label: 'Quản trị viên',
    icon: UserCog,
    variant: 'default' as const,
  },
  user: {
    label: 'Người dùng',
    icon: User,
    variant: 'secondary' as const,
  },
};

export const UserTable: React.FC<UserTableProps> = ({
  users,
  onAssignRole,
  onRemoveRole,
  onDeleteUser,
  onAddTokens,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead className="text-right">Số dư tokens</TableHead>
            <TableHead className="text-right">Đã dùng</TableHead>
            <TableHead>Ngày tạo</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Không tìm thấy người dùng
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.full_name || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.length === 0 ? (
                      <Badge variant="outline">Chưa có vai trò</Badge>
                    ) : (
                      user.roles.map((role) => {
                        const config = roleConfig[role];
                        const RoleIcon = config.icon;
                        return (
                          <Badge key={role} variant={config.variant}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        );
                      })
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Wallet className="h-3 w-3 text-green-500" />
                    <span className="font-mono font-semibold text-green-600">{user.tokenBalance?.toLocaleString() || '0'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Coins className="h-3 w-3 text-yellow-500" />
                    <span className="font-mono">{user.totalTokens?.toLocaleString() || '0'}</span>
                  </div>
                </TableCell>
                <TableCell>{formatDate(user.created_at)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onAssignRole(user.id)}>
                        Gán vai trò
                      </DropdownMenuItem>
                      {onAddTokens && (
                        <DropdownMenuItem onClick={() => onAddTokens(user.id, user.email)}>
                          <Plus className="h-4 w-4 mr-2 text-green-500" />
                          Thêm tokens
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {user.roles.map((role) => (
                        <DropdownMenuItem
                          key={role}
                          onClick={() => onRemoveRole(user.id, role)}
                          className="text-destructive"
                        >
                          Xóa {roleConfig[role].label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDeleteUser(user.id)}
                        className="text-destructive"
                      >
                        Xóa người dùng
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
