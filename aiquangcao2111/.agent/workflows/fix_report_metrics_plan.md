# Kế hoạch Chuẩn hóa Dữ liệu và Logic Báo cáo Tự động

## 1. Mục tiêu
Khắc phục tình trạng báo cáo trả về toàn số 0 và đảm bảo logic tính toán chính xác, đồng bộ giữa Backend (Báo cáo tự động) và Frontend (Báo cáo tổng).

## 2. Phân tích Nguyên nhân (Tại sao lại là số 0?)
Có 3 khả năng chính dẫn đến việc kết quả trả về là 0:
1.  **Sai tên cột (Column Mapping):** Backend đang gọi `spend` nhưng trong Database có thể là `Spend`, `amount_spent`, hoặc `chi_tieu`. NocoDB/SQL thường phân biệt hoa thường.
2.  **Không có dữ liệu "Hôm nay":** Báo cáo đang lọc theo ngày hiện tại (`Today`). Nếu Cron Job đồng bộ dữ liệu (`sync-ads-cron`) chưa chạy hôm nay, hoặc Facebook chưa trả về dữ liệu của ngày nay, thì kết quả sẽ rỗng.
3.  **Sai kiểu dữ liệu:** Dữ liệu trong DB là dạng String ("100000") nhưng code đang cộng trực tiếp mà không ép kiểu đúng, hoặc ngược lại.

## 3. Kế hoạch Thực hiện

### Bước 1: Kiểm tra Cấu trúc Dữ liệu Thực tế (Audit Schema)
- **Hành động:** Thêm Log debug vào hàm `process-scheduled-reports` để in ra cấu trúc JSON thô của bản ghi đầu tiên tìm thấy.
- **Mục đích:** Xác định chính xác tên cột (ví dụ: `spend` hay `Spend`) và kiểu dữ liệu.

### Bước 2: Đối chiếu với Quy trình Đồng bộ (Sync Process)
- **Hành động:** Kiểm tra file `supabase/functions/sync-ads-cron/index.ts`.
- **Mục đích:** Xem chính xác code đồng bộ đang ghi dữ liệu vào những cột nào. Đây là "nguồn sự thật" (Source of Truth).

### Bước 3: Chuẩn hóa Logic Tính toán (Standardization)
- **Hành động:**
    - Tạo một `interface` chuẩn cho dữ liệu Insights và Sales.
    - Cập nhật lại hàm `process-scheduled-reports` sử dụng đúng tên cột đã xác minh.
    - Đảm bảo ép kiểu số học (`Number()`) cho mọi trường tiền tệ/số lượng.
    - Xử lý giá trị `null` hoặc `undefined` (mặc định về 0).

### Bước 4: Kiểm thử (Testing)
- **Hành động:**
    - Chạy lại nút "Chạy thử".
    - So sánh kết quả với dữ liệu thô trong NocoDB.
    - Nếu "Hôm nay" chưa có dữ liệu, sẽ tạm thời hard-code ngày cũ (ví dụ: hôm qua) để verify công thức tính toán.

## 4. Sơ đồ Luồng Dữ liệu Chuẩn (Target Architecture)

```mermaid
graph LR
    FB_API[Facebook API] -->|Sync Cron| DB[(NocoDB)]
    DB -->|Raw Data| Report_Func[Process Report Function]
    
    subgraph "Logic Chuẩn hóa (Backend)"
        Report_Func -->|1. Fetch| Raw_JSON[Dữ liệu thô]
        Raw_JSON -->|2. Map & Cast| Clean_Data[Dữ liệu sạch (Number)]
        Clean_Data -->|3. Deduplicate| Unique_Data[Dữ liệu duy nhất]
        Unique_Data -->|4. Aggregate| Metrics[Chỉ số cuối cùng]
    end
    
    Metrics -->|Gửi| Notification
```
