---
description: Kế hoạch triển khai Smart Merge v2 - Hỗ trợ Quảng cáo Tin nhắn Bài viết Mới (Override Content & Media)
---

# Kế hoạch triển khai: Smart Merge v2 - Quảng cáo Tin nhắn Bài viết Mới

## Mục tiêu
Nâng cấp hệ thống AI để hỗ trợ quy trình "Tạo nhanh" quảng cáo tin nhắn với bài viết mới, kết hợp thông minh giữa:
1.  **Dữ liệu nhập tay (User Input):** Nội dung bài viết (body text), hình ảnh/video đính kèm, hoặc các override về target (ngân sách, tuổi...).
2.  **Dữ liệu mẫu (Template):** Cấu hình hội thoại (Câu chào, Câu hỏi thường gặp), Tiêu đề (nếu user không viết), và Target mặc định.

## 1. Phân tích Luồng Dữ liệu (Data Flow)

### Đầu vào (Input) từ User
User gửi một tin nhắn dạng:
```text
@#ten_template
[Nội dung bài viết quảng cáo...]
[Có thể có override: 500k, 25-35t...]
[Đính kèm Ảnh/Video]
```

### Xử lý (Processing)
1.  **Phát hiện Template:** Nhận diện `@#ten_template`.
2.  **Phát hiện Intent (Override):**
    *   Targeting: Ngân sách, Tuổi, Giới tính, Vị trí (Đã có ✅).
    *   **Content (Đính kèm):** Phát hiện có ảnh/video upload (Frontend gửi flag).
    *   **Content (Text):** Phân tách đâu là nội dung quảng cáo vs. metadata.
3.  **Merge Logic (Quy tắc Ưu tiên):**
    *   **Targeting:** User Override > Template > AI Default.
    *   **Nội dung chính (Body):** User Input > Template (Headline).
    *   **Hội thoại (Greeting/Questions):** Template > User Input (trừ khi User ghi rõ "Mẫu chào: ...").
    *   **Media:** User Upload.

### Đầu ra (Output)
JSON cấu hình hoàn chỉnh để tạo chiến dịch, bao gồm cả Target đã merge và Nội dung + Cấu hình hội thoại từ Template.

## 2. Chi tiết 2 Phương án (Kịch bản Sử dụng)

Hệ thống sẽ hỗ trợ cả 2 phương án như một tính năng thống nhất.

### Phương án 1: Cơ bản (Template + Nội dung mới)
**Input:**
```
@#spa_hanoi
Giảm giá 50% tất cả dịch vụ tắm trắng...
(Kèm ảnh)
```
**Xử lý:**
*   **Target:** Lấy toàn bộ từ template `@#spa_hanoi` (Tuổi, Vị trí, Ngân sách...).
*   **Content:** Dùng nội dung text user vừa nhập.
*   **Media:** Dùng ảnh user vừa gửi.
*   **Message Config:** Tự động lấy "Câu chào" và "Câu hỏi thường gặp" từ template `@#spa_hanoi`.

### Phương án 2: Nâng cao (Template + Nội dung mới + Override Target)
**Input:**
```
@#spa_hanoi
300k
Nam
Giảm giá 50% cho liệu trình trị mụn nam giới...
(Kèm ảnh)
```
**Xử lý:**
*   **Target:**
    *   Ngân sách: `300k` (Override template).
    *   Giới tính: `Nam` (Override template).
    *   Các field khác (Vị trí, Tuổi...): Giữ nguyên từ template `@#spa_hanoi`.
*   **Content & Media:** Lấy từ user input.
*   **Message Config:** Vẫn lấy từ template `@#spa_hanoi`.

## 3. Các bước triển khai kỹ thuật

### Bước 1: Cập nhật Frontend (Chat Interface)
*   **Nhiệm vụ:** Đảm bảo khi user upload ảnh/video, thông tin này được đính kèm vào context gửi lên AI (hoặc được xử lý để tạo ad, AI chỉ cần biết là "có media").
*   **Lưu ý:** AI hiện tại nhận `text`. Nếu có ảnh, Frontend cần đảm bảo flow tạo ad cuối cùng sẽ dùng ảnh đó.

### Bước 2: Tinh chỉnh Backend (Smart Merge Logic)
Hiện tại logic `parse-campaign-with-user-api` đã khá tốt, nhưng cần tinh chỉnh đoạn xử lý Content khi **KHÔNG có Link (`!hasLink`)**:

**Logic hiện tại:**
```typescript
if (!hasLink) {
    // Apply Greeting/Questions from template
    // Apply Headline from template IF AI didn't find one
}
```

**Cần cập nhật để chắc chắn:**
1.  **Content Separation:** Đảm bảo text user nhập được coi là `adContent`.
2.  **Headline Strategy:**
    *   Nếu user nhập dòng đầu tiên ngắn -> Có thể coi là Headline.
    *   Nếu không rõ ràng -> Ưu tiên lấy Headline từ Template (nếu có) để bài viết chuẩn form.
3.  **Strict Greeting/Questions:** Luôn ưu tiên Greeting/Questions từ Template trừ khi user dùng cú pháp đặc biệt để override (VD: "Mẫu chào: ...").

### Bước 3: Kiểm thử
1.  Test case 1: Chỉ template + Text (Check xem có ra Greeting của template không).
2.  Test case 2: Template + Text + Override Budget (Check override).
3.  Test case 3: Template có Headline + User nhập Text (Check xem Headline lấy ở đâu hợp lý).

## 4. Thời gian dự kiến
*   **Backend Logic:** 15-30 phút (Tinh chỉnh nhỏ).
*   **Frontend Integration:** Đã có nền tảng, chủ yếu review flow upload ảnh.
*   **Tổng cộng:** ~45-60 phút.

// turbo
