import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Calendar, Phone, DollarSign, TrendingUp, Edit2, Trash2 } from "lucide-react";
import { formatCurrencyDisplay } from "@/utils/currencyHelpers";
import {
  getSalesReports,
  createSalesReport,
  updateSalesReport,
  deleteSalesReport
} from "@/services/nocodb/salesReportsService";
import { getActiveAdAccounts } from "@/services/nocodb/facebookAdAccountsService";
import { getInsightsByUserAndDate } from "@/services/nocodb/facebookInsightsAutoService";
import { useAuth } from "@/contexts/AuthContext";
import DateRangePicker from "@/components/DateRangePicker";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { subDays, addDays, format } from "date-fns";
import { vi } from "date-fns/locale";

// Default services list
const DEFAULT_SERVICES = [
  "Trị mụn", "Trị nám", "Căng da", "Triệt lông",
  "Chăm sóc da", "Làm trắng", "Trẻ hóa da", "Khác"
];

const SERVICES_STORAGE_KEY = 'aiadsfb_custom_services';

interface SalesRecord {
  Id?: number; // NocoDB ID
  id?: string;
  phone_number: string;
  appointment_status: string;
  appointment_time: string | null;
  completed_at?: string | null; // ✨ NEW: Thời gian chốt đơn
  service_name: string | null;
  service_revenue: number;
  total_revenue: number;
  notes: string | null;
  campaign_name: string | null;
  campaign_results: number;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  ad_date?: string; // Date of the ad that generated this lead
  report_date?: string;
  user_id?: string;
  created_at?: string;
  CreatedAt?: string; // NocoDB format
}

interface Campaign {
  campaign_id: string;
  campaign_name: string;
  results: number;
  status: string;
  date_start?: string; // ✨ NEW: For date-specific attribution
}

// ✨ NEW: AdSet interface for granular reporting
interface AdSet {
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  results: number;
  status: string;
  date_start?: string; // ✨ NEW: For date-specific attribution
}

const SalesReport = () => {
  const { user } = useAuth();
  const [salesData, setSalesData] = useState<SalesRecord[]>([]);
  const [filteredData, setFilteredData] = useState<SalesRecord[]>([]);
  const [searchPhone, setSearchPhone] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalesRecord | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // ✨ AdSet state for granular attribution
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [selectedAdSet, setSelectedAdSet] = useState<AdSet | null>(null);
  const [selectionLevel, setSelectionLevel] = useState<'campaign' | 'adset'>('campaign');
  const [selectedAdDate, setSelectedAdDate] = useState<Date | undefined>(undefined); // ✨ NEW: Date picker for ad attribution

  const [isCampaignLinked, setIsCampaignLinked] = useState(false);

  // Custom services state
  const [customServices, setCustomServices] = useState<string[]>([]);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");

  // Date range state (default today)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  // Form state
  const [formData, setFormData] = useState({
    phone_number: "",
    appointment_status: "Chưa liên hệ",
    appointment_time: "",
    completed_at: "", // ✨ NEW: Thời gian chốt đơn
    service_name: "",
    service_revenue: 0,
    total_revenue: 0,
    notes: "",
    campaign_name: "",
    campaign_results: 0,
  });

  // Summary metrics
  const totalAppointments = filteredData.length;
  const totalCustomers = new Set(filteredData.map(r => r.phone_number)).size;
  const totalRevenue = filteredData.reduce((sum, r) => sum + r.total_revenue, 0);
  // ✨ Updated: Count deals that have revenue (closed deals)
  const completedDeals = filteredData.filter(r => r.total_revenue > 0).length;
  const conversionRate = totalAppointments > 0 ? ((completedDeals / totalAppointments) * 100).toFixed(2) : "0.00";

  // ✨ NEW: Business metrics from FB data
  const totalResults = campaigns.reduce((sum, c) => sum + c.results, 0);
  // Tỉ lệ SĐT = SĐT (từ Sales) / Kết quả (từ FB) × 100
  const sdtRate = totalResults > 0 ? ((totalCustomers / totalResults) * 100).toFixed(2) : "0.00";
  // ✅ FIX: Tỉ lệ đặt lịch = Số đặt lịch / Kết quả (FB) × 100  
  const bookingRate = totalResults > 0 ? ((totalAppointments / totalResults) * 100).toFixed(2) : "0.00";

  // Load sales data and campaigns
  useEffect(() => {
    if (user?.id) {
      fetchSalesData();
      fetchAdObjects();
    }
  }, [user?.id, dateRange]);

  // Load custom services from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SERVICES_STORAGE_KEY);
    if (saved) {
      try {
        setCustomServices(JSON.parse(saved));
      } catch {
        setCustomServices([]);
      }
    }
  }, []);

  // All services = default + custom
  const allServices = [...DEFAULT_SERVICES.filter(s => s !== 'Khác'), ...customServices, 'Khác'];

  // Add new service handler
  const handleAddService = () => {
    if (!newServiceName.trim()) {
      toast.error("Vui lòng nhập tên dịch vụ");
      return;
    }
    if (allServices.includes(newServiceName.trim())) {
      toast.error("Dịch vụ đã tồn tại");
      return;
    }
    const updated = [...customServices, newServiceName.trim()];
    setCustomServices(updated);
    localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(updated));
    setNewServiceName("");
    setIsAddServiceOpen(false);
    toast.success(`Đã thêm dịch vụ "${newServiceName.trim()}"`);
  };

  // Filter data based on search
  useEffect(() => {
    if (searchPhone.trim()) {
      setFilteredData(salesData.filter(r => r.phone_number.includes(searchPhone)));
    } else {
      setFilteredData(salesData);
    }
  }, [searchPhone, salesData]);

  const fetchSalesData = async () => {
    try {
      if (!user?.id) {
        toast.error("Vui lòng đăng nhập");
        return;
      }
      const startDate = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : undefined;
      const endDate = dateRange?.to ? dateRange.to.toISOString().split('T')[0] : undefined;
      const data = await getSalesReports(user.id, startDate, endDate);
      setSalesData(data || []);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      toast.error("Không thể tải dữ liệu báo cáo sale");
    }
  };

  const fetchAdObjects = async () => {
    try {
      if (!user?.id) {
        toast.error("Vui lòng đăng nhập");
        return;
      }

      // 1. Get active ad account first
      const accounts = await getActiveAdAccounts(user.id);
      const activeAccount = accounts.find(acc => acc.is_active === 1 || acc.is_active === true);

      if (!activeAccount) {
        return;
      }

      // 2. Get insights with account_id
      const endDate = dateRange?.to ? dateRange.to.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const startDate = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const data = await getInsightsByUserAndDate(user.id, startDate, endDate, activeAccount.account_id);

      // Group by campaign (aggregated)
      const campaignMap = new Map<string, Campaign>();
      // ✨ Aggregate AdSets + track LATEST date per adset (for correct results)
      const adsetMap = new Map<string, AdSet>();
      const adsetDatesMap = new Map<string, string>(); // ✅ FIX: Store latest date per adset

      const getMess7d = (row: any) => {
        // Prioritize started_7d (Mess 7d)
        if (row.started_7d) return Number(row.started_7d);
        if (row['onsite_conversion.messaging_conversation_started_7d']) return Number(row['onsite_conversion.messaging_conversation_started_7d']);

        // Fallback to actions
        if (row.actions && Array.isArray(row.actions)) {
          const action = row.actions.find((a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d');
          if (action) return Number(action.value);
        }
        return 0;
      };

      data?.forEach((row) => {
        const status = row.effective_status || row.configured_status || row.status || 'UNKNOWN';
        const mess7d = getMess7d(row);
        const dateStr = row.date_start?.split?.(/[T ]/)?.[0] || '';

        // ✨ Campaign aggregation - only use campaign-level rows (no adset_id) to avoid double counting
        // If adset_id exists, skip for campaign aggregation - we'll get it from campaign-level row
        if (row.campaign_id && row.campaign_name && !row.adset_id) {
          const existing = campaignMap.get(row.campaign_id);
          if (existing) {
            existing.results += mess7d;
            if (status !== 'UNKNOWN') existing.status = status;
          } else {
            campaignMap.set(row.campaign_id, {
              campaign_id: row.campaign_id,
              campaign_name: row.campaign_name,
              results: mess7d,
              status: status
            });
          }
        }

        // ✨ AdSet aggregation - only from rows WITH adset_id
        // ✅ FIX: Keep ONLY the LATEST date's results per adset (no summing across dates)
        if (row.adset_id && row.adset_name) {
          const rowDate = dateStr || '1970-01-01';
          const existingAdset = adsetMap.get(row.adset_id);
          const existingDate = adsetDatesMap.get(row.adset_id) || '1970-01-01';

          // Only update if this row's date is newer than existing
          if (!existingAdset || rowDate > existingDate) {
            adsetMap.set(row.adset_id, {
              adset_id: row.adset_id,
              adset_name: row.adset_name,
              campaign_id: row.campaign_id || '',
              campaign_name: row.campaign_name || '',
              results: mess7d,
              status: status,
              date_start: rowDate // ✨ Store the date for display
            });
            adsetDatesMap.set(row.adset_id, rowDate);
          }

          // ✨ Fallback: If campaign wasn't added from campaign-level row, add from adset row
          if (!campaignMap.has(row.campaign_id) && row.campaign_id && row.campaign_name) {
            campaignMap.set(row.campaign_id, {
              campaign_id: row.campaign_id,
              campaign_name: row.campaign_name,
              results: 0, // Will sum from adsets
              status: status
            });
          }
        }
      });

      // ✨ If campaigns were created from adset rows (results=0), sum their adset results
      campaignMap.forEach((campaign) => {
        if (campaign.results === 0) {
          const campaignAdsets = Array.from(adsetMap.values()).filter(
            as => as.campaign_id === campaign.campaign_id
          );
          campaign.results = campaignAdsets.reduce((sum, as) => sum + as.results, 0);
        }
      });

      const campaignsList = Array.from(campaignMap.values());
      const adsetsList = Array.from(adsetMap.values());


      setCampaigns(campaignsList);
      setAdSets(adsetsList);
    } catch (error) {
      console.error("Error fetching ad objects:", error);
      toast.error("Không thể tải danh sách chiến dịch");
    }
  };

  const handleSubmit = async () => {
    try {
      if (!user?.id) {
        toast.error("Vui lòng đăng nhập");
        return;
      }
      const payload = {
        phone_number: formData.phone_number,
        appointment_status: formData.appointment_status,
        service_name: formData.service_name,
        service_revenue: formData.service_revenue,
        total_revenue: formData.total_revenue,
        notes: formData.notes,
        // ✨ NEW: Thời gian chốt đơn
        completed_at: formData.completed_at ? new Date(formData.completed_at).toISOString() : null,
        // ✨ Handle both campaign and adset level selection
        campaign_id: isCampaignLinked
          ? (selectionLevel === 'adset' ? selectedAdSet?.campaign_id : selectedCampaign?.campaign_id)
          : null,
        adset_id: isCampaignLinked && selectionLevel === 'adset'
          ? selectedAdSet?.adset_id
          : null,
        // ✨ Use dedicated selectedAdDate from date picker
        ad_date: isCampaignLinked && selectedAdDate
          ? format(selectedAdDate, 'yyyy-MM-dd')
          : null,
        campaign_name: isCampaignLinked ? formData.campaign_name : null,
        campaign_results: isCampaignLinked ? formData.campaign_results : 0,
        // Sanitize date fields: send null if empty string
        appointment_time: formData.appointment_time ? new Date(formData.appointment_time).toISOString() : null,
        report_date: formData.appointment_time
          ? formData.appointment_time.split('T')[0]
          : new Date().toISOString().split('T')[0], // Default to today if no appointment time
        user_id: user.id,
      };

      if (editingRecord) {
        // ✅ Validate ID exists before update
        const recordId = editingRecord.Id;
        if (!recordId) {
          toast.error("Lỗi: Không tìm thấy ID bản ghi để cập nhật");
          return;
        }
        await updateSalesReport(recordId, payload);
        toast.success("Cập nhật báo cáo thành công");
      } else {
        await createSalesReport(payload);
        toast.success("Thêm báo cáo mới thành công");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchSalesData();
    } catch (error) {
      console.error("Error saving sales record:", error);
      toast.error("Không thể lưu báo cáo");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa báo cáo này?")) return;

    try {
      await deleteSalesReport(id);
      toast.success("Xóa báo cáo thành công");
      fetchSalesData();
    } catch (error) {
      console.error("Error deleting record:", error);
      toast.error("Không thể xóa báo cáo");
    }
  };

  // ✨ Helper to convert ISO datetime to datetime-local format
  const formatDateForInput = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      // Format to yyyy-MM-ddTHH:mm (required by datetime-local input)
      return date.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  const handleEdit = (record: SalesRecord) => {
    setEditingRecord(record);
    setFormData({
      phone_number: record.phone_number,
      appointment_status: record.appointment_status || "Chưa liên hệ",
      appointment_time: formatDateForInput(record.appointment_time),
      completed_at: formatDateForInput(record.completed_at),
      service_name: record.service_name || "",
      service_revenue: record.service_revenue,
      total_revenue: record.total_revenue,
      notes: record.notes || "",
      campaign_name: record.campaign_name || "",
      campaign_results: record.campaign_results || 0,
    });

    // Find and set the selected campaign or adset
    if (record.adset_id) {
      // ✨ NEW: Restore adset selection
      const adset = adSets.find(a => a.adset_id === record.adset_id);
      if (adset) {
        setSelectedAdSet(adset);
        setSelectionLevel('adset');
        setIsCampaignLinked(true);
      }
    } else if (record.campaign_name) {
      const campaign = campaigns.find(c => c.campaign_name === record.campaign_name);
      setSelectedCampaign(campaign || null);
      setSelectionLevel('campaign');
      setIsCampaignLinked(true);
    } else {
      setIsCampaignLinked(false);
    }

    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingRecord(null);
    setSelectedCampaign(null);
    setSelectedAdSet(null);
    setSelectionLevel('campaign');
    setSelectedAdDate(undefined); // ✨ Clear ad date
    setIsCampaignLinked(false);
    setFormData({
      phone_number: "",
      appointment_status: "Chưa liên hệ",
      appointment_time: "",
      completed_at: "", // ✨ Thời gian chốt đơn
      service_name: "",
      service_revenue: 0,
      total_revenue: 0,
      notes: "",
      campaign_name: "",
      campaign_results: 0,
    });
  };

  const handleCampaignSelect = (campaignId: string) => {
    const campaign = campaigns.find(c => c.campaign_id === campaignId);
    if (campaign) {
      setSelectedCampaign(campaign);
      setSelectedAdSet(null); // ✨ Clear adset when selecting campaign
      setFormData({
        ...formData,
        campaign_name: campaign.campaign_name,
        campaign_results: campaign.results,
      });
    }
  };

  // ✨ Handle adset selection (simple ID, date is selected separately)
  const handleAdSetSelect = (adsetId: string) => {
    const adset = adSets.find(a => a.adset_id === adsetId);
    if (adset) {
      setSelectedAdSet(adset);
      setSelectedCampaign(null);
      setFormData({
        ...formData,
        campaign_name: `[${adset.campaign_name}] ${adset.adset_name}`,
        campaign_results: adset.results,
      });
    }
  };

  return (
    <div className="p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Báo cáo Sale</h1>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Thêm báo cáo mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRecord ? "Chỉnh sửa báo cáo" : "Thêm báo cáo mới"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="link_campaign"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={isCampaignLinked}
                      onChange={(e) => {
                        setIsCampaignLinked(e.target.checked);
                        if (!e.target.checked) {
                          setSelectedCampaign(null);
                          setSelectedAdSet(null);
                          setSelectionLevel('campaign');
                          setFormData(prev => ({
                            ...prev,
                            campaign_name: "",
                            campaign_results: 0
                          }));
                        }
                      }}
                    />
                    <Label htmlFor="link_campaign">Liên kết với chiến dịch quảng cáo</Label>
                  </div>

                  {isCampaignLinked && (
                    <div className="space-y-3">
                      {/* ✨ Date Picker - FIRST, applies to BOTH levels */}
                      <div>
                        <Label>📅 Ngày quảng cáo</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {selectedAdDate ? (
                                format(selectedAdDate, "dd/MM/yyyy", { locale: vi })
                              ) : (
                                <span className="text-muted-foreground">Chọn ngày QC...</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={selectedAdDate}
                              onSelect={setSelectedAdDate}
                              locale={vi}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Selection Level Toggle */}
                      <div className="flex items-center gap-4">
                        <Label className="text-sm font-medium">Cấp độ:</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={selectionLevel === 'campaign' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              setSelectionLevel('campaign');
                              setSelectedAdSet(null);
                            }}
                          >
                            Chiến dịch
                          </Button>
                          <Button
                            type="button"
                            variant={selectionLevel === 'adset' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              setSelectionLevel('adset');
                              setSelectedCampaign(null);
                            }}
                          >
                            Nhóm QC
                          </Button>
                        </div>
                      </div>

                      {/* Campaign Select (when level = campaign) */}
                      {selectionLevel === 'campaign' && (
                        <div>
                          <Label htmlFor="campaign">Chiến dịch quảng cáo</Label>
                          <Select
                            value={selectedCampaign?.campaign_id || ""}
                            onValueChange={handleCampaignSelect}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn chiến dịch..." />
                            </SelectTrigger>
                            <SelectContent>
                              {campaigns
                                .filter(c => !['DELETED', 'ARCHIVED'].includes(c.status))
                                .map((campaign) => (
                                  <SelectItem key={campaign.campaign_id} value={campaign.campaign_id}>
                                    {campaign.campaign_name} ({campaign.status === 'ACTIVE' ? 'Đang chạy' : campaign.status === 'PAUSED' ? 'Tạm dừng' : campaign.status}) - {campaign.results} tin nhắn
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* AdSet Select (when level = adset) */}
                      {selectionLevel === 'adset' && (
                        <div>
                          <Label htmlFor="adset">Nhóm Quảng cáo (Ad Set)</Label>
                          <Select
                            value={selectedAdSet?.adset_id || ""}
                            onValueChange={handleAdSetSelect}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn nhóm quảng cáo..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {campaigns
                                .filter(c => !['DELETED', 'ARCHIVED'].includes(c.status))
                                .map((camp) => {
                                  const campAdSets = adSets.filter(
                                    as => as.campaign_id === camp.campaign_id && !['DELETED', 'ARCHIVED'].includes(as.status)
                                  );
                                  if (campAdSets.length === 0) return null;
                                  return (
                                    <SelectGroup key={camp.campaign_id}>
                                      <SelectLabel className="font-semibold text-primary">
                                        📁 {camp.campaign_name}
                                      </SelectLabel>
                                      {campAdSets.map((adset) => (
                                        <SelectItem key={adset.adset_id} value={adset.adset_id}>
                                          {adset.adset_name} - {adset.results} tin nhắn
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  );
                                })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone_number">Số điện thoại *</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="0912345678"
                  />
                </div>

                <div>
                  <Label htmlFor="appointment_status">Trạng thái lịch hẹn</Label>
                  <Select
                    value={formData.appointment_status}
                    onValueChange={(value) => setFormData({ ...formData, appointment_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Chưa liên hệ">Chưa liên hệ</SelectItem>
                      <SelectItem value="Đã liên hệ">Đã liên hệ</SelectItem>
                      <SelectItem value="Đã đặt lịch">Đã đặt lịch</SelectItem>
                      <SelectItem value="Đã đến">Đã đến</SelectItem>
                      <SelectItem value="Đã chốt đơn">Đã chốt đơn</SelectItem>
                      <SelectItem value="Không đến">Không đến</SelectItem>
                      <SelectItem value="Hủy lịch">Hủy lịch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="appointment_time">Thời gian hẹn</Label>
                  <Input
                    id="appointment_time"
                    type="datetime-local"
                    value={formData.appointment_time}
                    onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="completed_at">Thời gian chốt đơn</Label>
                  <Input
                    id="completed_at"
                    type="datetime-local"
                    value={formData.completed_at}
                    onChange={(e) => setFormData({ ...formData, completed_at: e.target.value })}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="service_name">Dịch vụ</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setIsAddServiceOpen(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Thêm mới
                    </Button>
                  </div>
                  <Select
                    value={formData.service_name}
                    onValueChange={(value) => setFormData({ ...formData, service_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn dịch vụ" />
                    </SelectTrigger>
                    <SelectContent>
                      {allServices.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Add Service Mini Dialog */}
                  {isAddServiceOpen && (
                    <div className="mt-2 p-2 border rounded-lg bg-muted/50">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Tên dịch vụ mới..."
                          value={newServiceName}
                          onChange={(e) => setNewServiceName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddService()}
                          className="h-8"
                        />
                        <Button size="sm" className="h-8" onClick={handleAddService}>
                          Thêm
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setIsAddServiceOpen(false)}>
                          Hủy
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="service_revenue">Doanh thu dịch vụ (VND)</Label>
                  <Input
                    id="service_revenue"
                    value={formData.service_revenue.toLocaleString('vi-VN')}
                    onChange={(e) => {
                      const numValue = parseInt(e.target.value.replace(/\./g, '').replace(/,/g, '')) || 0;
                      setFormData({ ...formData, service_revenue: numValue });
                    }}
                    placeholder="1.000.000"
                  />
                </div>

                <div>
                  <Label htmlFor="total_revenue">Doanh thu tổng (VND)</Label>
                  <Input
                    id="total_revenue"
                    value={formData.total_revenue.toLocaleString('vi-VN')}
                    onChange={(e) => {
                      const numValue = parseInt(e.target.value.replace(/\./g, '').replace(/,/g, '')) || 0;
                      setFormData({ ...formData, total_revenue: numValue });
                    }}
                    placeholder="1.000.000"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Ghi chú</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ghi chú thêm..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleSubmit} className="w-full">
                  {editingRecord ? "Cập nhật" : "Thêm mới"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ✨ Business Metrics Row - ĐẶT TRÊN CÙNG */}
      <div className="grid grid-cols-2 gap-1.5">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-1.5 pb-0">
            <CardTitle className="text-[9px] font-medium">TỈ LỆ ĐẶT LỊCH</CardTitle>
            <Calendar className="h-3 w-3 text-green-600" />
          </CardHeader>
          <CardContent className="p-1.5 pt-0">
            <div className="text-sm font-bold text-green-600 dark:text-green-400">{bookingRate}%</div>
            <p className="text-[8px] text-muted-foreground">{totalAppointments}/{totalResults}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-1.5 pb-0">
            <CardTitle className="text-[9px] font-medium">DOANH THU</CardTitle>
            <DollarSign className="h-3 w-3 text-yellow-600" />
          </CardHeader>
          <CardContent className="p-1.5 pt-0">
            <div className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{formatCurrencyDisplay(totalRevenue, "VND")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards - SỐ LIỆU CHI TIẾT */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-1.5 pb-0">
            <CardTitle className="text-[9px] font-medium">SỐ ĐẶT LỊCH</CardTitle>
            <Calendar className="h-3 w-3 text-purple-600" />
          </CardHeader>
          <CardContent className="p-1.5 pt-0">
            <div className="text-sm font-bold text-purple-600 dark:text-purple-400">{totalAppointments}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-1.5 pb-0">
            <CardTitle className="text-[9px] font-medium">SỐ KHÁCH HÀNG</CardTitle>
            <Phone className="h-3 w-3 text-orange-600" />
          </CardHeader>
          <CardContent className="p-1.5 pt-0">
            <div className="text-sm font-bold text-orange-600 dark:text-orange-400">{totalCustomers}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-1.5 pb-0">
            <CardTitle className="text-[9px] font-medium">TỈ LỆ SĐT</CardTitle>
            <Phone className="h-3 w-3 text-blue-600" />
          </CardHeader>
          <CardContent className="p-1.5 pt-0">
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{sdtRate}%</div>
            <p className="text-[8px] text-muted-foreground">{totalCustomers}/{totalResults}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-1.5 pb-0">
            <CardTitle className="text-[9px] font-medium">TỶ LỆ CHUYỂN ĐỔI</CardTitle>
            <TrendingUp className="h-3 w-3 text-pink-600" />
          </CardHeader>
          <CardContent className="p-1.5 pt-0">
            <div className="text-sm font-bold text-pink-600 dark:text-pink-400">{conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Tìm kiếm theo số điện thoại..."
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chiến dịch</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Kết quả</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead>Lịch hẹn</TableHead>
                  <TableHead>Thời gian hẹn</TableHead>
                  <TableHead>Thời gian chốt</TableHead>
                  <TableHead>Dịch vụ</TableHead>
                  <TableHead>Doanh thu DV</TableHead>
                  <TableHead>Doanh thu tổng</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground">
                      Chưa có dữ liệu báo cáo sale
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((record, idx) => (
                    <TableRow key={record.Id || idx}>
                      <TableCell className="font-medium">{record.campaign_name || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.CreatedAt
                          ? new Date(record.CreatedAt).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                          })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-primary font-semibold">{record.campaign_results || 0}</TableCell>
                      <TableCell className="font-medium">{record.phone_number}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs ${record.appointment_status === "completed"
                            ? "bg-green-100 text-green-800"
                            : record.appointment_status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                            }`}
                        >
                          {record.appointment_status === "completed"
                            ? "Hoàn thành"
                            : record.appointment_status === "cancelled"
                              ? "Đã hủy"
                              : "Đã đặt"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {record.appointment_time
                          ? new Date(record.appointment_time).toLocaleString("vi-VN")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {record.completed_at
                          ? new Date(record.completed_at).toLocaleString("vi-VN")
                          : "-"}
                      </TableCell>
                      <TableCell>{record.service_name || "-"}</TableCell>
                      <TableCell>{formatCurrencyDisplay(record.service_revenue, "VND")}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrencyDisplay(record.total_revenue, "VND")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(record.Id!)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesReport;