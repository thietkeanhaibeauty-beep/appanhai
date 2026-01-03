# Zalo API Integration Guide

> **Cập nhật:** 2025-12-31 | **Trạng thái:** ✅ Hoạt động

---

## 🔌 API Endpoints

### Base URL
- **VPS:** `https://zaloapi.hpb.edu.vn`
- **Local:** `http://localhost:3000`

### Authentication
```
Header: X-API-Key: zalo_33752f0e1b1057e2f1cd837d04e704e49ac6693d675e467c657701a0e67e38c5
```

---

## 📋 API Reference

### 1. GET /api/accounts
Lấy danh sách tài khoản đã đăng nhập.

**Response:**
```json
{
  "success": true,
  "data": [{ "ownId": "56978118379378471", "phoneNumber": "+84776443888", "displayName": "...", "isOnline": true }]
}
```

### 2. GET /api/accounts/:ownId
Lấy chi tiết account với `profile.displayName`.

**Response:**
```json
{
  "success": true,
  "data": {
    "ownId": "...",
    "phoneNumber": "...",
    "profile": { "displayName": "Nguyễn Anh Tuấn Office", "avatar": "https://..." }
  }
}
```

### 3. POST /api/findUserByAccount
Tìm user Zalo bằng SĐT.

**Request:**
```json
{ "phone": "0965388977", "accountSelection": "0776443888" }
```

**Response:**
```json
{
  "success": true,
  "data": { "uid": "4609101985300616219", "zaloName": "Nguyễn Luật", "isFriend": false },
  "usedAccount": { "ownId": "...", "phoneNumber": "..." }
}
```

### 4. POST /api/acceptFriendRequestByAccount
Chấp nhận lời mời kết bạn.

**Request:**
```json
{ "userId": "4609101985300616219", "accountSelection": "0776443888" }
```

**Response:**
```json
{ "success": true, "data": "", "usedAccount": {...} }
```

### 5. POST /api/sendFriendRequestByAccount
Gửi lời mời kết bạn.

**Request:**
```json
{ "userId": "...", "message": "Xin chào!", "accountSelection": "0776443888" }
```

### 6. POST /api/sendMessageByAccount
Gửi tin nhắn.

**Request:**
```json
{ "message": "Nội dung", "threadId": "userId", "accountSelection": "0776443888" }
```

### 7. POST /api/getUserInfoByAccount
Lấy thông tin user (bao gồm trạng thái kết bạn).

**Request:**
```json
{ "userId": "...", "accountSelection": "0776443888" }
```

### 8. POST /api/getAllFriendsByAccount
Lấy danh sách bạn bè.

**Request:**
```json
{ "accountSelection": "0776443888" }
```

---

## 🔄 Luồng Kiểm Tra Kết Nối

```
User nhập SĐT → Kiểm tra kết nối
       ↓
1. findUserByAccount(phone) → userId, isFriend
       ↓
2. isFriend = true? → ✅ "Đã là bạn bè"
       ↓
3. acceptFriendRequestByAccount(userId)
       ↓
   success: true     → ✅ "Đồng ý thành công"
   error: "Tự động"  → ✅ "Đã là bạn bè"
   error: "Không có" → ⚠️ "Cần gửi lời mời"
```

---

## 🔧 Lưu Ý Quan Trọng

### accountSelection
Hỗ trợ nhiều format:
- `ownId`: `"56978118379378471"`
- `phoneNumber`: `"0776443888"`, `"+84776443888"`, `"84776443888"`

### Phone Normalization
Backend tự động normalize các format phone khác nhau để match.

---

## 📁 Files Quan Trọng

| File | Mô tả |
|------|-------|
| `src/features/admin-zalo/components/AdminZaloFriendSection.tsx` | UI kiểm tra kết nối |
| `src/pages/SuperAdmin/ZaloAdminSettings.tsx` | QR Login, lưu NocoDB |
| `src/services/zaloApiClient.ts` | Client gọi API qua Supabase Proxy |
| `supabase/functions/zalo-proxy/index.ts` | Supabase Edge Function |
| `zalo_server/api/zalo/zalo.js` | Backend handlers (VPS) |
| `zalo_server/services/authService.js` | Public routes (VPS) |
| `zalo_server/routes/api.js` | Route definitions (VPS) |

---

## 🚀 Deploy Lên VPS

```bash
# Upload files
scp zalo_server/api/zalo/zalo.js root@103.118.28.213:/root/zalo-backend/src/api/zalo/zalo.js
scp zalo_server/services/authService.js root@103.118.28.213:/root/zalo-backend/src/services/authService.js
scp zalo_server/routes/api.js root@103.118.28.213:/root/zalo-backend/src/routes/api.js

# Rebuild Docker
ssh root@103.118.28.213 "cd /root/zalo-backend && docker compose build --no-cache && docker compose up -d"

# Xem logs
ssh root@103.118.28.213 "docker logs zalo-backend-zalo-server-1 --tail 50"
```

---

## ✅ Fixes Đã Áp Dụng (2025-12-31)

| Vấn đề | Giải pháp |
|--------|-----------|
| Display name hiển thị ownId | Gọi `/api/accounts/:ownId` để lấy `profile.displayName` |
| Phone format mismatch | Normalize phone trong `getAccountFromSelection` |
| API bị chặn auth | Thêm `*ByAccount` APIs vào `publicRoutes` |
