# Phương án Backup & Chuyển đổi Tài khoản (Google Drive API)

Bạn đang lo lắng về việc sử dụng tài khoản Google Cloud Free Trial (90 ngày) và muốn chuyển đổi dễ dàng sau khi hết hạn.

**Tin vui:** Nếu sử dụng phương án **Google Drive API** như tôi đề xuất, vấn đề này giải quyết **CỰC KỲ ĐƠN GIẢN**.

## Tại sao đơn giản?

Mô hình hoạt động như sau:
1.  **Dữ liệu (Ảnh)**: Nằm trong **Thư mục Google Drive cá nhân** của bạn (Tài khoản chính 2TB).
2.  **Chìa khóa (Service Account)**: Được tạo ra từ **Google Cloud Project** (Tài khoản 90 ngày).

Cơ chế: Bạn "Share" thư mục của Tài khoản chính cho "Chìa khóa" của Tài khoản 90 ngày để nó có quyền ghi file vào đó.

## Kịch bản: Khi hết hạn 90 ngày
Khi tài khoản Cloud 90 ngày hết hạn, Project bị khóa -> "Chìa khóa" cũ bị vô hiệu hóa. **Nhưng Dữ liệu ảnh trong Drive chính của bạn vẫn còn nguyên**, không bị mất đi đâu cả.

### Quy trình chuyển đổi (Chỉ mất 5 phút):

1.  **Tạo Tài khoản Cloud Mới** (đăng ký cái mới).
2.  **Tạo Service Account Mới**: Lấy file `credentials.json` mới.
3.  **Cấp quyền lại**:
    - Vào Drive chính (Tài khoản 2TB).
    - Chuột phải vào thư mục ảnh -> Share.
    - Nhập email của **Service Account Mới** -> Chọn quyền Editor.
    - (Tùy chọn) Xóa quyền của Service Account cũ đi.
4.  **Cập nhật Code**:
    - Thay file `credentials.json` trên Server bằng file mới.
    - Khởi động lại Server.

**-> XONG. Toàn bộ ảnh cũ vẫn hiển thị bình thường, ảnh mới sẽ tiếp tục được lưu vào thư mục đó.**

---

## So sánh với Google Cloud Storage (Bucket)
Nếu bạn dùng GCS (Bucket), dữ liệu nằm *bên trong* tài khoản 90 ngày. Khi hết hạn, bạn phải **di chuyển dữ liệu** (copy sang bucket mới) rất mệt mỏi.

-> **Kết luận**: Dùng **Google Drive API** là phương án an toàn và linh hoạt nhất cho trường hợp bạn muốn tận dụng các tài khoản Free Trial để chạy API, trong khi vẫn sở hữu dữ liệu ở tài khoản chính.
