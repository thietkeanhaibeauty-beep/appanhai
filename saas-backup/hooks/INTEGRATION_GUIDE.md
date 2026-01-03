# Hướng Dẫn Tích Hợp Hooks vào AdsReportAuto.tsx

## Tại sao không tích hợp tự động?

File `AdsReportAuto.tsx` có 6,684 dòng với logic phức tạp đan xen. Việc thay thế tự động có rủi ro cao gây lỗi runtime. Thay vào đó, sẽ tích hợp **từng hook một** và test sau mỗi bước.

---

## Bước 1: Import Hooks

Thêm vào đầu file `AdsReportAuto.tsx`:

```typescript
// Custom Hooks cho Ads Report
import { useAdsSync } from '@/hooks/useAdsSync';
import { useAdsLabels } from '@/hooks/useAdsLabels';
import { useAdsTableState } from '@/hooks/useAdsTableState';
import { useAdsLayoutPresets } from '@/hooks/useAdsLayoutPresets';
```

---

## Bước 2: Tích hợp useAdsLayoutPresets (Dễ nhất)

Hook này quản lý metric orders, chart types, saved layouts - ít phụ thuộc nhất.

**Trong component, sau dòng `const { user } = useAuth();`:**

```typescript
// Layout Presets Hook
const layoutPresets = useAdsLayoutPresets();

// Destructure những gì cần dùng
const {
  summaryMetricOrder, setSummaryMetricOrder,
  selectedSummaryMetrics, setSelectedSummaryMetrics,
  saleMetricOrder, setSaleMetricOrder,
  selectedSaleMetrics, setSelectedSaleMetrics,
  marketingMetricOrder, setMarketingMetricOrder,
  selectedMarketingMetrics, setSelectedMarketingMetrics,
  summaryViewMode, setSummaryViewMode,
  saleViewMode, setSaleViewMode,
  marketingViewMode, setMarketingViewMode,
  customizerOpen, setCustomizerOpen,
  // ... thêm các giá trị khác cần dùng
} = layoutPresets;
```

**Sau đó XÓA các dòng state tương ứng (dòng 459-589).**

---

## Bước 3: Tích hợp useAdsTableState

Hook này quản lý sorting, selection, breadcrumbs.

```typescript
// Table State Hook  
const tableState = useAdsTableState({ insights });

const {
  sortField, sortDirection, handleSort,
  selectedRows, setSelectedRows, handleSelectRow,
  breadcrumbs, setBreadcrumbs, viewLevel,
  selectedFields, setSelectedFields,
  columnWidths, setColumnWidths,
  // ...
} = tableState;
```

**XÓA các state tương ứng và functions như:**
- `handleSort`, `handleDrillDown`, `handleBreadcrumbClick`
- `handleColumnDragStart/Drop/End`
- State sorting, selection, breadcrumbs

---

## Bước 4: Tích hợp useAdsLabels

```typescript
// Labels Hook
const labelsHook = useAdsLabels({ insights });

const {
  labels, setLabels,
  labelAssignments, setLabelAssignments,
  handleAssignLabels,
  handleRemoveLabelBadge,
  // ...
} = labelsHook;
```

---

## Bước 5: Tích hợp useAdsSync (Phức tạp nhất - Cuối cùng)

Hook này chứa logic sync Facebook phức tạp. Chỉ tích hợp sau khi các hooks khác đã ổn định.

```typescript
// Sync Hook
const syncHook = useAdsSync({
  userId: user?.id,
  dateRange,
  historicalDateRange,
});

// Destructure với tên giống hệt code cũ để backward compatible
const {
  isSyncing, syncProgress, syncStatus, loading,
  insights: syncInsights, setInsights: setSyncInsights,
  fetchExisting, handleSyncNow, fetchCatalog,
  // ...
} = syncHook;
```

---

## Lưu Ý Quan Trọng

1. **Tích hợp từng hook một** và test sau mỗi bước
2. **Giữ nguyên tên biến** để không phải sửa 5,000+ dòng code còn lại
3. **Backup thường xuyên** trước mỗi thay đổi lớn
4. Một số functions trong hooks có thể cần điều chỉnh nhỏ để match API của code cũ

---

## Thời gian ước tính

- Bước 1 (Import): 5 phút
- Bước 2 (Layout Presets): 30 phút  
- Bước 3 (Table State): 45 phút
- Bước 4 (Labels): 30 phút
- Bước 5 (Sync): 60 phút

**Tổng: ~3 giờ** (bao gồm test và debug)
