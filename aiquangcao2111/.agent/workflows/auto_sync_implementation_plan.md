---
description: Kế hoạch triển khai hệ thống đồng bộ quảng cáo tự động (Backend-Driven)
---

# Kế hoạch Triển khai: Hệ thống Đồng bộ Quảng cáo Tự động (Auto-Sync)

Tài liệu này mô tả chi tiết kế hoạch chuyển đổi từ cơ chế đồng bộ thủ công (Client-side) sang hệ thống đồng bộ tự động chạy ngầm (Server-side/Edge Function) với tần suất 5 phút/lần, kết hợp cập nhật Realtime lên giao diện người dùng.

## 1. Mục tiêu
*   **Tự động hóa:** Dữ liệu quảng cáo được cập nhật tự động 5 phút/lần ngay cả khi người dùng tắt ứng dụng.
*   **Chính xác:** Đảm bảo logic tính toán chỉ số (metrics) ở Backend khớp 100% với logic hiện tại ở Frontend.
*   **Realtime:** Giao diện tự động hiển thị số liệu mới nhất mà không cần tải lại trang.
*   **Ổn định:** Giữ nguyên chức năng "Đồng bộ tất cả" (thủ công) như một phương án dự phòng và kiểm tra.

## 2. Kiến trúc Hệ thống

### A. Luồng dữ liệu (Data Flow)
1.  **Trigger:** Cron Job (Scheduler) kích hoạt Edge Function mỗi 5 phút.
2.  **Fetch:** Edge Function lấy danh sách tài khoản Active từ Database.
3.  **Facebook API:** Edge Function gọi Facebook API lấy dữ liệu (Campaigns, AdSets, Ads, Insights) cho ngày hiện tại (`today`).
4.  **Transform:** Edge Function xử lý dữ liệu thô, tính toán `results`, `cost_per_result`, map `actions` (Logic này được port từ Frontend sang).
5.  **Upsert:** Edge Function ghi vào Database (NocoDB/Postgres) với cơ chế `Upsert` (Cập nhật nếu có, Tạo mới nếu chưa) dựa trên `insight_key`.
6.  **Realtime:** Database bắn sự kiện `UPDATE`/`INSERT` qua Supabase Realtime.
7.  **UI Update:** Frontend (`AdsReport.tsx`) lắng nghe sự kiện và cập nhật bảng số liệu.

### B. Cấu trúc Database (Chiến lược Cô lập)
*   **Bảng `FacebookInsights_Auto` (MỚI - Clone từ `FacebookInsights`):**
    *   Người dùng sẽ tạo bảng này (nhân bản từ bảng cũ).
    *   Dùng để lưu dữ liệu từ hệ thống tự động mới.
    *   Không ảnh hưởng đến bảng `FacebookInsights` hiện tại.
*   **Bảng `FacebookAdAccounts` (Dùng chung):**
    *   Dùng để đọc token và danh sách tài khoản (Read-only).

### Giai đoạn 3: Nâng cấp Frontend (Realtime UI)
- [ ] **Task 3.1: Tích hợp Supabase Realtime vào `AdsReport.tsx`**
    - Thêm hook `useEffect` để subscribe channel `postgres_changes`.
    - Lắng nghe sự kiện `UPDATE` và `INSERT` trên bảng `FacebookInsights`.
- [ ] **Task 3.2: Xử lý Update State**
    - Khi có sự kiện, tìm record tương ứng trong state `insights` hiện tại.
    - Nếu tìm thấy: Cập nhật các trường metrics (ghi đè).
    - Nếu không tìm thấy (và thuộc ngày đang xem): Thêm vào danh sách.
    - Đảm bảo không gây re-render toàn bộ bảng, chỉ update dữ liệu.

### Giai đoạn 4: Kiểm thử & Triển khai
- [ ] **Task 4.1: Test thủ công Edge Function**
    - Chạy thử function bằng lệnh `curl` hoặc từ Dashboard.
    - So sánh dữ liệu trong DB với dữ liệu trên Facebook Ads Manager.
- [ ] **Task 4.2: Test Realtime**
    - Mở UI, chạy function thủ công, quan sát số liệu nhảy trên màn hình.
- [ ] **Task 4.3: Test Cron Job**
    - Để hệ thống chạy tự động trong 1 giờ, kiểm tra log và dữ liệu.

## 4. Logic Mapping (Tham chiếu quan trọng)

Để đảm bảo tính nhất quán, Backend MẮT BUỘC phải tuân theo logic mapping sau (đang dùng ở Frontend):

| Metric Frontend | Nguồn dữ liệu Facebook API (Action Type) | Ghi chú |
| :--- | :--- | :--- |
| **Results** | `onsite_conversion.messaging_conversation_started_7d` | Ưu tiên số 1 |
| **Cost per Result** | `spend` / `results` (hoặc từ `cost_per_action_type`) | |
| **Messaging Replied** | `onsite_conversion.messaging_conversation_replied_7d` | |
| **Started 7d** | `onsite_conversion.messaging_conversation_started_7d` | |
| **Total Connection** | `onsite_conversion.total_messaging_connection` | |
| **Link Click** | `link_click` | |
| **First Reply** | `onsite_conversion.messaging_first_reply` | |

---
*Kế hoạch này được thiết kế để thực hiện từng bước, đảm bảo hệ thống cũ vẫn hoạt động trong khi hệ thống mới được xây dựng song song.*
