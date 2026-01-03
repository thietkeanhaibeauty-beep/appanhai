import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { VerifyPaymentDialog } from '@/components/superadmin/VerifyPaymentDialog';
import { format } from 'date-fns';

interface PaymentTransaction {
  id: string;
  user_id: string;
  package_id: string;
  amount: number;
  status: string;
  payment_method: string;
  transaction_code?: string;
  created_at: string;
}

export default function Subscriptions() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);

  const loadTransactions = async () => {
    try {
      setLoading(true);

      const { data, error } = await (supabase as any)
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);

    } catch (error) {
      console.error('❌ Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleVerify = (transaction: PaymentTransaction) => {
    setSelectedTransaction(transaction);
    setVerifyDialogOpen(true);
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
        return <Badge variant="default">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
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
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Payment Transactions</h1>
          <p className="text-muted-foreground mt-2">
            Verify payments and manage user subscriptions
          </p>
        </div>

        <Button onClick={loadTransactions} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            {transactions.length} total transactions
            {' • '}
            {transactions.filter(t => t.status === 'pending').length} pending verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {transaction.user_id.slice(0, 8)}...
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{transaction.package_id}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {transaction.amount.toLocaleString('vi-VN')} VNĐ
                    </TableCell>
                    <TableCell>{transaction.payment_method}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(transaction.status)}
                        {getStatusBadge(transaction.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleVerify(transaction)}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Verify
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VerifyPaymentDialog
        open={verifyDialogOpen}
        onOpenChange={setVerifyDialogOpen}
        transaction={selectedTransaction}
        onVerified={loadTransactions}
      />
    </div>
  );
}
