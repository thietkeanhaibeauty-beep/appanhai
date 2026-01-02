# Kế hoạch Triển khai Backend Modular (NocoDB + Google Drive)

Dựa trên yêu cầu của bạn về việc chia nhỏ module để dễ bảo trì (Maintainability), đây là lộ trình triển khai chi tiết:

## Trạng thái hiện tại
- Đã tạo bảng trên NocoDB.
- Đã có tài khoản Google Service Account (đang chờ thông tin Credential).
- Server hiện tại (`index.js`) đang viết tất cả trong một file (Monolith).

## Cấu trúc thư mục mới (Đề xuất)
Chúng ta sẽ refactor server theo cấu trúc hướng tính năng (Feature-based):

```
server/
  ├── config/             # Biến môi trường, configs
  ├── features/           # Các tính năng chính (Mỗi tính năng 1 thư mục)
  │   ├── storage/        # Quản lý lưu trữ
  │   │   ├── drive.service.js  # Logic Google Drive
  │   │   └── index.js          # Export chung
  │   ├── database/       # Quản lý Database
  │   │   ├── nocodb.service.js # Logic NocoDB
  │   │   └── index.js
  │   ├── templates/      # Feature Templates
  │   │   ├── template.controller.js  # Xử lý request/response
  │   │   ├── template.routes.js      # Định nghĩa API endpoints
  │   │   └── index.js
  │   └── designs/        # Feature Designs
  │       ├── design.controller.js
  │       ├── design.routes.js
  │       └── index.js
  └── index.js            # Main entry file (Gọn gàng)
```

## Các Task cần thực hiện

### 1. Setup Cấu trúc & Config
- [ ] Tạo cấu trúc thư mục `features/`.
- [ ] Tạo file `config/credentials.json` (Chờ bạn paste nội dung key vào).
- [ ] Tạo file `config/settings.js` chứa các hằng số (Folder ID, Project ID).

### 2. Module Storage (Lưu trữ)
- [ ] Implement `storage/drive.service.js`:
    - Hàm `uploadFile(file)`: Upload lên Drive.
    - Hàm `getFileLink(fileId)`: Lấy link xem ảnh.
    - Xử lý xác thực dùng file json.

### 3. Module Database (Dữ liệu)
- [ ] Cập nhật `database/nocodb.service.js`:
    - Chuyển logic kết nối từ `index.js` cũ sang đây.
    - Viết các hàm helper: `createTemplate`, `getTemplates`, `saveDesign`.

### 4. Refactor API (Chia nhỏ index.js)
- [ ] Tách API Templates sang `features/templates`.
- [ ] Tách API Designs sang `features/designs`.
- [ ] Tách API Categories sang `features/categories`.
- [ ] Cập nhật `index.js` để load các Routes này.

---

## BẮT ĐẦU NGAY BÂY GIỜ

Để bắt đầu **Task 1 (Setup Cấu trúc & Config)**, tôi cần bạn thực hiện hành động sau:

1.  **Tạo file credentials**:
    Tôi sẽ tạo một file rỗng tên là `server/config/google-drive-credentials.json`.
    -> **Bạn mở file đó lên và PASTE toàn bộ nội dung file JSON bạn tải từ Google về vào đó.**

2.  **Cung cấp Folder ID**:
    Gửi cho tôi folder ID để tôi ghi vào file settings.

Hãy xác nhận để tôi tiến hành tạo cấu trúc thư mục mới ngay!
