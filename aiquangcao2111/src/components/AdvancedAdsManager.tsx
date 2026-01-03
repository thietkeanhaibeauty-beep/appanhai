import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveAdAccounts } from "@/services/nocodb/facebookAdAccountsService";
import { StructureTreeView } from "@/components/advanced/StructureTreeView";
import { ClonePreviewDialog } from "@/components/advanced/ClonePreviewDialog";
import {
  fetchCampaignStructure,
  cloneCampaignWithAdSets,
  cloneAdSet,
  cloneAdSetWithAds,
  cloneAd,
  suggestCloneName,
  fetchAdSetsForCampaign,
  fetchAdsForAdSet
} from "@/services/advancedAdsService";

export default function AdvancedAdsManager() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ type: 'campaign' | 'adset' | 'ad'; id: string; name: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [campaignQuantity, setCampaignQuantity] = useState(1);
  const [adsetQuantity, setAdsetQuantity] = useState(1);
  const [adQuantity, setAdQuantity] = useState(1);
  const [adsetAdQuantity, setAdsetAdQuantity] = useState(1);
  const [statusOption, setStatusOption] = useState<'ACTIVE' | 'PAUSED'>('PAUSED');
  const [targetCampaignId, setTargetCampaignId] = useState<string>("");
  const [accessToken, setAccessToken] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadActiveAccount();
  }, []);

  useEffect(() => {
    // Reset inputs when selecting different item
    if (selectedItem) {
      setCampaignQuantity(1);
      setAdsetQuantity(1);
      setAdQuantity(1);
      setAdsetAdQuantity(1);
    }
  }, [selectedItem]);

  useEffect(() => {
    if (selectedItem && selectedItem.name) {
      setNewName(suggestCloneName(selectedItem.name));
    }
  }, [selectedItem]);

  // Đếm số lượng adset và ad trong campaign (ước tính cho Deep copy)
  const [campaignCounts, setCampaignCounts] = useState<{ adsets: number; ads: number } | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!selectedItem || selectedItem.type !== 'campaign' || !accessToken) {
        setCampaignCounts(null);
        return;
      }
      try {
        setCountsLoading(true);
        const adsets = await fetchAdSetsForCampaign(selectedItem.id, accessToken);
        const adsetCount = adsets.length || 0;
        let adCount = 0;
        if (adsetCount > 0) {
          const adsArrays = await Promise.all(
            adsets.map((as: any) => fetchAdsForAdSet(as.id, accessToken).catch(() => []))
          );
          adCount = adsArrays.reduce((sum: number, arr: any[]) => sum + (arr?.length || 0), 0);
        }
        setCampaignCounts({ adsets: adsetCount, ads: adCount });
      } catch (e) {
        console.warn('Không thể đếm số lượng đối tượng trong campaign:', e);
        setCampaignCounts(null);
      } finally {
        setCountsLoading(false);
      }
    };
    run();
  }, [selectedItem, accessToken]);

  // Đếm số lượng ads trong Ad Set đã chọn
  const [adsetAdCount, setAdsetAdCount] = useState<number | null>(null);
  const [adsetCountLoading, setAdsetCountLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!selectedItem || selectedItem.type !== 'adset' || !accessToken) {
        setAdsetAdCount(null);
        return;
      }
      try {
        setAdsetCountLoading(true);
        const ads = await fetchAdsForAdSet(selectedItem.id, accessToken);
        setAdsetAdCount(ads.length || 0);
      } catch (e) {
        console.warn('Không thể đếm số ads trong ad set:', e);
        setAdsetAdCount(null);
      } finally {
        setAdsetCountLoading(false);
      }
    };
    run();
  }, [selectedItem, accessToken]);

  const loadActiveAccount = async () => {
    if (!user?.id) return;
    const accounts = await getActiveAdAccounts(user.id);
    const activeAccount = accounts.find(acc => acc.is_active);

    if (activeAccount) {
      setAccessToken(activeAccount.access_token);
      setAdAccountId(activeAccount.account_id);
      loadCampaigns(activeAccount.account_id, activeAccount.access_token);
    } else {
      toast({
        title: "Lỗi",
        description: "Vui lòng kích hoạt tài khoản quảng cáo trong Settings",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const loadCampaigns = async (accountId: string, token: string) => {
    try {
      setLoading(true);
      const data = await fetchCampaignStructure(accountId, token);
      setCampaigns(data);
      
      if (data.length === 0) {
        toast({
          title: "Thông báo",
          description: "Không tìm thấy campaigns nào",
          duration: 2000
        });
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể tải danh sách campaigns",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (item: { type: 'campaign' | 'adset' | 'ad'; id: string; name: string }) => {
    setSelectedItem(item);
  };

  const handleClone = () => {
    if (!selectedItem) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn item cần nhân bản",
        variant: "destructive",
        duration: 2000
      });
      return;
    }

    if (!newName.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên mới",
        variant: "destructive",
        duration: 2000
      });
      return;
    }

    setShowPreview(true);
  };

  const handleConfirmClone = async () => {
    if (!selectedItem || !accessToken || !adAccountId) {
      toast({
        title: "Lỗi",
        description: "Thiếu thông tin cần thiết để nhân bản",
        variant: "destructive",
      });
      return;
    }

    setShowPreview(false);
    
    try {
      if (selectedItem.type === 'campaign') {
        // Clone multiple campaigns with adsets
        const clonedCampaigns: string[] = [];
        
        for (let i = 0; i < campaignQuantity; i++) {
          const campaignName = campaignQuantity > 1 
            ? `${newName} - Campaign ${i + 1}` 
            : newName;

          const result = await cloneCampaignWithAdSets({
            campaignId: selectedItem.id,
            newName: campaignName,
            deepCopy: false,
            statusOption,
            adsetQuantity: adsetQuantity,
            adQuantity: adQuantity,
            accessToken,
            adAccountId,
            onProgress: () => {}
          });

          if (result.success && result.campaignId) {
            clonedCampaigns.push(campaignName);
          } else {
            throw new Error(result.message || `Không thể nhân bản chiến dịch ${i + 1}`);
          }
          
          if (i < campaignQuantity - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        toast({
          title: "Nhân bản thành công",
          description: `Đã tạo ${clonedCampaigns.length} chiến dịch`,
        });
        
        setTimeout(() => {
          loadCampaigns(adAccountId, accessToken);
          setSelectedItem(null);
          setNewName("");
          setCampaignQuantity(1);
          setAdsetQuantity(1);
          setAdQuantity(1);
        }, 1000);
        
      } else if (selectedItem.type === 'adset') {
        // Nếu có yêu cầu clone ads
        if (adsetAdQuantity > 0) {
          const result = await cloneAdSetWithAds({
            adsetId: selectedItem.id,
            newName: newName,
            targetCampaignId: targetCampaignId || undefined,
            deepCopy: false,
            statusOption,
            adQuantity: adsetAdQuantity,
            accessToken,
            adAccountId,
            onProgress: () => {}
          });

          if (result.success) {
            toast({
              title: "Nhân bản thành công",
              description: `Đã tạo nhóm quảng cáo với ${result.adIds?.length || 0} ads`,
            });
            
            setTimeout(() => {
              loadCampaigns(adAccountId, accessToken);
              setSelectedItem(null);
              setNewName("");
              setAdsetAdQuantity(1);
            }, 1000);
          } else {
            throw new Error(result.message);
          }
        } else {
          // Clone chỉ Ad Set (không ads)
          const result = await cloneAdSet({
            adsetId: selectedItem.id,
            newName: newName,
            targetCampaignId: targetCampaignId || undefined,
            deepCopy: false,
            statusOption,
            accessToken,
            adAccountId
          });

          if (result.success) {
            toast({
              title: "Nhân bản thành công",
              description: "Đã tạo nhóm quảng cáo",
            });
            
            setTimeout(() => {
              loadCampaigns(adAccountId, accessToken);
              setSelectedItem(null);
              setNewName("");
              setAdsetAdQuantity(1);
            }, 1000);
          } else {
            throw new Error(result.message);
          }
        }
        
      } else {
        const result = await cloneAd({
          adId: selectedItem.id,
          newName: newName,
          statusOption,
          accessToken,
          adAccountId
        });

        if (result.success) {
          toast({
            title: "Nhân bản thành công",
            description: "Đã tạo quảng cáo",
          });
          
          setTimeout(() => {
            loadCampaigns(adAccountId, accessToken);
            setSelectedItem(null);
            setNewName("");
          }, 1000);
        } else {
          throw new Error(result.message);
        }
      }
    } catch (error) {
      console.error('Clone error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra';
      
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const getEstimatedObjects = () => {
    if (!selectedItem) return { campaigns: 0, adsets: 0, ads: 0 };
    
    if (selectedItem.type === 'campaign') {
      const totalAdsets = adsetQuantity * campaignQuantity;
      const totalAds = totalAdsets * adQuantity;
      
      return {
        campaigns: campaignQuantity,
        adsets: totalAdsets,
        ads: totalAds
      };
    } else if (selectedItem.type === 'adset') {
      return { campaigns: 0, adsets: 1, ads: adsetAdQuantity };
    } else {
      return { campaigns: 0, adsets: 0, ads: 1 };
    }
  };

  const typeLabels = {
    campaign: 'Chiến dịch',
    adset: 'Nhóm quảng cáo',
    ad: 'Quảng cáo'
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">7. ADS Nâng cao</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cấu trúc Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[600px]">
                <p className="text-muted-foreground">Đang tải...</p>
              </div>
            ) : (
              <StructureTreeView
                campaigns={campaigns}
                accessToken={accessToken}
                onSelectItem={handleSelectItem}
                selectedItem={selectedItem}
                onRefresh={() => loadCampaigns(adAccountId, accessToken)}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedItem 
                ? `Nhân bản ${typeLabels[selectedItem.type]}` 
                : 'Chọn item để nhân bản'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedItem ? (
              <>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground mb-1">Item đã chọn:</p>
                  <p className="font-medium">{selectedItem.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Loại: {typeLabels[selectedItem.type]}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newName">Tên mới</Label>
                  <Input
                    id="newName"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nhập tên mới..."
                  />
                </div>

                {selectedItem.type === 'campaign' && (
                  <>
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3">
                      <p className="text-xs text-blue-900 dark:text-blue-200">
                        💡 <b>Công thức nhân chiến dịch</b>
                        <br />
                        {campaignQuantity} chiến dịch × {adsetQuantity} nhóm QC/chiến dịch × {adQuantity} ads/nhóm
                        <br />
                        = <b>{campaignQuantity * adsetQuantity * adQuantity}</b> tổng số đối tượng sẽ tạo
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="campaignQuantity" className="text-xs font-medium">Số chiến dịch</Label>
                        <Input
                          id="campaignQuantity"
                          type="number"
                          min="1"
                          max="5"
                          value={campaignQuantity}
                          onChange={(e) => setCampaignQuantity(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                        />
                        <p className="text-xs text-muted-foreground">Tối đa 5</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="adsetQuantity" className="text-xs font-medium">Số nhóm QC/chiến dịch</Label>
                        <Input
                          id="adsetQuantity"
                          type="number"
                          min="1"
                          max={campaignCounts?.adsets || 10}
                          value={adsetQuantity}
                          onChange={(e) => setAdsetQuantity(Math.max(1, Math.min(campaignCounts?.adsets || 10, parseInt(e.target.value) || 1)))}
                        />
                        <p className="text-xs text-muted-foreground">
                          {countsLoading ? 'Đang tải...' : `Tối đa ${campaignCounts?.adsets || 10}`}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="adQuantity" className="text-xs font-medium">Số ads/nhóm</Label>
                        <Input
                          id="adQuantity"
                          type="number"
                          min="0"
                          max="10"
                          value={adQuantity}
                          onChange={(e) => setAdQuantity(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                        />
                        <p className="text-xs text-muted-foreground">0-10 (0 = không ads)</p>
                      </div>
                    </div>
                  </>
                )}

                {selectedItem.type === 'adset' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="targetCampaign">Chiến dịch đích (tùy chọn)</Label>
                      <select
                        id="targetCampaign"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={targetCampaignId}
                        onChange={(e) => setTargetCampaignId(e.target.value)}
                      >
                        <option value="">-- Giữ nguyên chiến dịch gốc --</option>
                        {campaigns.map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name} (ID: {campaign.id})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Để trống sẽ clone trong cùng chiến dịch. Chọn chiến dịch khác để chuyển nhóm sang campaign mới.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adsetAdQuantity">Số lượng Ads cần nhân</Label>
                      <Input
                        id="adsetAdQuantity"
                        type="number"
                        min="0"
                        value={adsetAdQuantity}
                        onChange={(e) => setAdsetAdQuantity(Math.max(0, parseInt(e.target.value) || 1))}
                      />
                      <p className="text-xs text-muted-foreground">
                        {adsetCountLoading 
                          ? 'Đang tải...' 
                          : adsetAdCount !== null 
                            ? `Nhóm QC gốc có ${adsetAdCount} ads. Mặc định: 1 ad. Nhập 0 để chỉ clone Nhóm QC.`
                            : 'Mặc định: 1 ad. Nhập 0 để chỉ clone Nhóm QC (không ads). Không giới hạn số lượng.'
                        }
                      </p>
                    </div>
                    
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3">
                      <p className="text-xs text-blue-900 dark:text-blue-200">
                        💡 Nhóm QC sẽ được tạo mới với cấu hình giống hệt bản gốc. 
                        Bạn có thể chọn số lượng Ads cần nhân (0 = chỉ clone Nhóm QC).
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Trạng thái sau khi tạo</Label>
                  <RadioGroup value={statusOption} onValueChange={(v) => setStatusOption(v as 'ACTIVE' | 'PAUSED')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PAUSED" id="paused" />
                      <Label htmlFor="paused" className="cursor-pointer">⚪ PAUSED (Tạm dừng)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ACTIVE" id="active" />
                      <Label htmlFor="active" className="cursor-pointer">🟢 ACTIVE (Hoạt động)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handleClone} className="flex-1">
                    👁️ Xem trước
                  </Button>
                  <Button onClick={handleClone} className="flex-1">
                    🚀 Nhân bản
                  </Button>
                </div>

              </>
            ) : (
              <div className="flex items-center justify-center h-[400px]">
                <p className="text-muted-foreground text-center">
                  Chọn một campaign, ad set hoặc ad <br />từ cây bên trái để nhân bản
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ClonePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        sourceType={selectedItem?.type || 'campaign'}
        sourceName={selectedItem?.name || ''}
        targetName={newName}
        campaignQuantity={campaignQuantity}
        adsetQuantity={adsetQuantity}
        adQuantity={adQuantity}
        estimatedObjects={getEstimatedObjects()}
        targetStatus={statusOption}
        onConfirm={handleConfirmClone}
      />

    </div>
  );
}
