import { useState } from "react";
import { Flower2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getActiveAdAccounts, upsertAdAccount, updateAdAccount } from "@/services/nocodb/facebookAdAccountsService";
import { deleteAllInsightsByUserId } from "@/services/nocodb/facebookInsightsService";
import { useAuth } from "@/contexts/AuthContext";

interface AdAccount {
  id: string;
  name: string;
  account_id: string;
}

interface FacebookAccountSelectorProps {
  onAccountSelected: () => void;
}

const FacebookAccountSelector = ({ onAccountSelected }: FacebookAccountSelectorProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'token' | 'account'>('token');
  const [token, setToken] = useState('');
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleTokenSubmit = async () => {
    if (!token.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập Access Token",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Call edge function to fetch ad accounts
      const { data, error } = await supabase.functions.invoke('fetch-ad-accounts', {
        body: { accessToken: token },
      });

      if (error) throw error;

      if (data.accounts && data.accounts.length > 0) {
        setAccounts(data.accounts);
        setStep('account');
        toast({
          title: "Thành công",
          description: `Tìm thấy ${data.accounts.length} tài khoản quảng cáo`,
        });
      } else {
        toast({
          title: "Không tìm thấy tài khoản",
          description: "Không có tài khoản quảng cáo nào được tìm thấy",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
      toast({
        title: "Lỗi",
        description: "Không thể lấy danh sách tài khoản quảng cáo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = async () => {
    if (!selectedAccountId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn tài khoản quảng cáo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (!user?.id) {
        toast({
          title: "Lỗi",
          description: "Vui lòng đăng nhập",
          variant: "destructive",
        });
        return;
      }

      const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

      // Delete ALL insights from old account

      try {
        await deleteAllInsightsByUserId(user.id);


        toast({
          title: "Đang chuyển tài khoản...",
          description: "Đã xóa dữ liệu cũ, đang lưu tài khoản mới...",
        });
      } catch (deleteError) {
        console.error('❌ Failed to delete insights:', deleteError);
        toast({
          title: "⚠️ Cảnh báo",
          description: "Không thể xóa hoàn toàn dữ liệu cũ. Một số dữ liệu có thể còn lại.",
          variant: "destructive"
        });
      }

      // Get all existing accounts and deactivate them
      const existingAccounts = await getActiveAdAccounts(user.id);
      for (const acc of existingAccounts) {
        if (acc.Id) {
          await updateAdAccount(acc.Id, { is_active: false });
        }
      }

      // Insert new account
      await upsertAdAccount({
        account_id: selectedAccount!.account_id,
        account_name: selectedAccount!.name,
        access_token: token,
        is_active: true,
      });

      toast({
        title: "Thành công",
        description: `Đã chuyển sang tài khoản "${selectedAccount!.name}" và xóa toàn bộ dữ liệu cũ`,
      });

      setOpen(false);
      setStep('token');
      setToken('');
      setAccounts([]);
      setSelectedAccountId('');

      // Notify parent to reload data
      onAccountSelected();
    } catch (error) {
      console.error('Error selecting account:', error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu tài khoản quảng cáo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('token');
    setAccounts([]);
    setSelectedAccountId('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Flower2 className="w-4 h-4 mr-2" />
          Facebook Ads
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'token' ? 'Kết nối Facebook Ads' : 'Chọn tài khoản quảng cáo'}
          </DialogTitle>
          <DialogDescription>
            {step === 'token'
              ? 'Nhập Access Token của Facebook để lấy danh sách tài khoản quảng cáo'
              : 'Chọn tài khoản quảng cáo để xem báo cáo'}
          </DialogDescription>
        </DialogHeader>

        {step === 'token' ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token">Facebook Access Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="Nhập Access Token..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTokenSubmit()}
              />
              <p className="text-sm text-muted-foreground">
                Bạn có thể lấy Access Token từ{' '}
                <a
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Facebook Graph API Explorer
                </a>
              </p>
            </div>
            <Button onClick={handleTokenSubmit} disabled={loading} className="w-full">
              {loading ? 'Đang kiểm tra...' : 'Tiếp tục'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account">Chọn tài khoản</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tài khoản quảng cáo..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.account_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Quay lại
              </Button>
              <Button
                onClick={handleAccountSelect}
                disabled={loading || !selectedAccountId}
                className="flex-1"
              >
                {loading ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FacebookAccountSelector;
