import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  QrCode,
  Building2,
  Copy,
  CheckCircle2,
  Upload,
  ArrowLeft,
  Loader2,
  Info,
  CreditCard,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast as sonnerToast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { parseVnpayReturn, isPaymentSuccess, getResponseMessage } from '@/services/vnpay/vnpayService';
import { checkPaymentStatus, generateVietQRUrl, formatTransferContent, VIETQR_BANK_CODES } from '@/services/web2m/web2mService';
import { getPaymentPackages } from '@/services/nocodb/paymentPackagesService';
import { getTokenPackages } from '@/services/nocodb/tokenPackagesService';

type PaymentMethod = 'qr_transfer' | 'vnpay' | 'bank_transfer';

export default function Payment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const packageId = searchParams.get('package');
  const paymentType = searchParams.get('type'); // 'token' for token top-up
  const tokenPackageId = searchParams.get('tokenPackageId');
  const vnpResponseCode = searchParams.get('vnp_ResponseCode');

  const [packageData, setPackageData] = useState<any>(null);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transactionCode, setTransactionCode] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qr_transfer');
  const [vnpayStatus, setVnpayStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [vnpayMessage, setVnpayMessage] = useState('');

  // QR Transfer state
  const [qrUrl, setQrUrl] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  // Handle VNPAY return
  useEffect(() => {
    if (vnpResponseCode) {
      if (isPaymentSuccess(vnpResponseCode)) {
        setVnpayStatus('success');
        sonnerToast.success('Thanh toán thành công! Gói cước đã được kích hoạt.');
      } else {
        setVnpayStatus('failed');
        setVnpayMessage(getResponseMessage(vnpResponseCode));
        sonnerToast.error('Thanh toán thất bại: ' + getResponseMessage(vnpResponseCode));
      }
      setLoading(false);
      return;
    }
  }, [vnpResponseCode]);

  useEffect(() => {
    if (!vnpResponseCode) {
      loadData();
    }
  }, [packageId]);

  // Auto redirect to landing page after 5 seconds when payment success
  useEffect(() => {
    if (vnpayStatus === 'success') {
      const timer = setTimeout(() => {
        window.location.href = '/';
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [vnpayStatus]);

  // Auto-generate QR when data is loaded
  useEffect(() => {
    if (packageData && paymentSettings && user && !qrUrl && !submitting && vnpayStatus === 'idle') {
      handleQRTransfer();
    }
  }, [packageData, paymentSettings, user]);


  const loadData = async () => {
    // Handle token top-up
    if (paymentType === 'token' && tokenPackageId) {
      try {
        setLoading(true);
        const tokenPackages = await getTokenPackages();
        const tokenPkg = tokenPackages.find(p => String(p.Id) === tokenPackageId);

        if (!tokenPkg) {
          sonnerToast.error('Token package not found');
          navigate('/dashboard/subscription');
          return;
        }

        // Convert token package to payment package format
        setPackageData({
          id: `token_${tokenPkg.Id}`,
          name: `${tokenPkg.tokens.toLocaleString()} Tokens`,
          price: tokenPkg.price,
          description: 'Nạp thêm AI Tokens',
          isTokenTopup: true,
          tokens: tokenPkg.tokens,
        });

        // Load payment settings via proxy
        const { data: settingsResult, error: settingsError } = await supabase.functions.invoke('nocodb-proxy', {
          method: 'POST',
          body: { path: '/api/v2/tables/mkj2c8zur7e77zm/records?limit=1', method: 'GET' }
        });
        if (!settingsError && settingsResult) {
          setPaymentSettings(settingsResult.list?.[0] || null);
        }

      } catch (error) {
        console.error('Error loading token package:', error);
        sonnerToast.error('Failed to load token package');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Handle subscription package
    if (!packageId) {
      sonnerToast.error('No package selected');
      navigate('/dashboard/packages');
      return;
    }

    try {
      setLoading(true);

      // Load package from NocoDB
      const packages = await getPaymentPackages(false);
      const pkg = packages.find(p =>
        p.id === packageId ||
        String(p.Id) === packageId ||
        p.id === String(packageId)
      );

      if (!pkg) {
        throw new Error('Package not found');
      }
      setPackageData(pkg);

      // Load payment settings via proxy
      const { data: settingsResult, error: settingsError } = await supabase.functions.invoke('nocodb-proxy', {
        method: 'POST',
        body: { path: '/api/v2/tables/mkj2c8zur7e77zm/records?limit=1', method: 'GET' }
      });
      const settings = !settingsError && settingsResult ? settingsResult.list?.[0] : null;
      setPaymentSettings(settings);

      // Check for recent completed payment for this user and package (last 24h)
      if (user) {
        const PAYMENT_TABLE_ID = 'mjlq3evtb8n7g08';
        const { data: recentPaymentResult } = await supabase.functions.invoke('nocodb-proxy', {
          method: 'POST',
          body: {
            path: `/api/v2/tables/${PAYMENT_TABLE_ID}/records?where=(user_id,eq,${user.id})~and(package_id,eq,${packageId})~and(status,eq,completed)&sort=-CreatedAt&limit=1`,
            method: 'GET'
          }
        });
        const recentPayment = recentPaymentResult?.list?.[0];

        if (recentPayment) {
          // Check if payment was completed within last 24 hours
          const completedAt = new Date(recentPayment.completed_at || recentPayment.CreatedAt);
          const now = new Date();
          const hoursDiff = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);

          if (hoursDiff < 24) {
            // Payment already completed recently, show success
            setVnpayStatus('success');
            return;
          }
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
      sonnerToast.error('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    sonnerToast.success('Copied to clipboard!');
  };

  const handleSubmit = async () => {
    if (!user || !packageData) return;

    try {
      setSubmitting(true);

      // Create payment transaction
      const { error } = await (supabase as any)
        .from('payment_transactions')
        .insert({
          user_id: user.id,
          package_id: packageData.id,
          amount: packageData.price,
          currency: packageData.currency,
          status: 'pending',
          payment_method: 'bank_transfer',
          transaction_code: transactionCode,
          notes,
        });

      if (error) throw error;

      sonnerToast.success('Payment submitted! Waiting for admin verification.');
      navigate('/dashboard/billing');
    } catch (error) {
      console.error('Error submitting payment:', error);
      sonnerToast.error('Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVnpayPayment = async () => {
    if (!user || !packageData) return;

    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-vnpay-payment', {
        body: {
          packageId: packageData.id || String(packageData.Id),
          userId: user.id,
        },
      });

      if (error) throw error;

      if (data.success && data.paymentUrl) {
        // Redirect to VNPAY
        window.location.href = data.paymentUrl;
      } else {
        throw new Error(data.error || 'Failed to create VNPAY payment');
      }
    } catch (error) {
      console.error('VNPAY payment error:', error);
      sonnerToast.error('Lỗi tạo thanh toán VNPAY: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setSubmitting(false);
    }
  };

  const handleQRTransfer = async () => {
    if (!user || !packageData || !paymentSettings) return;

    setSubmitting(true);

    try {
      // Generate order ID with readable format: MKH + 4 chars of user_id + package short name + random
      const userPrefix = user.id.substring(0, 4).toUpperCase();
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

      // Determine package short name
      let packageShortName = '';
      if (packageData.isTokenTopup) {
        // For token top-up: token + tokens in k (e.g., token20k)
        const tokensInK = Math.round(packageData.tokens / 1000);
        packageShortName = `token${tokensInK}k`;
      } else {
        // For subscription: use package name (e.g., Starter, Pro)
        packageShortName = (packageData.name || 'pkg').replace(/\s+/g, '');
      }

      const orderId = `MKH${userPrefix}${packageShortName}${randomSuffix}`;
      const transferContent = orderId; // Use order_id directly as transfer content

      // Create payment record via proxy
      const PAYMENT_TABLE_ID = 'mjlq3evtb8n7g08';
      const { data: createResult, error: createError } = await supabase.functions.invoke('nocodb-proxy', {
        method: 'POST',
        body: {
          path: `/api/v2/tables/${PAYMENT_TABLE_ID}/records`,
          method: 'POST',
          data: {
            order_id: orderId,
            user_id: user.id,
            package_id: packageData.id || String(packageData.Id),
            amount: packageData.price,
            currency: 'VND',
            status: 'pending',
            payment_method: 'bank_transfer',
          }
        }
      });

      if (createError) {
        throw new Error(createError.message || 'Failed to create payment record');
      }

      // Generate VietQR URL
      const bankCode = VIETQR_BANK_CODES.mbbank.id;
      const qr = generateVietQRUrl(
        bankCode,
        paymentSettings.bank_account_number,
        paymentSettings.bank_account_name || '',
        packageData.price,
        transferContent
      );

      setQrUrl(qr);
      setPendingOrderId(orderId);
      setTransactionCode(transferContent);

      // Start polling
      startPolling(orderId);

    } catch (error) {
      console.error('Error creating QR payment:', error);
      sonnerToast.error('Lỗi tạo thanh toán: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const startPolling = (orderId: string) => {
    setIsPolling(true);
    setPollCount(0);

    // Poll every 3 seconds for faster response when webhook confirms
    pollIntervalRef.current = setInterval(async () => {
      setPollCount(prev => prev + 1);

      const result = await checkPaymentStatus(orderId);

      if (result.status === 'completed') {
        stopPolling();
        setVnpayStatus('success');
      } else if (pollCount >= 200) {
        stopPolling();
        sonnerToast.info('Hết thời gian chờ. Vui lòng kiểm tra lại sau.');
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!packageData && vnpayStatus === 'idle') {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive">
          <AlertTitle>Không tìm thấy gói cước</AlertTitle>
          <AlertDescription>
            Gói cước đã chọn không thể tải được.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // VNPAY Success Screen
  if (vnpayStatus === 'success') {

    return (
      <div className="container max-w-lg mx-auto p-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-700">Thanh toán thành công!</CardTitle>
            <CardDescription>
              Gói cước của bạn đã được kích hoạt. Bạn có thể bắt đầu sử dụng ngay.
              <br />
              <span className="text-xs text-muted-foreground">Tự động chuyển về trang chủ sau 5 giây...</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Về trang chủ
            </Button>
            <Button onClick={() => navigate('/dashboard/subscription')} variant="outline" className="w-full">
              Xem gói đang sử dụng
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // VNPAY Failed Screen
  if (vnpayStatus === 'failed') {
    return (
      <div className="container max-w-lg mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-700">Thanh toán thất bại</CardTitle>
            <CardDescription className="text-red-600">
              {vnpayMessage || 'Đã xảy ra lỗi trong quá trình thanh toán.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <Button onClick={() => {
              setVnpayStatus('idle');
              navigate('/dashboard/packages');
            }} variant="outline" className="w-full">
              Chọn gói khác
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/packages')}>
        <ArrowLeft className="mr-1 h-3 w-3" />
        Quay lại
      </Button>

      <div>
        <h1 className="text-xl font-bold">Thanh toán</h1>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Order Summary - Compact */}
        <Card className="text-sm">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm">Tóm tắt đơn hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 py-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{packageData.name}</p>
                <p className="text-xs text-muted-foreground">Gói {packageData.duration_days} ngày</p>
              </div>
              <Badge variant="secondary" className="text-xs">Đã chọn</Badge>
            </div>
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tạm tính:</span>
                <span>{packageData.price.toLocaleString('vi-VN').replace(/,/g, '.')} đ</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Tổng:</span>
                <span className="text-primary">{packageData.price.toLocaleString('vi-VN').replace(/,/g, '.')} đ</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions - Compact */}
        <Card className="text-sm">
          <CardHeader className="py-2 px-3">
            <CardTitle className="flex items-center gap-1 text-sm">
              <Building2 className="h-3 w-3" />
              Thông tin CK
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 py-2">
            {paymentSettings ? (
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">NH:</span>
                    <span className="ml-1 font-medium">{paymentSettings.bank_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">STK:</span>
                    <span className="ml-1 font-mono font-medium">{paymentSettings.bank_account_number || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Chủ TK:</span>
                    <span className="ml-1 font-medium">{paymentSettings.bank_account_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Số tiền:</span>
                    <span className="ml-1 font-bold text-primary">{packageData.price.toLocaleString('vi-VN').replace(/,/g, '.')} đ</span>
                  </div>
                </div>
                <div className="bg-yellow-50 p-1.5 rounded border border-yellow-200 flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">ND:</span>
                  <code className="font-mono text-xs font-bold flex-1">{transactionCode}</code>
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleCopy(transactionCode)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Chưa cấu hình</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR + Manual Transfer - Side by side */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* QR Bank Transfer */}
        <Card className="border-green-500/30 bg-green-50/50">
          <CardHeader className="py-2 px-3">
            <CardTitle className="flex items-center gap-1 text-sm">
              <QrCode className="h-4 w-4 text-green-600" />
              QR MBBank
            </CardTitle>
            <CardDescription className="text-xs">Tự động kích hoạt</CardDescription>
          </CardHeader>
          <CardContent className="px-3 py-2">
            {qrUrl ? (
              <div className="text-center space-y-2">
                <div className="bg-white p-2 rounded-lg inline-block shadow-sm">
                  <img src={qrUrl} alt="VietQR" className="w-56 h-56 mx-auto" />
                </div>
                <div className="bg-yellow-50 p-1.5 rounded text-xs flex items-center gap-1">
                  <span className="text-muted-foreground">ND:</span>
                  <code className="font-mono font-bold flex-1">{transactionCode}</code>
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleCopy(transactionCode)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {isPolling && (
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Đang chờ... ({pollCount * 5}s)</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gói:</span>
                    <span className="font-medium">{packageData?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tiền:</span>
                    <span className="font-bold text-green-600">{packageData?.price?.toLocaleString('vi-VN').replace(/,/g, '.')} đ</span>
                  </div>
                </div>
                <Button
                  onClick={handleQRTransfer}
                  disabled={submitting || !paymentSettings}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  {submitting ? (
                    <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Đang tạo...</>
                  ) : (
                    <><QrCode className="mr-1 h-3 w-3" />Tạo QR</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Transfer */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="flex items-center gap-1 text-sm">
              <Building2 className="h-4 w-4" />
              Thủ công
            </CardTitle>
            <CardDescription className="text-xs">Chờ Admin xác nhận (24h)</CardDescription>
          </CardHeader>
          <CardContent className="px-3 py-2 space-y-2">
            <div>
              <Label htmlFor="notes" className="text-xs">Ghi chú</Label>
              <Textarea
                id="notes"
                placeholder="Thông tin thêm..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !paymentSettings}
              className="w-full"
              variant="outline"
              size="sm"
            >
              {submitting ? (
                <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Đang gửi...</>
              ) : (
                <><CheckCircle2 className="mr-1 h-3 w-3" />Xác nhận</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
