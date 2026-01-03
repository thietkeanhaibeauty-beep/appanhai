# 🎯 Tổng Quan Chức Năng App - AIautoFB.com

## 🌐 LANDING PAGE (Trang công khai)

| Chức năng | Mô tả |
|-----------|-------|
| Hero Section | Headline + Video/Ảnh demo + 2 CTA buttons |
| Product Features | 9 cards giới thiệu tính năng |
| Sắp Ra Mắt | 3 cards tính năng upcoming |
| Footer | Thông tin công ty, links |

---

## 🔐 AUTH (Xác thực)

| Màn hình | Mô tả |
|----------|-------|
| Đăng nhập | Email + Password, link forgot password |
| Đăng ký | Email, Password, Confirm password |
| Quên mật khẩu | Nhập email → gửi link reset |
| Reset mật khẩu | Nhập mật khẩu mới |
| Xác nhận email | Thông báo đã gửi email xác nhận |
| Email đã xác nhận | Thông báo thành công |
| Chấp nhận lời mời | Join workspace từ invite link |
| Welcome | Màn hình chào mừng sau đăng ký |

---

## 📊 DASHBOARD USER (Bảng điều khiển chính)

### 1. Báo cáo Ads (AdsReportAuto)
- Bảng dữ liệu chiến dịch/nhóm QC/quảng cáo
- Lọc theo ngày, trạng thái, chiến dịch
- Metrics: Chi phí, Kết quả, CPR, CTR, Reach, Frequency
- Bật/Tắt campaign trực tiếp
- Gắn nhãn (Labels) cho chiến dịch
- Tùy chỉnh cột hiển thị
- Export Excel

### 2. Quy tắc Tự động (AutomatedRules)
- Tạo rule: IF [điều kiện] THEN [hành động]
- Điều kiện: CPA > X, CPM > Y, Spend > Z...
- Hành động: Tắt QC, Giảm budget, Tăng budget, Thông báo
- Lịch chạy: Mỗi giờ, mỗi ngày, real-time

### 3. Báo cáo Sale (SalesReport)
- Nhập SĐT khách hàng
- Liên kết campaign/adset → SĐT
- Trạng thái: Chưa liên hệ → Đã đặt lịch → Đã đến → Đã chốt
- Doanh thu dịch vụ
- Tỉ lệ chuyển đổi

### 4. Báo cáo Tổng hợp (SummaryReport)
- Tổng quan: Spend, Results, Revenue
- Biểu đồ xu hướng
- Top campaigns

### 5. Drafts (Nháp quảng cáo)
- Danh sách chiến dịch nháp
- Preview trước khi publish
- AI tạo nội dung

### 6. Tạo Quảng cáo Nhanh (CreateQuickAd)
- Chọn bài viết có sẵn
- AI gợi ý nội dung
- 1-click publish

### 7. Cài đặt Thông báo (NotificationSettings)
- Kết nối Zalo
- Chọn nhóm nhận thông báo
- Lịch gửi báo cáo hàng ngày

### 8. Cài đặt Workspace (WorkspaceSettings)
- Đổi tên workspace
- Mời thành viên
- Phân quyền

---

## 💳 THANH TOÁN (Dashboard/*)

| Màn hình | Mô tả |
|----------|-------|
| Packages | Danh sách gói dịch vụ |
| Payment | Thanh toán (QR code, chuyển khoản) |
| Subscription | Gói hiện tại, token còn lại |
| Billing | Lịch sử thanh toán |
| Usage | Thống kê sử dụng token |

---

## 👑 SUPERADMIN (Quản trị hệ thống)

| Chức năng | Mô tả |
|-----------|-------|
| Dashboard | Tổng quan hệ thống |
| Users Management | Quản lý user, khóa/mở tài khoản |
| Subscriptions | Quản lý gói subscription user |
| Feature Management | Bật/tắt tính năng theo gói |
| Payment Packages | Tạo/sửa/xóa gói dịch vụ |
| Payment Settings | Cấu hình QR, tài khoản ngân hàng |
| Cron Management | Quản lý jobs tự động (sync, report) |
| AI Keywords | Quản lý từ khóa AI nhận diện |
| AI Features | Bật/tắt tính năng AI |
| Global API Settings | Cấu hình API keys (OpenAI, Facebook) |
| Data Management | Import/Export dữ liệu |
| System Monitoring | Logs, errors, performance |
| Token Usage History | Lịch sử tiêu thụ token |

---

## 🎨 COMPONENTS CHÍNH CHO DESIGN

### Navigation
- Top navbar với logo, menu, user dropdown
- Sidebar (Dashboard): Home, Ads Report, Rules, Sales, Settings...

### Cards
- Metric cards (số liệu tổng quan)
- Feature cards (landing page)
- Package cards (bảng giá)

### Tables
- Data table với sort, filter, pagination
- Inline editing (bật/tắt toggle)
- Row actions (Edit, Delete)

### Forms
- Input, Select, Checkbox, Switch
- Date picker, Date range picker
- File upload (ảnh, video)

### Modals/Dialogs
- Xác nhận hành động
- Form tạo/sửa
- Preview

### Charts
- Line chart (xu hướng)
- Bar chart (so sánh)
- Pie chart (tỉ lệ)

---

## 📱 RESPONSIVE

- Desktop: Full layout với sidebar
- Tablet: Collapsed sidebar
- Mobile: Bottom navigation hoặc hamburger menu

---

## 🎨 BRAND COLORS

| Màu | Hex | Sử dụng |
|-----|-----|---------|
| Primary Pink | #E91E8C | CTA buttons, highlights |
| Dark | #1F2937 | Text, headers |
| Gray | #6B7280 | Secondary text |
| Success | #10B981 | Active states |
| Warning | #F59E0B | Alerts |
| Error | #EF4444 | Errors |

---

*Cập nhật: 23/12/2024*
