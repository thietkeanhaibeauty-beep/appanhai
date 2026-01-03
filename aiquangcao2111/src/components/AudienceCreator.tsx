import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Users, Target, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast as sonnerToast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { getActiveAdAccounts } from '@/services/nocodb/facebookAdAccountsService';
import { getAllPages } from '@/services/nocodb/facebookPagesService';
import * as facebookService from '@/services/facebook';

type AudienceType = 'file' | 'page_messengers' | 'lookalike';
type LogType = 'info' | 'success' | 'error';

interface ApiLog {
  id: string;
  type: LogType;
  step: string;
  message: string;
  timestamp: Date;
}

interface CustomAudience {
  id: string;
  name: string;
}

const AudienceCreator = () => {
  const [audienceType, setAudienceType] = useState<AudienceType>('file');
  const [audienceName, setAudienceName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);

  // File audience states
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Page messengers states
  const [retentionDays, setRetentionDays] = useState(30);
  const [pageId, setPageId] = useState('');
  const [availablePages, setAvailablePages] = useState<Array<{ id: string; name: string }>>([]);

  // Lookalike states
  const [lookalikeSourceId, setLookalikeSourceId] = useState('');
  const [lookalikeCountry, setLookalikeCountry] = useState('VN');
  const [lookalikeRatio, setLookalikeRatio] = useState(1);
  const [availableAudiences, setAvailableAudiences] = useState<CustomAudience[]>([]);

  // Account data
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; token: string } | null>(null);

  const { user } = useAuth();

  // Load active account
  useEffect(() => {
    const loadActiveAccount = async () => {
      if (!user?.id) return;
      const accounts = await getActiveAdAccounts(user.id);
      const activeAccount = accounts.find(acc => acc.is_active);

      if (activeAccount) {
        setSelectedAccount({ id: activeAccount.account_id, token: activeAccount.access_token });
      }
    };

    loadActiveAccount();
  }, []);

  // Load available pages
  useEffect(() => {
    const loadPages = async () => {
      if (!user?.id) return;
      const pages = await getAllPages(user.id);

      if (pages && pages.length > 0) {
        const pageList = pages.map(p => ({ id: p.page_id, name: p.page_name || p.page_id }));
        setAvailablePages(pageList);
        // Set default to first (active) page
        if (!pageId) {
          setPageId(pageList[0].id);
        }
      }
    };

    loadPages();
  }, []);

  // Load available audiences for lookalike
  useEffect(() => {
    const loadAudiences = async () => {
      if (audienceType !== 'lookalike' || !selectedAccount) return;

      try {
        const audiences = await facebookService.getCustomAudiences(
          selectedAccount.id,
          selectedAccount.token
        );
        setAvailableAudiences(audiences);
      } catch (error) {
        console.error('Failed to load audiences:', error);
      }
    };

    loadAudiences();
  }, [audienceType, selectedAccount]);

  const addApiLog = useCallback((step: string, type: LogType, message: string) => {
    setApiLogs(prev => [...prev, {
      id: Date.now().toString(),
      step,
      type,
      message,
      timestamp: new Date()
    }]);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['text/plain', 'text/csv'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(txt|csv)$/i)) {
      sonnerToast.error('Vui lòng chọn file .txt hoặc .csv');
      return;
    }

    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      setPhoneNumbers(lines);
      sonnerToast.success(`Đã tải ${lines.length} số điện thoại`);
    };
    reader.readAsText(file);
  };

  const handleCreateAudience = async () => {
    if (!selectedAccount) {
      sonnerToast.error('Vui lòng chọn tài khoản quảng cáo trong Cài đặt');
      return;
    }

    if (!audienceName.trim()) {
      sonnerToast.error('Vui lòng nhập tên đối tượng');
      return;
    }

    setIsLoading(true);
    setApiLogs([]);

    try {
      if (audienceType === 'file') {
        // LUỒNG 1: TỆP SĐT
        if (phoneNumbers.length === 0) {
          throw new Error('Vui lòng tải tệp SĐT.');
        }

        addApiLog('Bước 1', 'info', 'Đang tạo container đối tượng...');

        const audienceId = await facebookService.createCustomAudience(
          selectedAccount.id,
          selectedAccount.token,
          audienceName,
          description || 'Đối tượng từ tệp SĐT'
        );

        addApiLog('Bước 1', 'success', `Tạo container thành công! ID: ${audienceId}`);

        addApiLog('Bước 2', 'info', `Chuẩn bị thêm ${phoneNumbers.length} người dùng...`);

        await facebookService.addUsersToCustomAudience(
          audienceId,
          selectedAccount.token,
          phoneNumbers
        );

        addApiLog('Bước 2', 'success', 'Đã gửi yêu cầu thêm người dùng thành công!');
        addApiLog('Hoàn tất', 'success', 'Tệp đối tượng sẽ được xử lý trong vài phút.');

        sonnerToast.success('Tạo đối tượng thành công!');

      } else if (audienceType === 'page_messengers') {
        // LUỒNG 2: NGƯỜI NHẮN TIN PAGE
        if (!pageId) {
          throw new Error('Không tìm thấy Page ID. Vui lòng kiểm tra cài đặt.');
        }

        addApiLog('Đang tạo', 'info', 'Đang tạo đối tượng người nhắn tin...');

        const audienceId = await facebookService.createPageMessengersAudience(
          selectedAccount.id,
          selectedAccount.token,
          audienceName,
          description || `Người nhắn tin trong ${retentionDays} ngày`,
          pageId,
          retentionDays
        );

        addApiLog('Hoàn tất', 'success', `Tạo đối tượng thành công! ID: ${audienceId}`);
        sonnerToast.success('Tạo đối tượng người nhắn tin thành công!');

      } else {
        // LUỒNG 3: TƯƠNG TỰ (LOOKALIKE)
        if (!lookalikeSourceId) {
          throw new Error('Vui lòng chọn một đối tượng nguồn.');
        }

        addApiLog('Đang tạo', 'info', 'Đang tạo đối tượng tương tự...');

        const audienceId = await facebookService.createLookalikeAudience(
          selectedAccount.id,
          selectedAccount.token,
          audienceName,
          description || `Lookalike ${lookalikeRatio}% từ đối tượng nguồn`,
          lookalikeSourceId,
          lookalikeCountry,
          lookalikeRatio
        );

        addApiLog('Hoàn tất', 'success', `Tạo đối tượng tương tự thành công! ID: ${audienceId}`);
        sonnerToast.success('Tạo đối tượng tương tự thành công!');
      }

      // Reset form
      setAudienceName('');
      setDescription('');
      setPhoneNumbers([]);
      setUploadedFileName('');

    } catch (error: any) {
      const errorMessage = error.message || 'Đã xảy ra lỗi không xác định';
      addApiLog('Lỗi', 'error', errorMessage);
      sonnerToast.error(errorMessage);
      console.error('Error creating audience:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLogIcon = (type: LogType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getLogStyle = (type: LogType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
      default:
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Tạo Đối Tượng Quảng Cáo
          </CardTitle>
          <CardDescription>
            Tạo custom audience từ file SĐT, người nhắn tin, hoặc lookalike audience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={audienceType} onValueChange={(v) => setAudienceType(v as AudienceType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="file">
                <Upload className="w-4 h-4 mr-2" />
                Tệp SĐT
              </TabsTrigger>
              <TabsTrigger value="page_messengers">
                <Users className="w-4 h-4 mr-2" />
                Người nhắn tin
              </TabsTrigger>
              <TabsTrigger value="lookalike">
                <Target className="w-4 h-4 mr-2" />
                Tương tự
              </TabsTrigger>
            </TabsList>

            {/* Common fields */}
            <div className="space-y-4 mt-6">
              <div>
                <Label htmlFor="audience-name">Tên đối tượng *</Label>
                <Input
                  id="audience-name"
                  value={audienceName}
                  onChange={(e) => setAudienceName(e.target.value)}
                  placeholder="Ví dụ: Khách hàng tiềm năng Q1 2025"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả ngắn về đối tượng này..."
                  disabled={isLoading}
                  rows={2}
                />
              </div>
            </div>

            {/* Tab 1: File Upload */}
            <TabsContent value="file" className="space-y-4">
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Tải lên file .txt hoặc .csv chứa danh sách số điện thoại (mỗi số một dòng).
                  Hệ thống sẽ tự động chuẩn hóa và mã hóa SĐT trước khi gửi lên Facebook.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="phone-file">Chọn tệp SĐT *</Label>
                <Input
                  id="phone-file"
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="cursor-pointer"
                />
                {uploadedFileName && (
                  <p className="text-sm text-muted-foreground mt-2">
                    📄 {uploadedFileName} - {phoneNumbers.length} SĐT
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Tab 2: Page Messengers */}
            <TabsContent value="page_messengers" className="space-y-4">
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Tự động tạo đối tượng gồm những người đã nhắn tin cho Page trong khoảng thời gian chọn.
                  Facebook sẽ tự động cập nhật danh sách này.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="page-source">Nguồn Page *</Label>
                <Select
                  value={pageId}
                  onValueChange={setPageId}
                  disabled={isLoading || availablePages.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn Page..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availablePages.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Không tìm thấy Page. Vui lòng kết nối Page trong Cài đặt.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Số ngày giữ lại: {retentionDays} ngày</Label>
                <Slider
                  value={[retentionDays]}
                  onValueChange={(v) => setRetentionDays(v[0])}
                  min={1}
                  max={365}
                  step={1}
                  disabled={isLoading}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Bao gồm người dùng đã nhắn tin trong {retentionDays} ngày qua
                </p>
              </div>
            </TabsContent>

            {/* Tab 3: Lookalike */}
            <TabsContent value="lookalike" className="space-y-4">
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Tạo đối tượng mới có hành vi tương tự với một đối tượng nguồn đã có.
                  1% = giống nhất nhưng nhỏ, 10% = lớn hơn nhưng độ tương đồng thấp hơn.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="source-audience">Đối tượng nguồn *</Label>
                <Select
                  value={lookalikeSourceId}
                  onValueChange={setLookalikeSourceId}
                  disabled={isLoading || availableAudiences.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn đối tượng nguồn..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAudiences.map((aud) => (
                      <SelectItem key={aud.id} value={aud.id}>
                        {aud.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableAudiences.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Đang tải danh sách đối tượng...
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="country">Quốc gia</Label>
                <Select value={lookalikeCountry} onValueChange={setLookalikeCountry} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VN">Việt Nam</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="TH">Thailand</SelectItem>
                    <SelectItem value="SG">Singapore</SelectItem>
                    <SelectItem value="MY">Malaysia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quy mô: {lookalikeRatio}%</Label>
                <Slider
                  value={[lookalikeRatio]}
                  onValueChange={(v) => setLookalikeRatio(v[0])}
                  min={1}
                  max={10}
                  step={1}
                  disabled={isLoading}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  {lookalikeRatio}% dân số {lookalikeCountry === 'VN' ? 'Việt Nam' : lookalikeCountry}
                </p>
              </div>
            </TabsContent>

            {/* Create Button */}
            <div className="mt-6">
              <Button
                onClick={handleCreateAudience}
                disabled={
                  isLoading ||
                  !selectedAccount ||
                  !audienceName.trim() ||
                  (audienceType === 'file' && phoneNumbers.length === 0) ||
                  (audienceType === 'page_messengers' && !pageId) ||
                  (audienceType === 'lookalike' && !lookalikeSourceId)
                }
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  'Tạo đối tượng'
                )}
              </Button>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* API Logs */}
      {apiLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logs hoạt động</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {apiLogs.map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-lg border ${getLogStyle(log.type)}`}
              >
                <div className="flex items-start gap-2">
                  {getLogIcon(log.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{log.step}</p>
                    <p className="text-sm text-muted-foreground break-words">{log.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.timestamp.toLocaleTimeString('vi-VN')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AudienceCreator;
