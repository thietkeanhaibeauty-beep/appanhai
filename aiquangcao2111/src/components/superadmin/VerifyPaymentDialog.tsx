import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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

interface VerifyPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: PaymentTransaction | null;
  onVerified: () => void;
}

export const VerifyPaymentDialog: React.FC<VerifyPaymentDialogProps> = ({
  open,
  onOpenChange,
  transaction,
  onVerified,
}) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (!transaction || !user) return;

    try {
      setVerifying(true);

      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: {
          transactionId: transaction.id,
          userId: transaction.user_id,
          adminId: user.id,
          notes,
        },
      });

      if (error) throw error;

      toast.success('✅ Payment verified successfully!');
      onVerified();
      onOpenChange(false);
      setNotes('');
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to verify payment');
    } finally {
      setVerifying(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Verify Payment
          </DialogTitle>
          <DialogDescription>
            Verify this payment transaction and activate user subscription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Transaction Details</Label>
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID:</span>
                <Badge variant="outline" className="font-mono">
                  {transaction.id.slice(0, 8)}...
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Package:</span>
                <Badge>{transaction.package_id}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold">
                  {transaction.amount.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method:</span>
                <span>{transaction.payment_method}</span>
              </div>
              {transaction.transaction_code && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction Code:</span>
                  <Badge variant="secondary" className="font-mono">
                    {transaction.transaction_code}
                  </Badge>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={transaction.status === 'pending' ? 'secondary' : 'default'}>
                  {transaction.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Verification Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this verification..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">⚠️ Action Required:</p>
            <p className="text-muted-foreground">
              By verifying this payment, you will:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li>Mark the transaction as completed</li>
              <li>Activate or extend the user's subscription</li>
              <li>Grant access to package features</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={verifying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={verifying}
          >
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Verify & Activate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
