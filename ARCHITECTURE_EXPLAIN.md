# Giải thích Kiến trúc: Google Drive vs Google Cloud

Để làm rõ sự nhầm lẫn của bạn, tôi xin giải thích bằng hình ảnh **"Cái Kho và Chìa Khóa"**.

## 1. Phân định vai trò
Trong giải pháp tôi đề xuất, chúng ta **KHÔNG** dùng Google Cloud để lưu trữ (Bucket). Chúng ta dùng mô hình sau:

*   **Google Drive (Tài khoản 2TB của bạn)** = **CÁI KHO (Storage)**
    *   Đây là nơi chứa ảnh **VĨNH VIỄN**.
    *   Nó thuộc sở hữu của bạn.
    *   Dù tài khoản Cloud kia có bị xóa, cái kho này vẫn còn nguyên.

*   **Google Cloud (Tài khoản 90 ngày)** = **CHÌA KHÓA (API Key)**
    *   Để phần mềm (Code) có thể tự động upload ảnh vào Drive, nó cần một "Chìa khóa kỹ thuật số" gọi là **Service Account**.
    *   Google Cloud là nơi cấp cái chìa khóa này.

## 2. Quy trình hoạt động (Không có trung gian)
**KHÔNG CÓ** chuyện "lưu tạm ở Cloud rồi 1-2 ngày mới về Drive".
Quy trình là **Lưu Trực Tiếp**:

`App Web` -> `Dùng Chìa Khóa (Cloud API)` -> `Ghi thẳng vào Kho (Drive)`

## 3. Chuyện gì xảy ra khi hết hạn 90 ngày?
Khi tài khoản Google Cloud hết hạn (hoặc hết tiền):
*   **Hậu quả**: Cái "Chìa khóa" cũ bị hỏng (Google thu hồi). App không upload được nữa.
*   **Dữ liệu**: **AN TOÀN TUYỆT ĐỐI**. Ảnh nằm trong Drive của bạn nên không ảnh hưởng gì.

**Giải pháp chuyển đổi**:
1.  Đăng ký tài khoản Cloud mới -> Lấy **Chìa khóa mới**.
2.  Vào Drive -> Cho phép Chìa khóa mới được mở Kho (Share folder).
3.  Cập nhật Chìa khóa mới vào Code.
-> Hệ thống chạy tiếp.

## Tổng kết
*   **Nơi lưu trữ**: Duy nhất tại **Google Drive**.
*   **Google Cloud**: Chỉ dùng để lấy quyền truy cập (API) cho code chạy.
*   **Tốc độ**: Lưu trên Drive sẽ chậm hơn Cloud chuyên dụng (GCS/Cloudinary) một chút, nhưng với nhu cầu của bạn thì hoàn toàn ổn và tiết kiệm chi phí nhất.
