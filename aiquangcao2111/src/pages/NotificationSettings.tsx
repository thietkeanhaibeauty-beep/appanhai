import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Plus, Trash2, Clock, Calendar, Loader2, Play, Settings, User, Users, LogOut, RefreshCw, UserPlus, X, Key, ChevronDown, ChevronUp } from "lucide-react";
import { getNotificationConfigs, createNotificationConfig, updateNotificationConfig, deleteNotificationConfig, NotificationConfig } from "@/services/nocodb/notificationService";
import { supabase } from "@/integrations/supabase/client";
import { zaloAuthService } from "@/services/zaloAuthService";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ZaloLoginButton } from "@/components/auth/ZaloLoginButton";
import { AdminZaloFriendSection } from "@/features/admin-zalo";

const AVAILABLE_METRICS = [
    { id: 'spend', label: 'Chi tiêu' },
    { id: 'results', label: 'Kết quả' },
    { id: 'mess_7d', label: 'Tin nhắn (7 ngày)' },
    { id: 'cost_per_result', label: 'Chi phí/Kết quả' },
    { id: 'revenue', label: 'Doanh thu' },
    { id: 'roas', label: 'ROAS' },
    { id: 'impressions', label: 'Lượt hiển thị' },
    { id: 'clicks', label: 'Lượt nhấp' },
    { id: 'cpc', label: 'CPC' },
    { id: 'ctr', label: 'CTR' },
    { id: 'reach', label: 'Lượt tiếp cận' },
    { id: 'cpm', label: 'CPM' },
    { id: 'cpp', label: 'CPP' },
    { id: 'total_appointments', label: 'Số đặt lịch' },
    { id: 'total_customers', label: 'Số khách hàng' },
    { id: 'answered_calls', label: 'Nghe máy' },
    { id: 'conversion_rate', label: 'Tỷ lệ chốt' },
    { id: 'sales_campaign_name', label: 'Tên chiến dịch (Sale)' },
    { id: 'sales_appointment_time', label: 'Thời gian hẹn' },
    { id: 'sales_status', label: 'Trạng thái hẹn' },
    { id: 'rule_execution', label: 'Hoạt động Quy tắc (Tự động)' },
];

const NotificationSettings = () => {
    const { user } = useAuth();
    const { isSuperAdmin } = useUserRole();
    const isSelectingRef = useRef(false);
    const [configs, setConfigs] = useState<NotificationConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState<{
        name: string;
        schedule_type: 'interval' | 'daily';
        schedule_value: string;
        selected_metrics: string[];
        zalo_own_id?: string;
        zalo_group_ids: string[];
        zalo_group_names?: string;
        report_days?: string; // Number of days for daily report (1=yesterday, 7=week, 30=month)
    }>({
        name: "",
        schedule_type: "interval",
        schedule_value: "60",
        selected_metrics: ['spend', 'results', 'mess_7d', 'cost_per_result'],
        zalo_group_ids: [],
        report_days: "day",
    });

    const [zaloAccounts, setZaloAccounts] = useState<any[]>([]);
    const [zaloGroups, setZaloGroups] = useState<any[]>([]);
    const [savedGroups, setSavedGroups] = useState<any[]>([]); // Groups đã lưu từ ZALO_GROUPS table
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [isZaloExpanded, setIsZaloExpanded] = useState(false); // Collapsible state
    const [loadingZalo, setLoadingZalo] = useState(false);

    // API Key State REMOVED - Managed by Backend Proxy

    const loadZaloAccounts = async () => {
        if (!user?.id) return;
        try {
            const accounts = await zaloAuthService.getZaloAccountsFromNocoDB(user.id);
            setZaloAccounts(accounts);
        } catch (error) {
            console.error('Error loading Zalo accounts:', error);
        }
    };

    const [manualReceivers, setManualReceivers] = useState<any[]>([]);
    const [isAddReceiverDialogOpen, setIsAddReceiverDialogOpen] = useState(false);
    const [searchPhone, setSearchPhone] = useState("");
    const [searchingUser, setSearchingUser] = useState(false);
    const [searchResult, setSearchResult] = useState<any>(null);
    const [openCombobox, setOpenCombobox] = useState<string | null>(null);

    const handleZaloLoginSuccess = (data: any) => {
        loadZaloAccounts();
        toast.success("Đăng nhập Zalo thành công!");
    };

    const loadZaloGroups = async (ownId: string) => {
        setLoadingZalo(true);
        try {
            const result = await zaloAuthService.getGroups(ownId);
            if (result.success) {
                // Chỉ lưu groups mới scan - savedGroups đã được lưu riêng biệt
                setZaloGroups(result.data);
            } else {
                toast.error("Không thể tải danh sách nhóm: " + result.error);
            }
        } catch (error) {
            console.error('Error loading groups:', error);
            toast.error("Lỗi tải danh sách nhóm");
        } finally {
            setLoadingZalo(false);
        }
    };

    // Load saved receivers AND personal connections on mount
    useEffect(() => {
        if (user?.id) {
            const loadAllReceivers = async () => {
                // Load receivers from ZALO_RECEIVERS
                const receiversRes = await zaloAuthService.getReceivers(user.id);
                const receivers = receiversRes.success && receiversRes.data ? receiversRes.data : [];

                // Load personal connections from ZALO_USER_CONNECTIONS
                const connectionsRes = await zaloAuthService.getUserConnections(user.id);
                const connections = connectionsRes.success && connectionsRes.data ? connectionsRes.data : [];

                // Merge both, avoiding duplicates by id
                const existingIds = new Set(receivers.map((r: any) => String(r.id)));
                const mergedReceivers = [
                    ...receivers,
                    ...connections.filter((c: any) => !existingIds.has(String(c.id)))
                ];
                setManualReceivers(mergedReceivers);
            };
            loadAllReceivers();
        }
    }, [user?.id]);

    // Load saved groups on mount - GIỐNG NHƯ RECEIVERS
    useEffect(() => {
        if (user?.id) {
            zaloAuthService.getSavedGroups(user.id).then(res => {
                if (res.success && res.data) {
                    // Lưu vào savedGroups riêng biệt (không bị mất khi loadZaloGroups)
                    setSavedGroups(res.data);
                }
            });
        }
    }, [user?.id]);

    const handleFindUser = async () => {
        if (!searchPhone) {
            toast.error("Vui lòng nhập số điện thoại");
            return;
        }
        if (!selectedAccount) {
            toast.error("Vui lòng chọn tài khoản Zalo trước");
            return;
        }

        setSearchingUser(true);
        setSearchResult(null);
        try {
            const result = await zaloAuthService.findUser(searchPhone, selectedAccount);
            if (result.success) {
                setSearchResult(result.data);
            } else {
                toast.error("Không tìm thấy người dùng: " + (result.error || "Lỗi không xác định"));
            }
        } catch (error) {
            console.error('Error finding user:', error);
            toast.error("Lỗi khi tìm kiếm người dùng");
        } finally {
            setSearchingUser(false);
        }
    };

    const normalizePhone = (phone: string) => {
        let p = phone.replace(/\D/g, '');
        if (p.startsWith('0')) {
            p = '84' + p.substring(1);
        }
        return p;
    };

    const handleAddReceiver = async () => {
        if (!searchResult || !selectedAccount) return;

        const uid = String(searchResult.uid);
        const normalizedSearchPhone = normalizePhone(searchPhone);

        // Check for duplicates
        const isDuplicateId = manualReceivers.some(r => String(r.id) === uid);
        // Check duplicate by normalized phone
        const isDuplicatePhone = manualReceivers.some(r => normalizePhone(r.phone) === normalizedSearchPhone);
        const isAlreadySelected = formData.zalo_group_ids.includes(uid);

        if (isDuplicateId || isDuplicatePhone) {
            toast.error("Người nhận này đã có trong danh sách");
            // If it's in the list but not selected, select it
            if (!isAlreadySelected) {
                setFormData(prev => ({
                    ...prev,
                    zalo_group_ids: [...prev.zalo_group_ids, uid]
                }));
                toast.info("Đã chọn người nhận có sẵn");
            }
            setIsAddReceiverDialogOpen(false);
            return;
        }

        const newReceiver = {
            id: uid,
            name: searchResult.display_name,
            avatar: searchResult.avatar,
            phone: normalizedSearchPhone // Save normalized phone
        };

        // Update local state immediately
        let updatedReceivers = [...manualReceivers];
        updatedReceivers.push(newReceiver);
        setManualReceivers(updatedReceivers);

        // Call API to save receiver to DB (but NOT select it yet)
        try {
            // Use local V2 method to pass ownId correctly
            const result = await zaloAuthService.addReceiverV2(newReceiver, selectedAccount);

            if (result.success) {
                toast.success("Đã thêm người nhận vào danh sách");
                // Do NOT auto select
                // Do NOT auto save group selection
            } else {
                toast.error("Lỗi khi lưu người nhận: " + (result.error || "Unknown"));
            }
        } catch (error) {
            console.error('Error adding receiver:', error);
            toast.error("Lỗi khi lưu người nhận");
        }

        setIsAddReceiverDialogOpen(false);
        setSearchPhone("");
        setSearchResult(null);
    };

    const handleDeleteReceiver = async (receiverId: string) => {
        if (!user?.id) return;
        if (!confirm("Bạn có chắc muốn xóa người nhận này?")) return;

        try {
            const result = await zaloAuthService.deleteReceiver(receiverId, user.id);
            if (result.success) {
                toast.success("Đã xóa người nhận");
                // Update local state
                setManualReceivers(prev => prev.filter(r => r.id !== receiverId));
                // Also remove from selection if selected
                setFormData(prev => ({
                    ...prev,
                    zalo_group_ids: prev.zalo_group_ids.filter(id => id !== receiverId)
                }));
            } else {
                toast.error("Lỗi khi xóa người nhận");
            }
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi xóa người nhận");
        }
    };

    const handleAccountSelect = (accountId: string) => {
        setSelectedAccount(accountId);
        loadZaloGroups(accountId);
        // Find account in list to get current group selection if any
        const account = zaloAccounts.find(a => a.ZaloId === accountId);
        if (account) {
            // Lấy IDs từ account.Id_group
            let existingIds: string[] = [];
            if (Array.isArray(account.Id_group)) {
                existingIds = account.Id_group;
            } else if (typeof account.Id_group === 'string' && account.Id_group) {
                existingIds = account.Id_group.split(',').filter(Boolean);
            }

            // Nếu account.Id_group rỗng, dùng IDs từ savedGroups và manualReceivers
            if (existingIds.length === 0) {
                existingIds = [
                    ...savedGroups.map(g => String(g.groupId)),
                    ...manualReceivers.map(r => String(r.id))
                ];
            }


            setFormData(prev => ({
                ...prev,
                zalo_own_id: accountId,
                zalo_group_ids: existingIds,
            }));
        }
    };

    // Check if changes exist
    const isModified = useMemo(() => {
        if (!selectedAccount) return false;
        const account = zaloAccounts.find(a => a.ZaloId === selectedAccount);
        if (!account) return false;

        const currentIds = formData.zalo_group_ids.slice().sort();

        let savedIds: string[] = [];
        if (Array.isArray(account.Id_group)) {
            savedIds = account.Id_group;
        } else if (typeof account.Id_group === 'string') {
            savedIds = account.Id_group.split(',').filter(Boolean);
        }
        savedIds = savedIds.sort();

        return JSON.stringify(currentIds) !== JSON.stringify(savedIds);
    }, [selectedAccount, formData.zalo_group_ids, zaloAccounts]);

    const handleGroupSelect = (groupId: string) => {
        if (!selectedAccount) return;

        setFormData(prev => {
            const currentIds = prev.zalo_group_ids || [];
            const newIds = currentIds.includes(groupId)
                ? currentIds.filter(id => id !== groupId)
                : [...currentIds, groupId];

            // Update names for display
            const selectedGroups = zaloGroups.filter(g => newIds.includes(g.groupId));
            const names = selectedGroups.map(g => g.name).join(', ');

            return {
                ...prev,
                zalo_group_ids: newIds,
                zalo_group_names: names
            };
        });
    };

    // Save selected groups to backend
    const handleSaveGroup = async () => {
        if (!selectedAccount || formData.zalo_group_ids.length === 0) {
            toast.error("Vui lòng chọn ít nhất một nhóm hoặc người nhận");
            return;
        }

        // Separate selected IDs into groups and receivers
        const selectedGroupIds: string[] = [];
        const selectedReceiverIds: string[] = [];

        for (const id of formData.zalo_group_ids) {
            // Check if this ID is a receiver (in manualReceivers)
            const isReceiver = manualReceivers.some(r => String(r.id) === String(id));
            if (isReceiver) {
                selectedReceiverIds.push(id);
            } else {
                selectedGroupIds.push(id);
            }
        }

        // Filter groups to only save NEW ones (not already in savedGroups)
        const newGroupIds = selectedGroupIds.filter(id =>
            !savedGroups.some(saved => String(saved.groupId) === String(id))
        );

        // Find group data from zaloGroups (scanned list)
        const selectedGroups = newGroupIds
            .map(id => zaloGroups.find(g => String(g.groupId) === String(id)))
            .filter(Boolean);

        const groupInfos = selectedGroups.map(g => ({
            groupId: g.groupId,
            name: g.name,
            avatarUrl: g.avatarUrl,
            memberCount: g.memberCount
        }));

        // Get receiver data from manualReceivers
        const selectedReceivers = manualReceivers.filter(r =>
            selectedReceiverIds.includes(String(r.id))
        );

        // Check if there's anything new to save
        if (groupInfos.length === 0 && selectedReceivers.length === 0) {
            toast.info("Các mục đã chọn đều đã được lưu trước đó.");
            setFormData(prev => ({ ...prev, zalo_group_ids: [] }));
            setOpenCombobox(null);
            return;
        }


        const allNames = [
            ...selectedGroups.map(g => g.name),
            ...selectedReceivers.map(r => r.name)
        ].join(', ');

        try {
            const result = await zaloAuthService.saveSelectedGroup(
                selectedAccount,
                formData.zalo_group_ids,
                allNames,
                user?.id,
                groupInfos,
                selectedReceivers
            );

            if (result.success) {
                toast.success(`Đã lưu ${selectedGroups.length + selectedReceivers.length} mục thành công`);
                // Cập nhật savedGroups với dữ liệu mới lưu (Merge to avoid replacing old data)
                setSavedGroups(prev => [...prev, ...groupInfos]);
                // Clear selection to prevent re-saving same items next time
                setFormData(prev => ({ ...prev, zalo_group_ids: [], zalo_group_names: '' }));
                loadZaloAccounts(); // Refresh to show saved state
            } else {
                toast.error("Lỗi khi lưu nhóm: " + ((result as any).error || "Unknown"));
            }
        } catch (error) {
            console.error('Error saving group:', error);
            toast.error("Lỗi khi lưu nhóm");
        }
    };

    const handleToggleGroupActive = async (accountId: string, currentActive: boolean) => {
        // We need the current group ID to update
        const account = zaloAccounts.find(a => a.ZaloId === accountId);
        if (!account || !account.Id_group) return;

        await zaloAuthService.updateGroupSelection(accountId, account.Id_group, !currentActive);
        loadZaloAccounts();
        toast.success(`Đã ${!currentActive ? 'bật' : 'tắt'} gửi tin cho nhóm này`);
    };

    const handleDeleteZaloAccount = async (accountId: number, accountName: string) => {
        if (!confirm(`Bạn có chắc muốn xóa tài khoản Zalo "${accountName}"?`)) return;

        try {
            const result = await zaloAuthService.deleteZaloAccount(accountId);
            if (result.success) {
                toast.success("Đã xóa tài khoản Zalo");
                loadZaloAccounts(); // Refresh list
            } else {
                toast.error("Lỗi khi xóa tài khoản: " + (result.error || "Unknown"));
            }
        } catch (error) {
            console.error('Error deleting Zalo account:', error);
            toast.error("Lỗi khi xóa tài khoản");
        }
    };

    useEffect(() => {
        loadZaloAccounts();
    }, []);

    const loadConfigs = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const data = await getNotificationConfigs(user.id);
            setConfigs(data);
        } catch (error) {
            console.error('❌ Error loading configs:', error);
            toast.error("Không thể tải cấu hình thông báo");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfigs();
    }, [user?.id]);

    const handleSave = async () => {
        if (!user?.id) return;
        if (!formData.name) {
            toast.error("Vui lòng nhập tên báo cáo");
            return;
        }

        setSaving(true);
        try {
            // Add type prefix: g: for groups, u: for users
            // Include both saved groups and loaded/scanned groups to ensure coverage
            const allGroupIds = [
                ...savedGroups.map(g => String(g.groupId)),
                ...zaloGroups.map(g => String(g.groupId))
            ];
            const receiverIds = manualReceivers.map(r => String(r.id));

            const prefixedIds = formData.zalo_group_ids?.map(id => {
                if (allGroupIds.includes(id)) {
                    return `g:${id}`;
                } else if (receiverIds.includes(id)) {
                    return `u:${id}`;
                }
                // Last resort: Check string format or default heuristic
                // If it looks like a phone number (start with 84), treat as user? No, IDs are UIDs.
                // Just return raw ID and let backend heuristic handle it.
                return id;
            }) || [];

            const payload = {
                user_id: user.id,
                name: formData.name,
                schedule_type: formData.schedule_type,
                schedule_value: formData.schedule_value,
                selected_metrics: formData.selected_metrics,
                zalo_own_id: formData.zalo_own_id,
                zalo_group_id: prefixedIds.join(','), // Now with g:/u: prefixes
                zalo_group_name: formData.zalo_group_names,
                report_days: formData.report_days || 'day', // day | week | month
                is_active: true,
            };

            const result = await createNotificationConfig(payload);
            toast.success("Đã tạo báo cáo định kỳ");
            setIsDialogOpen(false);
            await loadConfigs();
            // Reset form
            setFormData({
                name: "",
                schedule_type: "interval",
                schedule_value: "60",
                selected_metrics: ['spend', 'results', 'mess_7d', 'cost_per_result'],
                zalo_group_ids: [],
                report_days: "day",
            });
        } catch (error) {
            console.error('❌ Error creating config:', error);
            toast.error("Lỗi khi tạo báo cáo");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa báo cáo này?")) return;

        // Optimistic delete - remove from UI immediately
        const previousConfigs = configs;
        setConfigs(configs.filter(c => c.id !== id));
        toast.success("Đã xóa báo cáo");

        // Delete in background
        try {
            await deleteNotificationConfig(id);
        } catch (error) {
            console.error(error);
            // Revert on error
            setConfigs(previousConfigs);
            toast.error("Lỗi khi xóa báo cáo - đã khôi phục");
        }
    };

    const handleToggleActive = async (config: NotificationConfig) => {
        if (!config.id) return;
        try {
            await updateNotificationConfig(config.id, { is_active: !config.is_active });
            // Optimistic update
            setConfigs(configs.map(c => c.id === config.id ? { ...c, is_active: !c.is_active } : c));
            toast.success(`Đã ${!config.is_active ? 'bật' : 'tắt'} báo cáo`);
        } catch (error) {
            console.error(error);
            toast.error(`Lỗi cập nhật trạng thái: ${error instanceof Error ? error.message : 'Unknown error'}`);
            loadConfigs(); // Revert on error
        }
    };

    const handleMetricToggle = (metricId: string) => {
        setFormData(prev => {
            if (prev.selected_metrics.includes(metricId)) {
                return { ...prev, selected_metrics: prev.selected_metrics.filter(m => m !== metricId) };
            } else {
                return { ...prev, selected_metrics: [...prev.selected_metrics, metricId] };
            }
        });
    };

    const [runningId, setRunningId] = useState<string | null>(null);

    const handleRunNow = async (id: string) => {
        setRunningId(id);
        try {
            toast.info("Đang chạy báo cáo...");
            const { data, error } = await supabase.functions.invoke('process-scheduled-reports', {
                body: { config_id: id, user_id: user?.id, force: true }
            });

            if (error) throw error;

            const result = data.results?.[0];
            if (result?.status === 'success') {
                // toast.success("Đã gửi báo cáo thành công!");
            } else {
                toast.error("Lỗi chạy báo cáo: " + (result?.error || "Unknown error"));
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Lỗi: " + error.message);
        } finally {
            setRunningId(null);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Bell className="w-6 h-6 text-primary" />
                        Cài đặt thông báo
                    </h1>
                    <p className="text-muted-foreground">Quản lý các báo cáo tự động gửi về hệ thống</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => loadZaloAccounts()} title="Làm mới danh sách">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Thêm cấu hình
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Tạo báo cáo định kỳ mới</DialogTitle>
                                <DialogDescription>
                                    Thiết lập lịch trình và các chỉ số bạn muốn theo dõi.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Tên báo cáo</Label>
                                    <Input
                                        id="name"
                                        placeholder="Ví dụ: Báo cáo nhanh 1h"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Tần suất gửi</Label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                id="type-interval"
                                                className="accent-primary"
                                                checked={formData.schedule_type === 'interval'}
                                                onChange={() => setFormData({ ...formData, schedule_type: 'interval', schedule_value: '60' })}
                                            />
                                            <Label htmlFor="type-interval" className="cursor-pointer">Lặp lại (Giờ)</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                id="type-daily"
                                                className="accent-primary"
                                                checked={formData.schedule_type === 'daily'}
                                                onChange={() => setFormData({ ...formData, schedule_type: 'daily', schedule_value: '07:00' })}
                                            />
                                            <Label htmlFor="type-daily" className="cursor-pointer">Hàng ngày (Giờ)</Label>
                                        </div>
                                    </div>

                                    {formData.schedule_type === 'interval' ? (
                                        <div className="mt-2">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-muted-foreground" />
                                                <Select
                                                    value={formData.schedule_value}
                                                    onValueChange={(val) => setFormData({ ...formData, schedule_value: val })}
                                                >
                                                    <SelectTrigger className="w-[180px]">
                                                        <SelectValue placeholder="Chọn khoảng thời gian" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="1">Mỗi 1 phút (Test)</SelectItem>
                                                        <SelectItem value="60">Mỗi 1 giờ</SelectItem>
                                                        <SelectItem value="120">Mỗi 2 giờ</SelectItem>
                                                        <SelectItem value="240">Mỗi 4 giờ</SelectItem>
                                                        <SelectItem value="360">Mỗi 6 giờ</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-1.5 ml-6">
                                                {formData.schedule_value === '1' && "Gửi báo cáo mỗi phút (Chỉ dùng để test)"}
                                                {formData.schedule_value === '60' && "Gửi báo cáo 1 tiếng/lần (VD: 8h, 9h, 10h...)"}
                                                {formData.schedule_value === '120' && "Gửi báo cáo 2 tiếng/lần (VD: 8h, 10h, 12h...)"}
                                                {formData.schedule_value === '240' && "Gửi báo cáo 4 tiếng/lần (VD: 8h, 12h, 16h...)"}
                                                {formData.schedule_value === '360' && "Gửi báo cáo 6 tiếng/lần (VD: 6h, 12h, 18h...)"}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 mt-2">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                <Select
                                                    value={formData.schedule_value}
                                                    onValueChange={(val) => setFormData({ ...formData, schedule_value: val })}
                                                >
                                                    <SelectTrigger className="w-[180px]">
                                                        <SelectValue placeholder="Chọn giờ gửi" />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-[200px]">
                                                        {Array.from({ length: 24 }).map((_, i) => {
                                                            const hour = i.toString().padStart(2, '0');
                                                            const time = `${hour}:00`;
                                                            return (
                                                                <SelectItem key={time} value={time}>
                                                                    {time}
                                                                </SelectItem>
                                                            );
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-muted-foreground" />
                                                <Select
                                                    value={formData.report_days || "day"}
                                                    onValueChange={(val) => setFormData({ ...formData, report_days: val })}
                                                >
                                                    <SelectTrigger className="w-[180px]">
                                                        <SelectValue placeholder="Khoảng thời gian" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="day">Hôm qua</SelectItem>
                                                        <SelectItem value="week">Tuần này</SelectItem>
                                                        <SelectItem value="month">Tháng này</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground ml-6">
                                                {formData.report_days === 'day' && "VD: 7h sáng 30/12 → Báo cáo ngày 29/12"}
                                                {formData.report_days === 'week' && "VD: 7h sáng 30/12 → Tổng từ 23/12 đến 29/12"}
                                                {formData.report_days === 'month' && "VD: 7h sáng 30/12 → Tổng từ 01/12 đến 29/12"}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <Label>Chỉ số báo cáo</Label>
                                    <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 max-h-[200px] overflow-y-auto">
                                        {AVAILABLE_METRICS.map((metric) => (
                                            <div key={metric.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`metric-${metric.id}`}
                                                    checked={formData.selected_metrics.includes(metric.id)}
                                                    onCheckedChange={() => handleMetricToggle(metric.id)}
                                                />
                                                <Label
                                                    htmlFor={`metric-${metric.id}`}
                                                    className="text-sm font-normal cursor-pointer"
                                                >
                                                    {metric.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Zalo Selection in Dialog */}
                            {zaloAccounts.length > 0 && (
                                <div className="space-y-3 pt-4 border-t">
                                    <Label className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Gửi qua Zalo
                                    </Label>
                                    <Select
                                        value={formData.zalo_own_id || ""}
                                        onValueChange={handleAccountSelect}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn tài khoản Zalo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {zaloAccounts.map((account) => (
                                                <SelectItem key={account.ZaloId} value={account.ZaloId}>
                                                    {account.Name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {formData.zalo_own_id && (
                                        <div className="space-y-2">
                                            <Label className="text-sm text-muted-foreground">Chọn nhóm/người nhận:</Label>
                                            <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                                                {/* Show saved groups */}
                                                {savedGroups.map((group) => (
                                                    <div key={`group-${group.groupId}`} className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`dialog-group-${group.groupId}`}
                                                            checked={formData.zalo_group_ids.includes(String(group.groupId))}
                                                            onCheckedChange={() => handleGroupSelect(String(group.groupId))}
                                                        />
                                                        <Label htmlFor={`dialog-group-${group.groupId}`} className="text-sm flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            {group.name || group.groupName}
                                                        </Label>
                                                    </div>
                                                ))}
                                                {/* Show manual receivers */}
                                                {manualReceivers.map((receiver) => (
                                                    <div key={`receiver-${receiver.id}`} className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`dialog-receiver-${receiver.id}`}
                                                            checked={formData.zalo_group_ids.includes(String(receiver.id))}
                                                            onCheckedChange={() => handleGroupSelect(String(receiver.id))}
                                                        />
                                                        <Label htmlFor={`dialog-receiver-${receiver.id}`} className="text-sm flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            {receiver.displayName} ({receiver.phone})
                                                        </Label>
                                                    </div>
                                                ))}
                                                {savedGroups.length === 0 && manualReceivers.length === 0 && (
                                                    <p className="text-sm text-muted-foreground">Chưa có nhóm/người nhận nào. Hãy thêm ở phần Tài khoản Zalo bên dưới.</p>
                                                )}
                                            </div>
                                            {formData.zalo_group_ids.length > 0 && (
                                                <p className="text-xs text-muted-foreground">Đã chọn {formData.zalo_group_ids.length} mục</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                                <Button onClick={handleSave} disabled={saving}>
                                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Lưu báo cáo
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Admin Zalo Section - Always show for users to configure admin notifications */}
            <div className="mb-8">
                <AdminZaloFriendSection />
            </div>

            {/* Zalo Accounts Section - Collapsible */}
            {zaloAccounts.length > 0 && (
                <div className="mb-8">
                    <button
                        onClick={() => setIsZaloExpanded(!isZaloExpanded)}
                        className="w-full flex items-center justify-between text-lg font-semibold mb-3 hover:text-primary transition-colors"
                    >
                        <span>Tài khoản Zalo đã kết nối ({zaloAccounts.length})</span>
                        {isZaloExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                        ) : (
                            <ChevronDown className="w-5 h-5" />
                        )}
                    </button>

                    {isZaloExpanded && (
                        <div className="space-y-4">
                            {zaloAccounts.map((account) => (
                                <Card key={account.Id} className="overflow-hidden">
                                    <div className="border-b bg-muted/20 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border bg-background">
                                                    <AvatarImage src={account.Avatar} />
                                                    <AvatarFallback>{(account.Name || "?").charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-semibold text-base">{account.Name || "Zalo User"} <span className="text-xs font-normal text-muted-foreground ml-1">({account.ZaloId})</span></div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>{account.Phone || "Chưa có SĐT"}</span>
                                                        <span>•</span>
                                                        <span className={account.Status === 'Active' ? 'text-green-600 font-medium' : 'text-gray-500'}>
                                                            {account.Status === 'Active' ? 'Đang hoạt động' : 'Chưa kích hoạt'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDeleteZaloAccount(account.Id, account.Name || account.ZaloId)}
                                                title="Xóa tài khoản Zalo"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                {/* Zalo Login Button - above dropdown */}
                                                <ZaloLoginButton onSuccess={() => {
                                                    loadZaloAccounts();
                                                    setIsZaloExpanded(true);
                                                }} />
                                                <div className="flex items-center gap-2">
                                                    <Popover open={openCombobox === account.ZaloId} onOpenChange={(open) => {
                                                        if (open) {
                                                            setOpenCombobox(account.ZaloId);
                                                            setSelectedAccount(account.ZaloId);
                                                            loadZaloGroups(account.ZaloId);
                                                        } else {
                                                            if (!isSelectingRef.current) {
                                                                setOpenCombobox(null);
                                                            }
                                                        }
                                                    }}>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                className="justify-between w-full md:w-[400px]"
                                                            >
                                                                <span className="truncate">
                                                                    {formData.zalo_group_names && selectedAccount === account.ZaloId
                                                                        ? formData.zalo_group_names
                                                                        : (account.selectedGroupName || "Chọn nhóm hoặc người nhận...")}
                                                                </span>
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[400px] p-0" align="start">
                                                            <Command>
                                                                <CommandInput placeholder="Tìm kiếm nhóm hoặc bạn bè..." />
                                                                <CommandList>
                                                                    <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                                                    <CommandGroup heading="Nhóm Zalo (Live)">
                                                                        {zaloGroups.map((group) => {
                                                                            const isSaved = savedGroups.some(g => String(g.groupId) === String(group.groupId) && String(g.user_id) === String(user?.id));
                                                                            return (
                                                                                <CommandItem
                                                                                    key={group.groupId}
                                                                                    value={group.name}
                                                                                    disabled={isSaved}
                                                                                    onSelect={() => {
                                                                                        if (isSaved) return;
                                                                                        isSelectingRef.current = true;
                                                                                        handleGroupSelect(String(group.groupId));
                                                                                        setTimeout(() => isSelectingRef.current = false, 200);
                                                                                    }}
                                                                                >
                                                                                    <Check
                                                                                        className={cn(
                                                                                            "mr-2 h-4 w-4",
                                                                                            formData.zalo_group_ids.includes(String(group.groupId))
                                                                                                ? "opacity-100"
                                                                                                : "opacity-0"
                                                                                        )}
                                                                                    />
                                                                                    <span className="flex-1 truncate">{group.name}</span>
                                                                                    {isSaved && <span className="ml-2 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border">Đã lưu</span>}
                                                                                    <span className="text-xs text-muted-foreground ml-2">({group.memberCount} tv)</span>
                                                                                </CommandItem>
                                                                            );
                                                                        })}
                                                                    </CommandGroup>
                                                                    <CommandGroup heading="Bạn bè đã lưu">
                                                                        {manualReceivers.map((receiver) => {
                                                                            const isSaved = savedGroups.some(g => String(g.groupId) === String(receiver.id) && String(g.user_id) === String(user?.id)); // Check manual receiver too
                                                                            // Wait, savedGroups could contain receivers too? No, logic above might mix them.
                                                                            // Saved receivers are in savedGroups with type='receiver'? No. 
                                                                            // Let's check savedGroups definition.
                                                                            // Assuming duplicate check logic: savedGroups stores groups. manualReceivers stores friends.
                                                                            // But saved receiver is ALSO stored in NocoDB ZALO_RECEIVERS, handled in 'manualReceivers' state?
                                                                            // Actually 'manualReceivers' state here are SEARCH RESULTS or FRIEND LIST?
                                                                            // Line 275: manualReceivers are fetched from saved receivers (NocoDB).
                                                                            // So manualReceivers ARE the saved ones? No.
                                                                            // Let's check getReceivers in zaloAuthService (step 1).
                                                                            // In 'CommandGroup heading="Bạn bè đã lưu"', logic is iterating manualReceivers.
                                                                            // If they are "Bạn bè đã lưu", then they are ALREADY SAVED.
                                                                            // Why display them in dropdown to SAVE AGAIN?
                                                                            // User wants to pick from SAVED LIST? No, this dropdown is for SELECTING TARGETS.
                                                                            // If "Danh sách đã chọn" (right panel) shows targets for THIS account.
                                                                            // Dropdown allows PICKING targets.
                                                                            // If "manualReceivers" are fetched from DB, then they are available to be picked.
                                                                            // Wait, if they are already in DB, do we need to 'save' them again?
                                                                            // The "Lưu lựa chọn" button saves the ASSOCIATION to the specific configuration?
                                                                            // No, this page IS "Notification Configuration".
                                                                            // "Danh sách đã chọn" shows what is configured.
                                                                            // Dropdown shows AVAILABLE options.
                                                                            // "manualReceivers" variable name is confusing. 
                                                                            // Let's check where manualReceivers comes from.
                                                                            // loadSavedReceivers -> setManualReceivers.
                                                                            // So logic: Dropdown shows "Friend List" (scanned) + "Saved Receivers" (manual)?
                                                                            // If they are in `manualReceivers` state (which comes from DB), they ARE Saved.
                                                                            // So "Bạn bè đã lưu" is correct heading.
                                                                            // The issue is: user select them, then click "Lưu lựa chọn".
                                                                            // Does "Lưu lựa chọn" Save them AGAIN to DB?
                                                                            // handleSaveGroup logic above saves to ZALO_GROUPS (or receivers).
                                                                            // If I pick a "Saved Receiver" and click "Save", does it duplicate?
                                                                            // Yes if backend creates new record.
                                                                            // So, for "manualReceivers", they are ALREADY saved. We just want to ENABLE them for this account?
                                                                            // Or this page manages global saved list?
                                                                            // "Cài đặt thông báo" -> "Tài khoản Zalo đã kết nối" -> "Danh sách đã chọn".
                                                                            // This looks like configuring destinations for notifications.
                                                                            // If I select a "Saved Receiver", I want to add it to "Danh sách đã chọn" (which is just a display of what's saved?).
                                                                            // Wait, if "Danh sách đã chọn" = `savedGroups` + `savedReceivers` loaded from DB.
                                                                            // Then adding from dropdown means creating NEW DB record.
                                                                            // If I pick a friend that is ALREADY in "Danh sách đã chọn", I shouldn't be able to pick it again.
                                                                            // "manualReceivers" seems to be the list of ALL friends fetched from Zalo? No, heading says "Bạn bè đã lưu".
                                                                            // Let's assume manualReceivers = Saved Receivers from NocoDB.
                                                                            // If they are already saved, why show in dropdown to save?
                                                                            // Ah, maybe "manualReceivers" are friends that were MANUALLY added (via dialog) but NOT YET saved to this specific configuration?
                                                                            // Or they are Global Saved Receivers?
                                                                            // Let's assume `manualReceivers` variable contains items that should be shown in dropdown.
                                                                            // Check duplicate against `savedGroups` (which contains saved records for THIS display).
                                                                            // But savedGroups contains groups. Is there `savedReceivers` state for display?
                                                                            // Code at line 1033: `const accountGroups = savedGroups...` `const accountReceivers = manualReceivers...`.
                                                                            // Wait, manualReceivers IS the list of displayed saved receivers???
                                                                            // If so, why is it in dropdown?
                                                                            // Using same variable for "Dropdown Source" and "Saved List Display" is wrong if they are different things.
                                                                            // Let's check loadReceivers logic.

                                                                            return (
                                                                                <CommandItem
                                                                                    key={receiver.id}
                                                                                    value={receiver.name}
                                                                                    disabled={isSaved}
                                                                                    onSelect={() => {
                                                                                        if (isSaved) return;
                                                                                        isSelectingRef.current = true;
                                                                                        handleGroupSelect(String(receiver.id));
                                                                                        setTimeout(() => isSelectingRef.current = false, 200);
                                                                                    }}
                                                                                >
                                                                                    <Check className="mr-2 h-4 w-4 opacity-100" />
                                                                                    <div className="flex flex-col">
                                                                                        <span>{receiver.name}</span>
                                                                                        <span className="text-xs text-muted-foreground">{receiver.phone}</span>
                                                                                    </div>
                                                                                    <span className="ml-auto text-[10px] bg-muted px-1 rounded">Đã lưu</span>
                                                                                </CommandItem>
                                                                            );
                                                                        })}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                                <div className="p-2 border-t flex justify-end">
                                                                    <Button size="sm" onClick={() => {
                                                                        handleSaveGroup();
                                                                        setOpenCombobox(null);
                                                                    }}>
                                                                        Lưu lựa chọn
                                                                    </Button>
                                                                </div>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>

                                                    <Dialog open={isAddReceiverDialogOpen && selectedAccount === account.ZaloId} onOpenChange={(open) => {
                                                        setIsAddReceiverDialogOpen(open);
                                                        if (open) setSelectedAccount(account.ZaloId);
                                                    }}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="icon" title="Thêm bạn bè">
                                                                <UserPlus className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Thêm bạn bè Zalo</DialogTitle>
                                                                <DialogDescription>
                                                                    Nhập số điện thoại để tìm kiếm và gửi lời mời kết bạn.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="grid gap-4 py-4">
                                                                <div className="flex gap-2">
                                                                    <Input
                                                                        placeholder="Nhập số điện thoại (VD: 098...)"
                                                                        value={searchPhone}
                                                                        onChange={(e) => setSearchPhone(e.target.value)}
                                                                    />
                                                                    <Button onClick={handleFindUser} disabled={searchingUser}>
                                                                        {searchingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tìm"}
                                                                    </Button>
                                                                </div>

                                                                {searchResult && (
                                                                    <div className="flex items-center justify-between border p-3 rounded-lg">
                                                                        <div className="flex items-center gap-3">
                                                                            <Avatar>
                                                                                <AvatarImage src={searchResult.avatar} />
                                                                                <AvatarFallback>U</AvatarFallback>
                                                                            </Avatar>
                                                                            <div>
                                                                                <div className="font-medium">{searchResult.display_name}</div>
                                                                                <div className="text-sm text-muted-foreground">ID: {searchResult.uid}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <Button size="sm" onClick={async () => {
                                                                                if (!selectedAccount || !searchResult?.uid) return;
                                                                                toast.info("Đang gửi lời mời...");
                                                                                // sendFriendRequest requires userId (from findUser), not phone
                                                                                const req = await zaloAuthService.sendFriendRequest(String(searchResult.uid), selectedAccount);
                                                                                if (req.success) {
                                                                                    toast.success("Đã gửi lời mời kết bạn!");
                                                                                } else {
                                                                                    toast.error("Gửi lời mời thất bại: " + req.error);
                                                                                }
                                                                                handleAddReceiver();
                                                                            }}>
                                                                                Kết bạn & Thêm
                                                                            </Button>
                                                                            <Button size="sm" variant="outline" onClick={handleAddReceiver}>
                                                                                Chỉ thêm
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>


                                            </div>

                                            {/* Right Column: Split into 2 boxes for Groups and Receivers */}
                                            <div className="flex flex-col gap-4">
                                                {/* Box 1: Nhóm Zalo */}
                                                <div className="border rounded-md p-3 bg-muted/20">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-sm font-medium flex items-center gap-1.5">
                                                            <Users className="w-3.5 h-3.5" />
                                                            Nhóm Zalo
                                                        </h4>
                                                        <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border">
                                                            {savedGroups.filter(g => String(g.user_id) === String(user?.id)).length} nhóm
                                                        </span>
                                                    </div>
                                                    <div className="space-y-2 overflow-y-auto pr-1 max-h-[120px]">
                                                        {(() => {
                                                            const accountGroups = savedGroups.filter(g =>
                                                                String(g.user_id) === String(user?.id)
                                                            );
                                                            if (accountGroups.length === 0) return <p className="text-xs text-muted-foreground italic p-2 text-center">Chưa có nhóm nào</p>;

                                                            return accountGroups.map((group: any, index: number) => {
                                                                const id = group.groupId;
                                                                const name = group.name || group.groupName || id;
                                                                const avatar = group.avatarUrl;

                                                                const handleDeleteGroup = async (e: React.MouseEvent) => {
                                                                    e.stopPropagation();
                                                                    if (!confirm(`Bạn có chắc muốn xóa nhóm "${name}"?`)) return;
                                                                    try {
                                                                        await zaloAuthService.deleteGroup(id, user?.id || '');
                                                                        setSavedGroups(prev => prev.filter(g => String(g.groupId) !== String(id)));
                                                                        toast.success(`Đã xóa nhóm "${name}"`);
                                                                    } catch (error) {
                                                                        toast.error('Lỗi khi xóa: ' + error);
                                                                    }
                                                                };

                                                                return (
                                                                    <div key={`group-${id}-${index}`} className="flex items-center justify-between bg-background p-2 rounded border text-sm group/item">
                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                            <Avatar className="h-6 w-6 shrink-0">
                                                                                <AvatarImage src={avatar} />
                                                                                <AvatarFallback>G</AvatarFallback>
                                                                            </Avatar>
                                                                            <div className="flex flex-col overflow-hidden">
                                                                                <span className="truncate font-medium">{name}</span>
                                                                                <span className="text-xs text-muted-foreground">{group.memberCount || 0} thành viên</span>
                                                                            </div>
                                                                        </div>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                                            onClick={handleDeleteGroup}
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </div>

                                                {/* Box 2: Người nhận cá nhân */}
                                                <div className="border rounded-md p-3 bg-muted/20">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-sm font-medium flex items-center gap-1.5">
                                                            <User className="w-3.5 h-3.5" />
                                                            Người nhận cá nhân
                                                        </h4>
                                                        <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border">
                                                            {manualReceivers.filter(r => String(r.account_id) === String(account.Id) || String(r.user_id) === String(user?.id)).length} người
                                                        </span>
                                                    </div>
                                                    <div className="space-y-2 overflow-y-auto pr-1 max-h-[120px]">
                                                        {(() => {
                                                            const accountReceivers = manualReceivers.filter(r =>
                                                                String(r.account_id) === String(account.Id) || String(r.user_id) === String(user?.id)
                                                            );
                                                            if (accountReceivers.length === 0) return <p className="text-xs text-muted-foreground italic p-2 text-center">Chưa có người nhận nào</p>;

                                                            return accountReceivers.map((receiver: any, index: number) => {
                                                                const id = receiver.id;
                                                                const name = receiver.name || receiver.displayName || id;
                                                                const avatar = receiver.avatar;

                                                                const handleDeleteReceiver = async (e: React.MouseEvent) => {
                                                                    e.stopPropagation();
                                                                    if (!confirm(`Bạn có chắc muốn xóa "${name}"?`)) return;
                                                                    try {
                                                                        await zaloAuthService.deleteReceiver(id, user?.id || '');
                                                                        setManualReceivers(prev => prev.filter(r => String(r.id) !== String(id)));
                                                                        toast.success(`Đã xóa "${name}"`);
                                                                    } catch (error) {
                                                                        toast.error('Lỗi khi xóa: ' + error);
                                                                    }
                                                                };

                                                                return (
                                                                    <div key={`receiver-${id}-${index}`} className="flex items-center justify-between bg-background p-2 rounded border text-sm group/item">
                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                            <Avatar className="h-6 w-6 shrink-0">
                                                                                <AvatarImage src={avatar} />
                                                                                <AvatarFallback>U</AvatarFallback>
                                                                            </Avatar>
                                                                            <div className="flex flex-col overflow-hidden">
                                                                                <span className="truncate font-medium">{name}</span>
                                                                                <span className="text-xs text-muted-foreground">{receiver.phone || 'Bạn bè'}</span>
                                                                            </div>
                                                                        </div>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                                            onClick={handleDeleteReceiver}
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card >
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Add Receiver Dialog */}
            <Dialog open={isAddReceiverDialogOpen} onOpenChange={setIsAddReceiverDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thêm người nhận tin nhắn</DialogTitle>
                        <DialogDescription>
                            Nhập số điện thoại (có mã vùng VN +84) để tìm kiếm tài khoản Zalo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Ví dụ: 84987654321"
                                value={searchPhone}
                                onChange={(e) => setSearchPhone(e.target.value)}
                            />
                            <Button onClick={handleFindUser} disabled={searchingUser}>
                                {searchingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : "Tìm"}
                            </Button>
                        </div>

                        {searchResult && (
                            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={searchResult.avatar} />
                                    <AvatarFallback>U</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h4 className="font-medium">{searchResult.display_name}</h4>
                                    <p className="text-sm text-muted-foreground">ID: {searchResult.uid}</p>
                                </div>
                                <Button size="sm" onClick={handleAddReceiver}>Thêm</Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {
                loading ? (
                    <div className="text-center py-12 text-muted-foreground" >
                        <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                        Đang tải cấu hình...
                    </div>
                ) : configs.length === 0 ? (
                    <Card className="bg-muted/50 border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <Bell className="w-12 h-12 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-semibold">Chưa có báo cáo nào</h3>
                            <p className="text-muted-foreground mb-4 max-w-sm">
                                Tạo báo cáo đầu tiên để nhận thông báo về hiệu suất quảng cáo và doanh thu.
                            </p>
                            <Button onClick={() => setIsDialogOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Tạo báo cáo ngay
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {configs.map((config) => (
                            <Card key={config.id} className="relative overflow-hidden transition-all hover:shadow-md">
                                <div className={`absolute top-0 left-0 w-1 h-full ${config.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg truncate pr-8">{config.name}</CardTitle>
                                        <Switch
                                            checked={config.is_active}
                                            onCheckedChange={() => handleToggleActive(config)}
                                        />
                                    </div>
                                    <CardDescription className="flex items-center gap-1">
                                        {config.schedule_type === 'interval' ? (
                                            <>
                                                <Clock className="w-3 h-3" />
                                                Mỗi {parseInt(config.schedule_value) / 60 < 1 ? `${config.schedule_value} phút` : `${parseInt(config.schedule_value) / 60} giờ`}
                                            </>
                                        ) : (
                                            <>
                                                <Calendar className="w-3 h-3" />
                                                Hàng ngày lúc {config.schedule_value}
                                            </>
                                        )}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                                                Chỉ số theo dõi
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {config.selected_metrics.slice(0, 4).map(m => (
                                                    <span key={m} className="px-2 py-0.5 bg-secondary rounded text-xs font-medium">
                                                        {AVAILABLE_METRICS.find(am => am.id === m)?.label.split('(')[0].trim() || m}
                                                    </span>
                                                ))}
                                                {config.selected_metrics.length > 4 && (
                                                    <span className="px-2 py-0.5 bg-secondary rounded text-xs text-muted-foreground">
                                                        +{config.selected_metrics.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-2 flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-2"
                                                disabled={runningId === config.id}
                                                onClick={() => config.id && handleRunNow(config.id)}
                                            >
                                                {runningId === config.id ? (
                                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                ) : (
                                                    <Play className="w-4 h-4 mr-1" />
                                                )}
                                                Chạy thử
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                                                onClick={() => config.id && handleDelete(config.id)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-1" />
                                                Xóa
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
        </div>
    );
};

export default NotificationSettings;
