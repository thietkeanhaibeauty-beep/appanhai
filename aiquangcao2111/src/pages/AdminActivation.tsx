import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function AdminActivation() {
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActivateUser = async () => {
    if (!email) {
      sonnerToast.error('Vui lòng nhập email');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manual-activate-user', {
        body: { email }
      });

      if (error) throw error;

      sonnerToast.success('Kích hoạt tài khoản thành công!');

      if (data.user_id) {
        setUserId(data.user_id);
      }
    } catch (error) {
      console.error('Error activating user:', error);
      sonnerToast.error('Lỗi khi kích hoạt tài khoản: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSuperAdmin = async () => {
    if (!userId) {
      sonnerToast.error('Vui lòng kích hoạt tài khoản trước');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('assign-super-admin', {
        body: { userId }
      });

      if (error) throw error;

      sonnerToast.success('Gán quyền Super Admin thành công!');

    } catch (error) {
      console.error('Error assigning super admin:', error);
      sonnerToast.error('Lỗi khi gán quyền: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Kích hoạt tài khoản Admin</CardTitle>
          <CardDescription>
            Nhập email để kích hoạt và gán quyền quản trị viên
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <Button
              onClick={handleActivateUser}
              disabled={loading || !email}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Kích hoạt tài khoản'
              )}
            </Button>
          </div>

          {userId && (
            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm text-muted-foreground">User ID: {userId}</p>
              <Button
                onClick={handleAssignSuperAdmin}
                disabled={loading}
                variant="secondary"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang gán quyền...
                  </>
                ) : (
                  'Gán quyền Super Admin'
                )}
              </Button>
            </div>
          )}

          <div className="pt-4 text-sm text-muted-foreground">
            <p>Email: {email || 'mospamini@gmail.com'}</p>
            <p className="mt-2">
              Sau khi kích hoạt, bạn có thể đăng nhập bằng tài khoản này.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
