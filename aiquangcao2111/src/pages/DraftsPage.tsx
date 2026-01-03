
import React, { useState, useEffect } from 'react';
import { DraftHierarchy, DraftCampaign as DraftHierarchyCampaign } from '@/components/drafts/DraftHierarchy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Play, Settings, Sparkles, Loader2, Upload, MapPin, Check, X, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { draftService } from '@/services/nocodb/draftService';
import { CampaignQueueManager, QueueItem } from '@/services/campaignQueueManager';
import { getOpenAISettingsByUserId } from '@/services/nocodb/openaiSettingsService';
import { generateCampaignContent } from '@/services/aiBeautyService';

import { Checkbox } from '@/components/ui/checkbox';

const DraftsPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [campaigns, setCampaigns] = useState<DraftHierarchyCampaign[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // AI Generation State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiInput, setAiInput] = useState({
        categoryId: '',
        postType: 'EXISTING', // EXISTING | NEW
        postLink: '',
        serviceName: '',
        locationType: 'NAME', // NAME | COORDINATES
        location: '',
        coordinates: { lat: '', long: '', radius: '5' },
        budget: '200000',
        duration: '3',
        description: ''
    });

    // File Upload State
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    // Category Creation State
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Publishing State
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishProgress, setPublishProgress] = useState<{ percent: number; current: number; total: number; logs: string[] }>({
        percent: 0,
        current: 0,
        total: 0,
        logs: []
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [queueProgress, setQueueProgress] = useState<{ current: number; total: number } | null>(null);

    // Queue Manager
    const [queueManager] = useState(() => new CampaignQueueManager(1500));

    // Helper to toggle selection with cascading logic
    // Helper to toggle selection with cascading logic
    const handleToggleSelect = (id: string, type?: string) => {
        const newSelected = new Set(selectedIds);
        const isSelecting = !newSelected.has(id);

        if (isSelecting) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }

        // Cascading Logic
        if (type === 'CAMPAIGN') {
            const campaign = campaigns.find(c => c.id === id);
            if (campaign) {
                campaign.adSets.forEach(adSet => {
                    if (isSelecting) newSelected.add(adSet.id);
                    else newSelected.delete(adSet.id);

                    adSet.ads.forEach(ad => {
                        if (isSelecting) newSelected.add(ad.id);
                        else newSelected.delete(ad.id);
                    });
                });
            }
        } else if (type === 'ADSET') {
            // Find adset in campaigns
            for (const campaign of campaigns) {
                const adSet = campaign.adSets.find(as => as.id === id);
                if (adSet) {
                    adSet.ads.forEach(ad => {
                        if (isSelecting) newSelected.add(ad.id);
                        else newSelected.delete(ad.id);
                    });
                    break;
                }
            }
        }

        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        const allIds: string[] = [];
        campaigns.forEach(c => {
            allIds.push(c.id);
            c.adSets.forEach(as => {
                allIds.push(as.id);
                as.ads.forEach(ad => allIds.push(ad.id));
            });
        });

        const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));

        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allIds));
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    // Fetch Campaigns when Category Changes
    useEffect(() => {
        if (selectedCategory) {
            loadCampaigns(selectedCategory);
        } else {
            setCampaigns([]);
        }
    }, [selectedCategory]);

    const loadCategories = async () => {
        setIsLoading(true);
        try {
            const data = await draftService.getCategories();
            setCategories(data);
            if (data.length > 0 && !selectedCategory) {
                setSelectedCategory(data[0].Id);
                setAiInput(prev => ({ ...prev, categoryId: data[0].Id }));
            }
        } catch (error) {
            console.error("Failed to load categories", error);
            toast({ title: "Lỗi", description: "Không thể tải danh mục", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const loadCampaigns = async (categoryId: string) => {
        setIsLoading(true);
        try {
            // Fetch campaigns
            const draftCampaigns = await draftService.getCampaignsByCategory(categoryId);

            // Transform to Hierarchy Format (fetching sub-items)
            // Note: This might be slow if many campaigns. Ideally backend should support nested include.
            // For now, we'll fetch adsets and ads for each campaign in parallel
            const hierarchyCampaigns: DraftHierarchyCampaign[] = await Promise.all(draftCampaigns.map(async (camp) => {
                const adSets = await draftService.getAdSetsByCampaign(camp.Id);
                const adSetsWithAds = await Promise.all(adSets.map(async (as) => {
                    const ads = await draftService.getAdsByAdSet(as.Id);
                    return {
                        id: `ADSET_${as.Id}`,
                        originalId: as.Id,
                        name: as.Name,
                        budget: as.DailyBudget.toString(),
                        targeting: as.Targeting,
                        ads: ads.map(ad => ({
                            id: `AD_${ad.Id}`,
                            originalId: ad.Id,
                            name: ad.Name,
                            creativeType: ad.CreativeType,
                            creativeData: ad.CreativeData
                        }))
                    };
                }));

                return {
                    id: `CAMPAIGN_${camp.Id}`,
                    originalId: camp.Id,
                    name: camp.Name,
                    adSets: adSetsWithAds
                };
            }));

            setCampaigns(hierarchyCampaigns);
        } catch (error) {
            console.error("Failed to load campaigns", error);
            toast({ title: "Lỗi", description: "Không thể tải chiến dịch", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            const newCategory = await draftService.createCategory({
                Name: newCategoryName,
                Description: 'Created via UI'
            });

            if (newCategory) {
                setCategories([...categories, newCategory]);
                setSelectedCategory(newCategory.Id);
                setAiInput({ ...aiInput, categoryId: newCategory.Id });
                setIsCreatingCategory(false);
                setNewCategoryName('');
                toast({ title: "Thành công", description: "Đã tạo danh mục mới" });
            }
        } catch (error) {
            toast({ title: "Lỗi", description: "Không thể tạo danh mục", variant: "destructive" });
        }
    };

    const handleFileUpload = () => {
        // Simulate file upload
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                setSelectedFile(file.name);
                setAiInput({ ...aiInput, postType: 'NEW' });
            }
        };
        input.click();
    };

    const handleAiGenerate = async () => {
        if (!user?.id) {
            toast({ title: "Lỗi", description: "Vui lòng đăng nhập", variant: "destructive" });
            return;
        }

        if (!aiInput.categoryId) {
            toast({ title: "Lỗi", description: "Vui lòng chọn danh mục", variant: "destructive" });
            return;
        }

        setIsGenerating(true);

        try {
            // 1. Check for AIBeautyPro API Key
            const settings = await getOpenAISettingsByUserId(user.id);
            const aiBeautySetting = settings.find(s => s.name_api === 'aibeauty' && s.is_active);

            let generatedData: any = null;

            if (aiBeautySetting) {
                // ✅ Use AIBeautyPro Service
                console.log("Using AIBeautyPro Service...");
                const result = await generateCampaignContent({
                    postLink: aiInput.postLink,
                    serviceName: aiInput.serviceName,
                    location: aiInput.locationType === 'NAME' ? aiInput.location : `(${aiInput.coordinates.lat}, ${aiInput.coordinates.long})`,
                    budget: parseInt(aiInput.budget),
                    description: aiInput.description,
                    apiKey: aiBeautySetting.api_key,
                    radius: parseInt(aiInput.coordinates.radius),
                    // Add other fields as needed
                });

                if (result.success && result.data?.campaigns) {
                    generatedData = result.data.campaigns;
                } else {
                    throw new Error(result.error || "Failed to generate content");
                }

            } else {
                // ⚠️ Fallback to Mock Logic (Original)
                console.log("No AIBeautyPro key found, using Mock Logic...");
                await new Promise(resolve => setTimeout(resolve, 2000));

                const timestamp = Date.now();
                const campaignName = `Chiến dịch Test: ${aiInput.serviceName}`;
                const budgetPerSet = Math.floor(parseInt(aiInput.budget) / 3);
                const locationDisplay = aiInput.locationType === 'NAME'
                    ? aiInput.location
                    : `(${aiInput.coordinates.lat}, ${aiInput.coordinates.long})`;

                // Mock structure similar to AI response
                generatedData = [{
                    name: campaignName,
                    adSets: [
                        {
                            name: `${campaignName} - 1`,
                            dailyBudget: budgetPerSet,
                            targeting: {
                                age_min: 18, age_max: 25,
                                genders: [2], // Female
                                geo_locations: { cities: [{ name: locationDisplay, radius: 5 }] },
                                interests: [{ name: 'Làm đẹp' }, { name: 'Spa' }]
                            },
                            ads: [{
                                name: aiInput.postType === 'EXISTING' ? 'Bài viết gốc' : 'Biến thể 1',
                                creative: {
                                    title: `Ưu đãi ${aiInput.serviceName} chỉ còn 50%`,
                                    body: `Cơ hội trải nghiệm ${aiInput.serviceName} với giá cực sốc. Đăng ký ngay hôm nay!`
                                }
                            }]
                        }
                        // Add more mock adsets if needed
                    ]
                }];
            }

            // 2. Save Generated Data to NocoDB
            if (generatedData) {
                for (const campData of generatedData) {
                    // Create Campaign
                    const newCamp = await draftService.createCampaign({
                        Name: campData.name,
                        Objective: 'OUTCOME_SALES', // Default
                        BuyingType: 'AUCTION',
                        Status: 'DRAFT',
                        CategoryId: aiInput.categoryId
                    });

                    if (newCamp) {
                        for (const asData of campData.adSets) {
                            // Create AdSet
                            const newAdSet = await draftService.createAdSet({
                                Name: asData.name,
                                DailyBudget: asData.dailyBudget,
                                BidStrategy: 'LOWEST_COST_WITHOUT_CAP',
                                Targeting: asData.targeting,
                                Status: 'DRAFT',
                                CampaignId: newCamp.Id
                            });

                            if (newAdSet) {
                                for (const adData of asData.ads) {
                                    // Create Ad
                                    await draftService.createAd({
                                        Name: adData.name,
                                        CreativeType: aiInput.postType === 'EXISTING' ? 'EXISTING_POST' : 'NEW_CREATIVE',
                                        PostId: aiInput.postType === 'EXISTING' ? aiInput.postLink : undefined,
                                        CreativeData: aiInput.postType === 'NEW' ? {
                                            headline: adData.creative.title,
                                            content: adData.creative.body,
                                            greeting: "Chào bạn!",
                                            faqs: ["Tư vấn giá", "Đặt lịch"]
                                        } : undefined,
                                        Status: 'DRAFT',
                                        AdSetId: newAdSet.Id
                                    });
                                }
                            }
                        }
                    }
                }

                // Reload campaigns to show new data
                if (selectedCategory) {
                    loadCampaigns(selectedCategory);
                }

                toast({ title: "Thành công", description: "Đã tạo và lưu chiến dịch nháp" });
            }

            setIsAiModalOpen(false);
            setSelectedFile(null);

        } catch (error) {
            console.error("AI Generation Error:", error);
            toast({
                title: "Lỗi",
                description: error instanceof Error ? error.message : "Có lỗi xảy ra khi tạo chiến dịch",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublishCampaigns = async () => {
        if (campaigns.length === 0) {
            toast({ title: "Thông báo", description: "Không có chiến dịch nào để chạy", variant: "default" });
            return;
        }

        setIsPublishing(true);
        queueManager.clearQueue();

        // Build Queue from current campaigns state (which is now fetched from DB)
        const queueItems: QueueItem[] = [];

        campaigns.forEach(campaign => {
            // 1. Create Campaign
            if (selectedIds.has(campaign.id)) {
                queueItems.push({
                    id: campaign.id,
                    type: 'CAMPAIGN',
                    name: campaign.name,
                    status: 'PENDING',
                    data: campaign
                });
            }

            campaign.adSets.forEach(adSet => {
                // 2. Create Ad Set
                if (selectedIds.has(adSet.id)) {
                    queueItems.push({
                        id: adSet.id,
                        type: 'ADSET',
                        name: adSet.name,
                        status: 'PENDING',
                        data: adSet
                    });
                }

                adSet.ads.forEach(ad => {
                    // 3. Create Ad
                    if (selectedIds.has(ad.id)) {
                        queueItems.push({
                            id: ad.id,
                            type: 'AD',
                            name: ad.name,
                            status: 'PENDING',
                            data: ad
                        });
                    }
                });
            });
        });

        queueManager.addToQueue(queueItems);

        // Start Processing
        await queueManager.process((progress) => {
            setPublishProgress(progress);
        });
    };

    return (
        <div className="container mx-auto p-6 h-[calc(100vh-4rem)] flex gap-6">
            {/* Publishing Progress Modal */}
            <Dialog open={isPublishing} onOpenChange={(open) => {
                if (!open && publishProgress.percent < 100) {
                    // Prevent closing while running, or confirm stop
                    if (confirm("Đang chạy chiến dịch. Bạn có chắc muốn dừng lại?")) {
                        queueManager.stop();
                        setIsPublishing(false);
                    }
                } else {
                    setIsPublishing(open);
                }
            }}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Đang đẩy chiến dịch lên Facebook</DialogTitle>
                        <DialogDescription>
                            Hệ thống đang xử lý lần lượt để đảm bảo an toàn và tránh spam.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Tiến độ tổng thể</span>
                                <span className="font-medium">{publishProgress.percent}%</span>
                            </div>
                            <Progress value={publishProgress.percent} className="h-2" />
                            <p className="text-xs text-muted-foreground text-center">
                                Đã xử lý {publishProgress.current}/{publishProgress.total} tác vụ
                            </p>
                        </div>

                        <div className="border rounded-md bg-slate-950 text-slate-50 p-4 font-mono text-xs h-[200px] overflow-hidden flex flex-col">
                            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2">
                                <Loader2 className="h-3 w-3 animate-spin text-green-500" />
                                <span>Nhật ký hệ thống</span>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="space-y-1">
                                    {publishProgress.logs.map((log, i) => (
                                        <div key={i} className="break-words">
                                            {log.includes('❌') ? <span className="text-red-400">{log}</span> :
                                                log.includes('✅') ? <span className="text-green-400">{log}</span> :
                                                    log}
                                        </div>
                                    ))}
                                    <div id="log-end" />
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={() => setIsPublishing(false)}
                            disabled={publishProgress.percent < 100}
                            variant={publishProgress.percent < 100 ? "ghost" : "default"}
                        >
                            {publishProgress.percent < 100 ? "Đang chạy..." : "Đóng"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sidebar: Categories */}
            <Card className="w-64 flex-shrink-0 flex flex-col">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center justify-between">
                        Danh mục
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsCreatingCategory(true)}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </CardTitle>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Tìm kiếm..." className="pl-8" />
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto pt-0">
                    <div className="space-y-1">
                        {categories.map(cat => {
                            const isSelected = selectedCategory === cat.Id;
                            const isAllSelected = isSelected && campaigns.length > 0 && campaigns.every(c => selectedIds.has(c.id) && c.adSets.every(as => selectedIds.has(as.id) && as.ads.every(ad => selectedIds.has(ad.id))));

                            return (
                                <div
                                    key={cat.Id}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${isSelected ? "bg-secondary" : "hover:bg-muted/50"}`}
                                >
                                    <Checkbox
                                        checked={isAllSelected}
                                        onCheckedChange={() => {
                                            if (!isSelected) {
                                                setSelectedCategory(cat.Id);
                                            } else {
                                                handleSelectAll();
                                            }
                                        }}
                                        id={`cat-${cat.Id}`}
                                    />
                                    <button
                                        className="flex-1 text-left text-sm font-normal focus:outline-none"
                                        onClick={() => setSelectedCategory(cat.Id)}
                                    >
                                        {cat.Name}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Main Content */}
            <div className="flex-1 flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Quản lý Chiến dịch Nháp</h1>
                        <p className="text-muted-foreground">
                            Soạn thảo và chuẩn bị chiến dịch trước khi chạy.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                                    <Sparkles className="mr-2 h-4 w-4" /> AI Tạo Chiến Dịch
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>AI Tạo Chiến Dịch Tự Động</DialogTitle>
                                    <DialogDescription>
                                        Nhập thông tin bài viết và mục tiêu, AI sẽ tự động tạo cấu trúc chiến dịch A/B testing tối ưu.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    {/* Category Selection */}
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right">Danh mục</Label>
                                        <div className="col-span-3 flex gap-2">
                                            {isCreatingCategory ? (
                                                <div className="flex-1 flex gap-2 animate-in fade-in slide-in-from-left-2">
                                                    <Input
                                                        placeholder="Nhập tên danh mục mới..."
                                                        value={newCategoryName}
                                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <Button size="icon" onClick={handleCreateCategory} className="bg-green-600 hover:bg-green-700">
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => setIsCreatingCategory(false)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <Select
                                                        value={aiInput.categoryId}
                                                        onValueChange={(v) => setAiInput({ ...aiInput, categoryId: v })}
                                                    >
                                                        <SelectTrigger className="flex-1">
                                                            <SelectValue placeholder="Chọn danh mục" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {categories.map(cat => (
                                                                <SelectItem key={cat.Id} value={cat.Id}>{cat.Name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button size="icon" variant="outline" onClick={() => setIsCreatingCategory(true)} title="Tạo danh mục mới">
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label className="text-right pt-2">Nguồn bài viết</Label>
                                        <div className="col-span-3">
                                            <Tabs defaultValue="EXISTING" onValueChange={(v) => setAiInput({ ...aiInput, postType: v })}>
                                                <TabsList className="grid w-full grid-cols-2">
                                                    <TabsTrigger value="EXISTING">Bài viết sẵn</TabsTrigger>
                                                    <TabsTrigger value="NEW">Tạo bài mới</TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="EXISTING" className="mt-4">
                                                    <Input
                                                        placeholder="ID hoặc Link bài viết Facebook"
                                                        value={aiInput.postLink}
                                                        onChange={(e) => setAiInput({ ...aiInput, postLink: e.target.value })}
                                                    />
                                                </TabsContent>
                                                <TabsContent value="NEW" className="mt-4 space-y-2">
                                                    <div
                                                        onClick={handleFileUpload}
                                                        className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors"
                                                    >
                                                        {selectedFile ? (
                                                            <>
                                                                <div className="h-8 w-8 mb-2 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                                                    <Upload className="h-4 w-4" />
                                                                </div>
                                                                <span className="text-sm font-medium text-green-600">{selectedFile}</span>
                                                                <span className="text-xs">Nhấn để thay đổi</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="h-8 w-8 mb-2" />
                                                                <span className="text-sm">Tải lên ảnh hoặc video</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </TabsContent>
                                            </Tabs>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label className="text-right pt-2">Khu vực</Label>
                                        <div className="col-span-3">
                                            <Tabs defaultValue="NAME" onValueChange={(v) => setAiInput({ ...aiInput, locationType: v })}>
                                                <TabsList className="grid w-full grid-cols-2">
                                                    <TabsTrigger value="NAME">Tên địa điểm</TabsTrigger>
                                                    <TabsTrigger value="COORDINATES">Tọa độ</TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="NAME" className="mt-2">
                                                    <Input
                                                        placeholder="VD: Hà Nội, Hồ Chí Minh"
                                                        value={aiInput.location}
                                                        onChange={(e) => setAiInput({ ...aiInput, location: e.target.value })}
                                                    />
                                                </TabsContent>
                                                <TabsContent value="COORDINATES" className="mt-2 space-y-2">
                                                    <Input
                                                        placeholder="Nhập tọa độ (VD: 21.855, 106.760)"
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            const parts = value.split(',');
                                                            const lat = parts[0] ? parts[0].trim() : '';
                                                            const long = parts[1] ? parts[1].trim() : '';

                                                            setAiInput({
                                                                ...aiInput,
                                                                coordinates: { ...aiInput.coordinates, lat, long }
                                                            });
                                                        }}
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            type="number"
                                                            placeholder="Bán kính (km)"
                                                            value={aiInput.coordinates.radius}
                                                            onChange={(e) => setAiInput({ ...aiInput, coordinates: { ...aiInput.coordinates, radius: e.target.value } })}
                                                        />
                                                        <span className="text-sm text-muted-foreground whitespace-nowrap">km</span>
                                                    </div>
                                                </TabsContent>
                                            </Tabs>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="budget" className="text-right">Ngân sách Test</Label>
                                        <Input
                                            id="budget"
                                            type="number"
                                            className="col-span-3"
                                            value={aiInput.budget}
                                            onChange={(e) => setAiInput({ ...aiInput, budget: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="duration" className="text-right">Thời gian (ngày)</Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            className="col-span-3"
                                            value={aiInput.duration}
                                            onChange={(e) => setAiInput({ ...aiInput, duration: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label htmlFor="description" className="text-right pt-2">Mô tả thêm</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Mô tả thêm về sản phẩm, khách hàng mục tiêu..."
                                            className="col-span-3"
                                            value={aiInput.description}
                                            onChange={(e) => setAiInput({ ...aiInput, description: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsAiModalOpen(false)}>Hủy</Button>
                                    <Button onClick={handleAiGenerate} disabled={isGenerating}>
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Đang tạo...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Tạo chiến dịch
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>


                        <Button variant="outline">
                            <Settings className="mr-2 h-4 w-4" /> Cấu hình
                        </Button>
                        <Button
                            onClick={handlePublishCampaigns}
                            disabled={selectedIds.size === 0 || isProcessing}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang chạy ({queueProgress?.current}/{queueProgress?.total})
                                </>
                            ) : (
                                <>
                                    <Play className="mr-2 h-4 w-4" /> Chạy Chiến dịch ({selectedIds.size})
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <Separator />

                {/* Hierarchy View */}
                <Card className="flex-1 overflow-hidden flex flex-col">
                    <CardContent className="flex-1 overflow-y-auto p-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : campaigns.length > 0 ? (
                            <DraftHierarchy
                                campaigns={campaigns}
                                onAddCampaign={() => console.log('Add campaign')}
                                selectedIds={selectedIds}
                                onToggleSelect={handleToggleSelect}
                                onSelectAll={handleSelectAll}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <p>Chưa có chiến dịch nào trong danh mục này.</p>
                                <Button variant="link" onClick={() => setIsAiModalOpen(true)}>
                                    Tạo chiến dịch ngay
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DraftsPage;
