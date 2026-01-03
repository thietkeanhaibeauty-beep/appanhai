import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Receipt, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast as sonnerToast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Transaction {
  id: string;
  package_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  transaction_code?: string;
  created_at: string;
}

export default function Billing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await (supabase as any)
        .from('payment_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);

    } catch (error) {
      console.error('❌ Error loading transactions:', error);
      sonnerToast.error('Không thể tải lịch sử thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Hoàn thành</Badge>;
      case 'pending':
        return <Badge variant="secondary">Đang xử lý</Badge>;
      case 'failed':
        return <Badge variant="destructive">Thất bại</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-3 md:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Lịch sử thanh toán</h1>
          <p className="text-muted-foreground text-sm">
            Xem tất cả giao dịch thanh toán và hóa đơn của bạn
          </p>
        </div>

        <div className="flex gap-1">
          <Button variant="outline" onClick={loadTransactions} size="sm">
            <RefreshCw className="mr-1 h-3 w-3" />
            Làm mới
          </Button>
          <Button onClick={() => navigate('/dashboard/packages')} size="sm">
            Thanh toán
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Receipt className="h-4 w-4" />
            Tất cả giao dịch
          </CardTitle>
          <CardDescription className="text-xs">
            {transactions.length} giao dịch
          </CardDescription>
        </CardHeader>
        <CardContent className="py-2 px-4">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-3 text-sm">
                Chưa có giao dịch nào
              </p>
              <Button onClick={() => navigate('/dashboard/packages')} size="sm">
                Xem các gói
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Gói</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Phương thức</TableHead>
                  <TableHead>Mã giao dịch</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.package_id}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {transaction.amount.toLocaleString('vi-VN')} {transaction.currency}
                    </TableCell>
                    <TableCell className="capitalize">
                      {transaction.payment_method.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      {transaction.transaction_code ? (
                        <Badge variant="secondary" className="font-mono text-xs">
                          {transaction.transaction_code}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(transaction.status)}
                        {getStatusBadge(transaction.status)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
