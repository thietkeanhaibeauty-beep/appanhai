# Kế hoạch Triển khai Upload Ảnh lên Google Drive qua n8n

## Phân tích từ Workflow hiện có

Workflow `auto đăng bài mới` của bạn sử dụng pattern:
```json
{
  "documentId": {
    "__rl": true,
    "value": "19SPTt5d-ZGUpUTVeETBL7LS91YTr_QsD6WBGSkZ0YDw",  // Document/Folder ID
    "mode": "id"
  }
}
```

Với Google Drive, pattern tương tự sẽ là:
```json
{
  "driveId": {
    "__rl": true,
    "value": "1Ks3rQaivfY_ic2biTBJJlaKDPTwlr70D",  // Folder ID của bạn
    "mode": "id"
  }
}
```

---

## KẾ HOẠCH TRIỂN KHAI (3 Bước)

### BƯỚC 1: Tạo Workflow Upload trong n8n

Tạo workflow mới với các nodes sau:

```
[Webhook] → [Convert Base64 to Binary] → [Google Drive Upload] → [Respond to Webhook]
```

**Node 1: Webhook**
- HTTP Method: POST
- Path: `upload-image`
- Authentication: None (hoặc Header Auth nếu muốn bảo mật)

**Node 2: Code (Convert Base64 to Binary)**
```javascript
// Chuyển base64 thành file binary
const base64 = $input.first().json.imageBase64;
const fileName = $input.first().json.fileName || `image_${Date.now()}.png`;

// Loại bỏ prefix data:image/...
const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
const buffer = Buffer.from(base64Data, 'base64');

return {
  json: { fileName },
  binary: {
    data: {
      data: buffer.toString('base64'),
      mimeType: 'image/png',
      fileName: fileName
    }
  }
};
```

**Node 3: Google Drive (Upload)**
- Credential: Dùng cùng tài khoản `hocvienspaabc@gmail.com` hoặc tài khoản 2TB
- Operation: Upload
- File Name: `{{ $json.fileName }}`
- Parent Folder: 
  ```json
  {
    "__rl": true,
    "value": "1Ks3rQaivfY_ic2biTBJJlaKDPTwlr70D",
    "mode": "id"
  }
  ```
- Binary Property: `data`

**Node 4: Respond to Webhook**
- Response Body:
  ```json
  {
    "success": true,
    "fileId": "{{ $json.id }}",
    "webViewLink": "{{ $json.webViewLink }}",
    "directLink": "https://drive.google.com/uc?export=view&id={{ $json.id }}"
  }
  ```

---

### BƯỚC 2: Kết nối Google Drive OAuth2 trong n8n

1. Mở n8n → Settings → Credentials
2. Thêm credential mới: **Google Drive OAuth2 API**
3. Đăng nhập bằng tài khoản có Drive 2TB
4. Cho phép quyền truy cập Drive

---

### BƯỚC 3: Cập nhật App Server để gọi n8n Webhook

Trong file `server/features/storage/drive.service.js`, thay thế bằng:

```javascript
// Thay vì dùng Service Account, gọi n8n Webhook
const N8N_WEBHOOK_URL = 'https://your-n8n-domain/webhook/upload-image';

export async function uploadBase64Image(base64Data, type = 'designs') {
    if (!base64Data || base64Data.startsWith('http')) return base64Data;

    const fileName = `${type}_${Date.now()}.png`;

    const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            imageBase64: base64Data,
            fileName: fileName
        })
    });

    const result = await response.json();
    return result.directLink;  // URL ảnh trên Drive
}
```

---

## HÀNH ĐỘNG TIẾP THEO

**Bạn cần làm:**
1. Mở n8n
2. Tạo Workflow mới theo hướng dẫn BƯỚC 1
3. Thêm Google Drive credential (BƯỚC 2)
4. Test webhook
5. Gửi cho tôi URL webhook, tôi sẽ cập nhật code server

**Hoặc bạn export workflow JSON đã tạo, gửi cho tôi xem lại.**
