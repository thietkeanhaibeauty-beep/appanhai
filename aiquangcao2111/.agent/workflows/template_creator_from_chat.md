---
description: Quy trình tạo Template từ Trợ lý AI Chat
---

# Tạo Template từ Trợ lý AI

## Mục tiêu
Khi user gõ "tạo bảng đối tượng" hoặc "tạo template mới" trong chat AI, hệ thống sẽ:
1. Hiển thị form tạo template nhỏ gọn
2. User điền thông tin → Ấn xác nhận
3. Tự động lưu vào bảng `Service_Templates`

## Kiến trúc

```
┌─────────────────┐     ┌──────────────────────┐     ┌───────────────────────┐
│  AIChatPanel    │────▶│ useTemplateCreator   │────▶│ serviceTemplatesService│
│  (UI only)      │     │ Flow (Hook - Logic)  │     │ (API to NocoDB)       │
└─────────────────┘     └──────────────────────┘     └───────────────────────┘
         │
         ▼
┌─────────────────┐
│ TemplateCreator │
│ Card (UI Form)  │
└─────────────────┘
```

## Thứ tự Fields trong Form (Compact)

| # | Field | Type | Required | Default |
|---|-------|------|----------|---------|
| 1 | Từ khóa kích hoạt | text | ✅ | - |
| 2 | Tên chiến dịch | text | ❌ | "" |
| 3 | Tuổi từ - đến | number x2 | ❌ | 18-65 |
| 4 | Giới tính | select | ❌ | all |
| 5 | Ngân sách | number | ❌ | 200000 |
| 6 | Loại vị trí | select | ❌ | country |
| 7 | Vị trí/Tọa độ | text/number | ❌ | Việt Nam |
| 8 | Bán kính km | number | ❌ | 17 (city) / 1 (coord) |
| 9 | Sở thích | text (comma sep) | ❌ | "" |
| 10 | Tiêu đề | textarea | ❌ | "" |
| 11 | Mẫu chào | textarea | ❌ | "" |
| 12 | Câu hỏi thường gặp | textarea | ❌ | "" |

## Files cần tạo/sửa

### 1. Hook: `useTemplateCreatorFlow.ts`
```
Location: src/hooks/useTemplateCreatorFlow.ts
```

Chức năng:
- `isCreating`: boolean - đang hiện form không
- `formData`: TemplateFormData - dữ liệu form
- `setFormData`: cập nhật form
- `createTemplate()`: gọi API tạo
- `resetForm()`: reset form
- `showCreator()`: hiện form
- `hideCreator()`: ẩn form

### 2. Component: `TemplateCreatorCard.tsx`
```
Location: src/components/ai-chat/TemplateCreatorCard.tsx
```

UI Form nhỏ gọn, render trong chat panel

### 3. Sửa `AIChatPanel.tsx`
- Detect keyword: "tạo bảng đối tượng", "tạo template", "tạo mẫu"
- Gọi hook `showCreator()`
- Render `<TemplateCreatorCard />` khi `isCreating = true`

## Data Flow

```
1. User gõ: "tạo bảng đối tượng"
           ↓
2. AIChatPanel detect → gọi showCreator()
           ↓
3. Hiển thị TemplateCreatorCard
           ↓
4. User điền form → click "Tạo template"
           ↓
5. Hook gọi createServiceTemplate({
     user_id: currentUser.id,
     name: "@#" + formData.keyword,
     ...formData
   })
           ↓
6. NocoDB insert record vào Service_Templates
           ↓
7. Success → hideCreator() + addMessage("✅ Đã tạo template @#keyword")
```

## SaaS Data Isolation

- Mỗi template có `user_id` = UUID của user đang login
- Query templates luôn filter by `user_id`
- Không user nào thấy template của user khác

## Trigger Keywords

```javascript
const TEMPLATE_CREATE_KEYWORDS = [
  'tạo bảng đối tượng',
  'tạo template',
  'tạo mẫu',
  'thêm template',
  'thêm mẫu',
  'tạo đối tượng mới'
];
```

## UI Design (Compact Card)

```
┌──────────────────────────────────────────────┐
│ 📋 Tạo template mới                      [X] │
├──────────────────────────────────────────────┤
│ Từ khóa *: [__________________]              │
│ Tên CD:    [__________________]              │
│                                              │
│ Tuổi: [18] - [65]  Giới: [Tất cả ▼]         │
│ Ngân sách: [200000] VNĐ                      │
│                                              │
│ Vị trí: [Quốc gia ▼] [Việt Nam_____]        │
│ Bán kính: [17] km                            │
│                                              │
│ Sở thích: [spa, làm đẹp, ...]               │
│ Tiêu đề: [_________________________]         │
│ Mẫu chào: [_________________________]        │
│ Câu hỏi: [_________________________]         │
│                                              │
│              [Hủy]  [✓ Tạo template]         │
└──────────────────────────────────────────────┘
```

## Ưu tiên Performance

1. **Lazy load** TemplateCreatorCard (chỉ import khi cần)
2. **Debounce** form updates
3. **Không gọi API** cho đến khi ấn "Tạo template"
4. **Hook tách biệt** - không làm nặng AIChatPanel

## Implementation Steps

// turbo-all
1. Tạo file `src/hooks/useTemplateCreatorFlow.ts`
2. Tạo file `src/components/ai-chat/TemplateCreatorCard.tsx`
3. Sửa `AIChatPanel.tsx` để detect keyword và hiển thị card
4. Test: gõ "tạo bảng đối tượng" → form hiện → điền → lưu
5. Verify: template xuất hiện trong trang Bảng đối tượng
