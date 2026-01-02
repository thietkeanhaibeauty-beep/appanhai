# Kế hoạch Triển khai Lưu trữ Ảnh trên Google Drive

## Tình trạng hiện tại
- ✅ Đã có Service Account JSON (`sleepchill@gen-lang-client-0908411170.iam.gserviceaccount.com`)
- ✅ Đã có Folder ID (`1Ks3rQaivfY_ic2biTBJJlaKDPTwlr70D`)
- ❌ Lỗi: "Service Accounts do not have storage quota"

## Nguyên nhân lỗi
Service Account là một "robot" của Google Cloud - nó **KHÔNG có ổ đĩa Drive riêng**. 
Khi bạn share folder trong My Drive của bạn cho Service Account, nó có quyền đọc/ghi, 
nhưng **quota lưu trữ (dung lượng) vẫn tính vào tài khoản chủ folder**.

Vấn đề là: Google API từ chối upload vì phát hiện Service Account đang cố ghi vào 
"My Drive của người khác" - đây là hành vi bị chặn từ phía Google để bảo vệ người dùng.

---

## CÁC PHƯƠNG ÁN KHẢ THI

### PHƯƠNG ÁN A: Shared Drive (Team Drive) ⭐ Khuyến nghị nếu có Workspace
**Yêu cầu**: Tài khoản Google Workspace (Doanh nghiệp/Trường học)
**Ưu điểm**: Service Account upload trực tiếp, không giới hạn quota riêng
**Cách làm**:
1. Tạo Shared Drive mới (không phải folder trong My Drive)
2. Thêm Service Account làm thành viên (Content Manager)
3. Lấy Shared Drive ID và cấu hình vào code

**Kiểm tra**: Mở Google Drive → Menu trái → Xem có mục "Shared drives" không?
- Nếu CÓ: Dùng phương án này
- Nếu KHÔNG: Tài khoản là Gmail cá nhân, không hỗ trợ Shared Drive

---

### PHƯƠNG ÁN B: Domain-Wide Delegation (Impersonation)
**Yêu cầu**: Quyền Admin của Google Workspace
**Ưu điểm**: Service Account "giả làm" bạn để upload
**Cách làm**:
1. Vào Admin Console (admin.google.com)
2. Security → API Controls → Domain Wide Delegation
3. Thêm Client ID của Service Account + scope Drive
4. Cập nhật code để impersonate user email

**Phức tạp**: Cần quyền Admin, cấu hình phức tạp hơn

---

### PHƯƠNG ÁN C: Upload qua Trung gian (n8n / Make / Zapier)
**Yêu cầu**: Tài khoản n8n (bạn đang dùng)
**Ưu điểm**: Dùng OAuth2 của n8n, không cần Service Account
**Cách làm**:
1. App gửi ảnh (base64) đến Webhook của n8n
2. n8n xử lý và upload lên Drive bằng node "Google Drive" (đã kết nối OAuth)
3. n8n trả về link ảnh cho App

**Sơ đồ**:
```
[App Web] → HTTP POST ảnh → [n8n Webhook] → [Google Drive Node] → [Drive Account 2TB]
                                    ↓
                           Trả về URL ảnh
```

---

### PHƯƠNG ÁN D: Cloudinary / Imgur / ImgBB
**Yêu cầu**: Đăng ký tài khoản miễn phí
**Ưu điểm**: Đơn giản nhất, không liên quan Google
**Nhược điểm**: Không tận dụng được 2TB Drive

---

## ĐỀ XUẤT CUỐI CÙNG

Dựa vào việc bạn đang dùng n8n, **PHƯƠNG ÁN C** là lựa chọn tối ưu nhất:

### Lý do:
1. Bạn đã có kinh nghiệm với n8n (dựa trên file JSON bạn đang mở)
2. n8n sử dụng OAuth2 - kết nối trực tiếp với Drive của bạn, không bị lỗi quota
3. Không cần Google Workspace hay quyền Admin
4. Tận dụng được toàn bộ 2TB dung lượng Drive

### Các bước triển khai:
1. **Tạo Webhook trong n8n** để nhận ảnh từ App
2. **Thêm node Google Drive** (đã OAuth với tài khoản 2TB)
3. **Cập nhật App** gửi ảnh đến Webhook thay vì gọi Drive API trực tiếp

---

## XÁC NHẬN TỪ BẠN

Vui lòng chọn:
- **A**: Tôi có Google Workspace và muốn tạo Shared Drive
- **B**: Tôi có quyền Admin Workspace, muốn dùng Delegation
- **C**: Tôi muốn dùng n8n làm trung gian (Khuyến nghị)
- **D**: Tôi muốn dùng Cloudinary cho đơn giản

Sau khi bạn chọn, tôi sẽ triển khai ngay!
