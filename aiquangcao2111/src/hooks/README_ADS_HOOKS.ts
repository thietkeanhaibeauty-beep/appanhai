/**
 * Hướng dẫn sử dụng các Hooks đã tách từ AdsReportAuto.tsx
 * 
 * Các hooks này giúp giảm kích thước component chính và tăng khả năng tái sử dụng code.
 * 
 * ============================================================
 * HOW TO USE:
 * ============================================================
 * 
 * 1. IMPORT HOOKS:
 * ```tsx
 * import { useAdsSync } from '@/hooks/useAdsSync';
 * import { useAdsLabels } from '@/hooks/useAdsLabels';
 * ```
 * 
 * 2. TRONG COMPONENT:
 * ```tsx
 * const AdsReportAuto = () => {
 *   const { user } = useAuth();
 *   
 *   // Date ranges (giữ nguyên)
 *   const [dateRange, setDateRange] = useState<DateRange | undefined>();
 *   const [historicalDateRange, setHistoricalDateRange] = useState<DateRange | undefined>();
 *   
 *   // Hook đồng bộ dữ liệu
 *   const {
 *     isSyncing, 
 *     syncProgress, 
 *     syncStatus,
 *     loading,
 *     insights,
 *     setInsights,
 *     campaignCatalog,
 *     adsetCatalog,
 *     adCatalog,
 *     accountCurrency,
 *     adAccountStatus,
 *     historicalInsights,
 *     historicalLoading,
 *     historicalSyncing,
 *     historicalError,
 *     derivedCatalogs,
 *     fetchCatalog,
 *     fetchExisting,
 *     handleSyncNow,
 *     fetchHistoricalInsights,
 *     handleHistoricalSync,
 *     sanitizeNocoDBStatus,
 *   } = useAdsSync({
 *     userId: user?.id,
 *     dateRange,
 *     historicalDateRange,
 *   });
 *   
 *   // Hook quản lý labels
 *   const {
 *     labels,
 *     labelAssignments,
 *     labelsManagerOpen,
 *     setLabelsManagerOpen,
 *     assignLabelsOpen,
 *     setAssignLabelsOpen,
 *     loadLabels,
 *     handleAssignLabels,
 *     handleQuickAssignLabelsFromPopover,
 *     handleRemoveLabelBadge,
 *     getLabelsForEntity,
 *   } = useAdsLabels({ insights });
 *   
 *   // ... phần còn lại của component
 * };
 * ```
 * 
 * ============================================================
 * HOOKS REFERENCE:
 * ============================================================
 * 
 * useAdsSync:
 * - Quản lý đồng bộ dữ liệu từ Facebook về NocoDB
 * - fetchCatalog(): Lấy cấu trúc campaigns/adsets/ads
 * - fetchExisting(): Lấy dữ liệu từ database
 * - handleSyncNow(): Trigger đồng bộ ngay
 * - handleHistoricalSync(): Đồng bộ dữ liệu lịch sử
 * 
 * useAdsLabels:
 * - Quản lý nhãn cho campaigns/adsets/ads
 * - loadLabels(): Tải danh sách nhãn
 * - handleAssignLabels(): Gắn nhãn cho nhiều items
 * - handleRemoveLabelBadge(): Xóa nhãn từ badge
 * - getLabelsForEntity(): Lấy nhãn của một entity
 */

export { }; // Make this a module
