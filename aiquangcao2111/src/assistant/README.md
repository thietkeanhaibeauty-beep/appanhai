# 🔒 AI ASSISTANT - VÙNG BẢO VỆ

⚠️ **CẢNH BÁO**: Đây là vùng riêng của Trợ lý AI. KHÔNG ĐƯỢC xóa/sửa bừa bãi!

## 🏗️ Kiến trúc A-B-C

**A (UI)** → **B (Hooks - State Machine)** → **C (Services - Backend Calls)**

```
┌─────────────┐
│   UI Layer  │  CreateQuickAd.tsx, AIChatPanel.tsx
│      (A)    │  - Hiển thị messages
│             │  - Render form
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Hooks Layer │  useQuickPostFlow.ts, useCreativeCampaignFlow.ts
│      (B)    │  - State machine (stages)
│             │  - Điều phối logic
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Service Layer│  quickPost.service.ts, orchestrator.ts
│      (C)    │  - Gọi Supabase Edge Functions
│             │  - Build targeting, validate data
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Edge Function│  parse-campaign-with-user-api, create-fb-campaign-step
│   (Backend) │  - AI parsing, FB API calls
└─────────────┘
```

## 📁 Cấu trúc thư mục

```
src/assistant/
├─ hooks/                      # State machine hooks
│  ├─ useQuickPostFlow.ts     # Quick Post flow
│  ├─ useCreativeCampaignFlow.ts
│  ├─ useAudienceFlow.ts
│  └─ useCloneFlow.ts
│
├─ services/                   # Service wrappers
│  ├─ quickPost.service.ts    # Quick Post logic
│  ├─ orchestrator.ts         # Intent detection
│  └─ creativeOrchestrator.ts
│
├─ types/                      # TypeScript types
│  └─ index.ts
│
├─ index.ts                    # Barrel export
└─ README.md                   # This file
```

## 🔄 Luồng Quick Post

### State Machine Stages

```
idle → parsing → awaiting_X → confirming → creating → done
                      ↓
                    error
```

**Stages:**
- `idle`: Chưa bắt đầu
- `parsing`: Đang parse input với AI
- `awaiting_budget`: Đợi user nhập ngân sách
- `awaiting_age`: Đợi user nhập độ tuổi
- `awaiting_gender`: Đợi user nhập giới tính
- `awaiting_location`: Đợi user nhập vị trí
- `awaiting_radius`: Đợi user nhập bán kính
- `awaiting_interests`: Đợi user nhập sở thích
- `confirming`: Đợi user xác nhận
- `creating`: Đang tạo campaign/adset/ad
- `done`: Hoàn thành
- `error`: Lỗi

### API của Hook

```typescript
const {
  stage,          // Current stage
  data,           // Parsed campaign data (partial)
  lastMessage,    // Latest message to show user
  isLoading,      // Loading state
  
  start,          // (input, tokens) => Parse + start flow
  handleInput,    // (text) => Handle user reply at current stage
  confirmAndCreate, // (tokens) => Create campaign/adset/ad
  reset,          // () => Reset to idle
} = useQuickPostFlow();
```

### Ví dụ sử dụng

```typescript
// 1. User nhập text
await start(userInput, {
  adsToken: '...',
  pageToken: '...',
  adAccountId: 'act_123',
  pageId: '456',
});

// 2. Hook tự động detect thiếu gì → chuyển stage
// UI hiển thị: lastMessage

// 3. User trả lời
await handleInput(userReply);

// 4. Lặp lại cho đến stage = 'confirming'

// 5. User click "Xác nhận"
const result = await confirmAndCreate(tokens);
// → { campaignId, adSetId, adId }
```

## 🚫 Quy tắc QUAN TRỌNG

### ❌ KHÔNG ĐƯỢC

1. **Import trực tiếp service cũ:**
   ```typescript
   // ❌ SAI
   import { parseQuickPost } from '@/services/quickCreativeService';
   
   // ✅ ĐÚNG
   import { parseQuickPost } from '@assistant/services/quickPost.service';
   ```

2. **Gọi `supabase.functions.invoke` từ UI:**
   ```typescript
   // ❌ SAI (trong component)
   const { data } = await supabase.functions.invoke('parse-campaign-with-user-api', ...);
   
   // ✅ ĐÚNG
   const parsed = await parseQuickPost(input, tokens);
   ```

3. **Sửa logic trong hook mà không test:**
   - Mỗi thay đổi phải pass 5 UAT cases (xem cuối file)

4. **Xóa file mà không hỏi lead-dev**

### ✅ LUÔN LUÔN

1. **Dùng `@assistant/*` alias:**
   ```typescript
   import { useQuickPostFlow } from '@assistant/hooks/useQuickPostFlow';
   import { createQuickPost } from '@assistant/services/quickPost.service';
   ```

2. **Validate min radius city ≥ 17km:**
   ```typescript
   if (radius < 17) {
     throw new Error('❌ Bán kính tối thiểu cho thành phố là 17km');
   }
   ```

3. **Chuẩn hóa error messages:**
   - `❌ Chưa cấu hình token` (với hướng dẫn)
   - `❌ Link không hợp lệ/không công khai`
   - `⚠️ Thiếu dữ liệu: ...`

## 📦 Thêm flow mới

### Bước 1: Copy template hook

```typescript
// src/assistant/hooks/useNewFlow.ts
export function useNewFlow() {
  const [stage, setStage] = useState<NewFlowStage>('idle');
  const [data, setData] = useState<PartialData>({});
  const [lastMessage, setLastMessage] = useState('');

  const start = async (input: string) => { /* ... */ };
  const handleInput = async (text: string) => { /* ... */ };
  const confirm = async () => { /* ... */ };
  const reset = () => { /* ... */ };

  return { stage, data, lastMessage, start, handleInput, confirm, reset };
}
```

### Bước 2: Tạo service tương ứng

```typescript
// src/assistant/services/newFlow.service.ts
export async function parseNewFlow(input: string) { /* ... */ }
export async function createNewFlow(data: Data) { /* ... */ }
```

### Bước 3: Update barrel export

```typescript
// src/assistant/index.ts
export * from './hooks/useNewFlow';
export * from './services/newFlow.service';
```

### Bước 4: Dùng trong UI

```typescript
const { stage, lastMessage, start } = useNewFlow();

// On user input
await start(userInput);
```

## 🧪 UAT - 5 kịch bản BẮT BUỘC pass

### Case 1: Chỉ dán link FB
- Input: `https://www.facebook.com/123/posts/456`
- Expected: Parse link → Hỏi ngân sách → Hỏi tuổi → ... → Confirm

### Case 2: Đủ thông tin 1 lần
- Input: Link + ngân sách + tuổi + giới tính + vị trí + radius + sở thích
- Expected: Parse → Confirm ngay

### Case 3: Có tọa độ thiếu radius
- Input: Link + location nhưng không có radius
- Expected: Hỏi radius → Validate ≥ 17km

### Case 4: Link private
- Input: Link bài viết riêng tư
- Expected: `❌ Link không hợp lệ/không công khai`

### Case 5: Thiếu token
- Input: Bất kỳ
- Tokens: `{ adsToken: '', ... }`
- Expected: `❌ Chưa cấu hình token Facebook. Vui lòng mở Settings → Facebook`

## 🔍 Debug Tips

### Check stage transition
```typescript
console.log('[Quick Post] Stage:', stage);
console.log('[Quick Post] Data:', data);
```

### Check service calls
```typescript
// Trong service
console.log('[Quick Post Service] Calling edge function:', functionName);
console.log('[Quick Post Service] Params:', params);
```

### Check error details
```typescript
catch (error) {
  console.error('[Quick Post Flow] Error:', {
    stage,
    data,
    error: error instanceof Error ? error.message : error,
  });
}
```

## 📞 Liên hệ

- **Code review**: @lead-dev
- **Backend issues**: @backend-lead
- **Questions**: Đọc file này trước, sau đó hỏi lead
