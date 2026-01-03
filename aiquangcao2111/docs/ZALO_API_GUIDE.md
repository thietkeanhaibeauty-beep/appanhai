# Zalo API Integration Guide

> **Cập nhật:** 2025-12-31 | **Trạng thái:** ✅ Hoạt động

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

### 2. GET /api/accounts/:ownId
Lấy chi tiết account với `profile.displayName`.

### 3. POST /api/findUserByAccount
```json
{
  "phone": "0965388977",
  "accountSelection": "0776443888"
}
```
→ Trả về `userId`, `displayName`, `isFriend`

### 4. POST /api/acceptFriendRequestByAccount
```json
{
  "userId": "4609101985300616219",
  "accountSelection": "0776443888"
}
```
→ Chấp nhận lời mời kết bạn

### 5. POST /api/sendFriendRequestByAccount
```json
{
  "userId": "...",
  "message": "Xin chào!",
  "accountSelection": "0776443888"
}
```

### 6. POST /api/sendMessageByAccount
```json
{
  "message": "Nội dung",
  "threadId": "userId",
  "accountSelection": "0776443888"
}
```

---

## 🔄 Luồng Kiểm Tra Kết Nối

```
1. findUserByAccount(phone) → userId
2. isFriend? → success
3. acceptFriendRequestByAccount(userId)
   → success: "Đồng ý thành công"
   → error "Tự động kết bạn": "Đã là bạn"
   → error "Không có lời mời": "Cần gửi lời mời"
```

---

## 🔧 Lưu Ý Quan Trọng

### accountSelection
Có thể dùng:
- `ownId`: "56978118379378471"
- `phoneNumber`: "0776443888" hoặc "+84776443888"

### Phone Format
Backend tự normalize: `0xxx`, `+84xxx`, `84xxx` đều match.

---

## 📁 Files Chính

| File | Mô tả |
|------|-------|
| `AdminZaloFriendSection.tsx` | UI kiểm tra kết nối |
| `ZaloAdminSettings.tsx` | QR Login |
| `zaloApiClient.ts` | API Client |
| `zalo-proxy/index.ts` | Supabase Proxy |
| `zalo.js` (VPS) | Backend handlers |
| `authService.js` (VPS) | Public routes |

---

## 🚀 Deploy VPS

```bash
scp zalo_server/api/zalo/zalo.js root@103.118.28.213:/root/zalo-backend/src/api/zalo/zalo.js
ssh root@103.118.28.213 "cd /root/zalo-backend && docker compose build --no-cache && docker compose up -d"
```
