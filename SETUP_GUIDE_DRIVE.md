# Hướng dẫn Cấu hình Google Drive (Từng bước)

Dựa vào hình ảnh bạn gửi (Giao diện tiếng Pháp), hãy làm chính xác theo các bước sau:

## BƯỚC 1: Tạo Tài khoản Dịch vụ (Service Account)

1.  Nhìn sang menu bên trái, bấm vào mục **Identifiants** (Thông tin xác thực).
2.  Ở thanh trên cùng, bấm nút **+ CRÉER DES IDENTIFIANTS** (+ Create Credentials).
3.  Trong danh sách hiện ra, chọn **Compte de service** (Account Service / Service Account).
4.  **Điền thông tin**:
    *   **Nom du compte de service**: Đặt tên gì cũng được (ví dụ: `app-upload`).
    *   Bấm **CRÉER ET CONTINUER** (Create and Continue).
5.  **Cấp quyền (Quan trọng)**:
    *   Ở mục "Sélectionnez un rôle" (Select a role), chọn **Basic** -> **Editor** (Éditeur).
    *   *Lý do: Để "chìa khóa" này có quyền chỉnh sửa file.*
    *   Bấm **CONTINUER** (Continue) -> Rồi bấm **OK** (Done).

## BƯỚC 2: Lấy Chìa khóa (File JSON)

1.  Sau khi tạo xong, bạn sẽ thấy tên tài khoản `app-upload...@...` hiện trong danh sách "Comptes de service" ở dưới cùng trang Identifiants.
2.  **Bấm vào cái email đó** để mở chi tiết.
3.  Nhìn lên menu ngang phía trên, bấm vào tab **CLÉS** (Keys).
4.  Bấm nút **AJOUTER UNE CLÉ** (Add Key) -> Chọn **Créer une clé** (Create new key).
5.  Chọn định dạng **JSON**.
6.  Bấm **CRÉER** (Create).
7.  Máy tính sẽ tự động tải xuống 1 file `.json`. **Đây chính là chìa khóa.**
    *   *Hãy mở file này bằng Notepad, copy toàn bộ nội dung gửi cho tôi.*
    *   *Hoặc tìm dòng `client_email` trong file đó, nó có dạng `app-upload@...iam.gserviceaccount.com`. Hãy copy email này.*

## BƯỚC 3: Tạo Kho trên Drive của bạn (Tài khoản 2TB)

1.  Mở trình duyệt tab mới, vào **Google Drive** của bạn (Tài khoản 2TB).
2.  Bấm **Mới (New)** -> **Thư mục mới (New Folder)**. Đặt tên là `App_Images` (hoặc tên tùy ý).
3.  Bấm chuột phải vào thư mục vừa tạo -> Chọn **Chia sẻ (Share)**.
4.  Tại ô "Thêm người và nhóm" (Add people): **Dán địa chỉ email bạn vừa copy ở Bước 2 vào đây**.
    *(Email có đuôi `...iam.gserviceaccount.com`)*
5.  Nhìn bên cạnh, đảm bảo quyền là **Người chỉnh sửa (Editor)**.
6.  Bấm **Gửi (Send)** (Hoặc Chia sẻ).

## BƯỚC 4: Lấy ID Thư mục (Folder ID)

1.  Mở (Double click) vào thư mục `App_Images` đó.
2.  Nhìn lên thanh địa chỉ trang web (URL). Nó sẽ có dạng như sau:
    `https://drive.google.com/drive/folders/1A2B3C4D5E6F7G8H9I0J`
3.  Copy đoạn mã loằng ngoằng phía sau chữ `folders/`.
    *   Ví dụ ID là: `1A2B3C4D5E6F7G8H9I0J`
    *   **Gửi mã này cho tôi.**

---

**TỔNG KẾT:**
Sau khi làm xong, bạn hãy gửi cho tôi 2 thứ:
1.  **Nội dung toàn bộ file JSON** (hoặc đính kèm file).
2.  **Folder ID** (Mã thư mục).

Tôi sẽ cài đặt nó vào Code server là xong!
