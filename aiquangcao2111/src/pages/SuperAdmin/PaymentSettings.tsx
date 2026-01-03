import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save, Key, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPaymentSettings,
  updatePaymentSetting,
  type PaymentSetting
} from '@/services/nocodb/paymentSettingsService';

export default function PaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({
    web2m_api_token: '',
    bank_code: 'VCB',
    bank_account_number: '',
    bank_account_name: '',
    bank_password: '',
    payment_description_template: 'THANHTOAN {code}',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await getPaymentSettings();
      const settingsMap: Record<string, string> = {};
      data.forEach((setting: PaymentSetting) => {
        settingsMap[setting.setting_key] = setting.setting_value;
      });
      setSettings(prev => ({ ...prev, ...settingsMap }));
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Không thể tải cài đặt');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const settingsToUpdate = Object.entries(settings).filter(([_, value]) => value);
      
      await Promise.all(
        settingsToUpdate.map(([key, value]) =>
          updatePaymentSetting(key, value)
        )
      );
      
      toast.success('Đã lưu cài đặt thành công');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Không thể lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
        <h2 className="text-3xl font-bold tracking-tight">Cài đặt thanh toán</h2>
        <p className="text-muted-foreground">
          Cấu hình API Web2M và thông tin ngân hàng
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Cấu hình API Web2M
            </CardTitle>
            <CardDescription>
              Token API từ api.web2m.com để kiểm tra giao dịch tự động
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="web2m_api_token">API Token Web2M</Label>
              <Input
                id="web2m_api_token"
                type="password"
                placeholder="Nhập token từ api.web2m.com"
                value={settings.web2m_api_token}
                onChange={(e) => handleChange('web2m_api_token', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Lấy token tại{' '}
                <a 
                  href="https://api.web2m.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  api.web2m.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Thông tin ngân hàng nhận tiền
            </CardTitle>
            <CardDescription>
              Cấu hình tài khoản ngân hàng để nhận thanh toán
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_code">Mã ngân hàng</Label>
                <Input
                  id="bank_code"
                  placeholder="VCB, ACB, MB..."
                  value={settings.bank_code}
                  onChange={(e) => handleChange('bank_code', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account_number">Số tài khoản</Label>
                <Input
                  id="bank_account_number"
                  placeholder="0123456789"
                  value={settings.bank_account_number}
                  onChange={(e) => handleChange('bank_account_number', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_account_name">Tên chủ tài khoản</Label>
              <Input
                id="bank_account_name"
                placeholder="NGUYEN VAN A"
                value={settings.bank_account_name}
                onChange={(e) => handleChange('bank_account_name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_password">Mật khẩu ngân hàng (cho API Web2M)</Label>
              <Input
                id="bank_password"
                type="password"
                placeholder="Mật khẩu tài khoản ngân hàng"
                value={settings.bank_password}
                onChange={(e) => handleChange('bank_password', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                API Web2M cần mật khẩu để kiểm tra lịch sử giao dịch
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_description_template">
                Mẫu nội dung chuyển khoản
              </Label>
              <Textarea
                id="payment_description_template"
                placeholder="THANHTOAN {code}"
                value={settings.payment_description_template}
                onChange={(e) => handleChange('payment_description_template', e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Sử dụng {'{code}'} cho mã giao dịch. VD: "THANHTOAN {'{code}'}" → "THANHTOAN ABC123"
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </Button>
      </div>
    </div>
  );
}