import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabaseSettings } from "@/hooks/useSupabaseSettings";
import { MobileToolHeader } from "@/components/member/MobileToolHeader";
import { useQuickPostFlow } from "@/features/quick-post-isolated/hooks/useQuickPostFlow";
import type { QuickPostTokens } from "@/features/quick-post-isolated/types";
import LocationSearch, { type LocationTarget } from "@/components/LocationSearch";

export default function CreateQuickAd() {
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useSupabaseSettings();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<LocationTarget[]>([]);

  const { stage, data, lastMessage, isLoading, start, confirmAndCreate, reset, updateData } = useQuickPostFlow();

  const handleStart = async () => {
    if (!input.trim()) {
      toast({
        title: "❌ Lỗi",
        description: "Vui lòng nhập mô tả chiến dịch hoặc link bài viết",
        variant: "destructive",
      });
      return;
    }

    if (!settings?.adsToken || !settings?.pageToken || !settings?.adAccountId || !settings?.pageId) {
      toast({
        title: "❌ Chưa cấu hình token Facebook",
        description: "Vui lòng mở Settings → Facebook để kết nối tài khoản",
        variant: "destructive",
      });
      return;
    }

    const tokens: QuickPostTokens = {
      adsToken: settings.adsToken,
      pageToken: settings.pageToken,
      adAccountId: settings.adAccountId,
      pageId: settings.pageId,
    };

    await start(input, tokens);
  };

  const handleConfirm = async () => {
    if (!settings?.adsToken || !settings?.pageToken || !settings?.adAccountId || !settings?.pageId) {
      toast({
        title: "❌ Chưa cấu hình token Facebook",
        description: "Vui lòng mở Settings → Facebook để kết nối tài khoản",
        variant: "destructive",
      });
      return;
    }

    const tokens: QuickPostTokens = {
      adsToken: settings.adsToken,
      pageToken: settings.pageToken,
      adAccountId: settings.adAccountId,
      pageId: settings.pageId,
    };

    const result = await confirmAndCreate(tokens);

    if (result) {
      toast({
        title: "🎉 Hoàn thành!",
        description: `Campaign: ${result.campaignId}\nAdSet: ${result.adSetId}\nAd: ${result.adId}`,
      });
      setInput("");
    }
  };

  const handleReset = () => {
    reset();
    setInput("");
    setSelectedLocations([]);
  };

  const handleLocationChange = (locations: LocationTarget[]) => {
    setSelectedLocations(locations);
    // Update data with selected locations
    updateData((prev) => ({
      ...prev,
      location: locations.map(loc => ({
        name: loc.name,
        type: loc.type,
        key: loc.key,
        radius: loc.radius,
        distance_unit: 'kilometer',
      })),
    }));
  };

  if (settingsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <MobileToolHeader
        title="Quảng cáo bài viết sẵn"
        description="Tạo chiến dịch quảng cáo từ bài viết Facebook có sẵn"
        icon={Zap}
      />

      <div className="container mx-auto p-3 lg:p-6 max-w-4xl overflow-x-hidden">
        {stage === 'idle' || stage === 'parsing' ? (
          <Card>
            <CardHeader>
              <CardTitle>Tạo quảng cáo nhanh</CardTitle>
              <CardDescription>
                Nhập link bài viết Facebook hoặc mô tả chiến dịch
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ví dụ: 
https://www.facebook.com/yourpage/posts/123456789

Hoặc mô tả chi tiết:
Tên: Spa làm đẹp
Tuổi: 25-45 nữ
Ngân sách: 500k/ngày
Sở thích: làm đẹp, spa`}
                rows={6}
                className="font-mono text-sm"
                disabled={isLoading}
              />

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Chọn vị trí targeting (tùy chọn)
                </label>
                <LocationSearch
                  accessToken={settings?.adsToken || ''}
                  adAccountId={settings?.adAccountId || ''}
                  selectedLocations={selectedLocations}
                  onLocationChange={handleLocationChange}
                />
              </div>

              <Button
                onClick={handleStart}
                disabled={isLoading || !input.trim()}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Bắt đầu
                  </>
                )}
              </Button>

              {lastMessage && (
                <div className="p-3 bg-muted rounded-md text-sm">
                  {lastMessage}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Xác nhận thông tin</CardTitle>
              <CardDescription>
                {lastMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.name && (
                <div>
                  <strong>Tên chiến dịch:</strong> {data.name}
                </div>
              )}
              {data.budget && (
                <div>
                  <strong>Ngân sách:</strong> {data.budget.toLocaleString('vi-VN')} VND/ngày
                </div>
              )}
              {data.age && (
                <div>
                  <strong>Độ tuổi:</strong> {data.age.min} - {data.age.max}
                </div>
              )}
              {data.gender && (
                <div>
                  <strong>Giới tính:</strong> {data.gender === 'male' ? 'Nam' : data.gender === 'female' ? 'Nữ' : 'Tất cả'}
                </div>
              )}
              {data.location && data.location.length > 0 && (
                <div>
                  <strong>Vị trí:</strong> {data.location.map(l => l.name).join(', ')}
                </div>
              )}
              {data.interests && data.interests.length > 0 && (
                <div>
                  <strong>Sở thích:</strong> {data.interests.map(i => i.name).join(', ')}
                </div>
              )}
              {data.postUrl && (
                <div>
                  <strong>Link bài viết:</strong> <a href={data.postUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{data.postUrl}</a>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Hủy
                </Button>

                {stage === 'confirming' && (
                  <Button
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className="flex-1"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Xác nhận & Tạo
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
