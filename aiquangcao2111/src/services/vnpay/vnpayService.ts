/**
 * VNPAY Service - Client-side helpers for payment URL and verification
 * 
 * Note: Actual payment creation and verification should happen on backend (Edge Functions)
 * to keep vnp_HashSecret secure. This file provides types and helper functions.
 */

// VNPAY Configuration - These should come from environment/backend
export interface VnpayConfig {
    vnp_TmnCode: string;      // Website ID at VNPAY
    vnp_HashSecret: string;   // Secret key for checksum
    vnp_Url: string;          // VNPAY payment gateway URL
    vnp_ReturnUrl: string;    // URL to redirect after payment
    vnp_IpnUrl?: string;      // Webhook URL for payment notification
}

// VNPAY transaction response codes
export const VNPAY_RESPONSE_CODES: Record<string, string> = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
    '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
    '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
    '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
    '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
    '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
    '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
    '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì.',
    '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.',
    '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)',
};

// Bank codes supported by VNPAY
export const VNPAY_BANK_CODES: Record<string, string> = {
    'VNPAYQR': 'VNPAYQR',
    'VNBANK': 'Thẻ ATM - Tài khoản ngân hàng nội địa',
    'INTCARD': 'Thẻ thanh toán quốc tế',
};

export interface CreatePaymentRequest {
    orderId: string;
    amount: number;
    orderInfo: string;
    bankCode?: string;
    locale?: 'vn' | 'en';
}

export interface VnpayReturnParams {
    vnp_Amount: string;
    vnp_BankCode: string;
    vnp_BankTranNo?: string;
    vnp_CardType?: string;
    vnp_OrderInfo: string;
    vnp_PayDate: string;
    vnp_ResponseCode: string;
    vnp_TmnCode: string;
    vnp_TransactionNo: string;
    vnp_TransactionStatus: string;
    vnp_TxnRef: string;
    vnp_SecureHash: string;
}

/**
 * Parse VNPAY return URL params
 */
export const parseVnpayReturn = (searchParams: URLSearchParams): VnpayReturnParams => {
    return {
        vnp_Amount: searchParams.get('vnp_Amount') || '',
        vnp_BankCode: searchParams.get('vnp_BankCode') || '',
        vnp_BankTranNo: searchParams.get('vnp_BankTranNo') || undefined,
        vnp_CardType: searchParams.get('vnp_CardType') || undefined,
        vnp_OrderInfo: searchParams.get('vnp_OrderInfo') || '',
        vnp_PayDate: searchParams.get('vnp_PayDate') || '',
        vnp_ResponseCode: searchParams.get('vnp_ResponseCode') || '',
        vnp_TmnCode: searchParams.get('vnp_TmnCode') || '',
        vnp_TransactionNo: searchParams.get('vnp_TransactionNo') || '',
        vnp_TransactionStatus: searchParams.get('vnp_TransactionStatus') || '',
        vnp_TxnRef: searchParams.get('vnp_TxnRef') || '',
        vnp_SecureHash: searchParams.get('vnp_SecureHash') || '',
    };
};

/**
 * Check if payment was successful based on response code
 */
export const isPaymentSuccess = (responseCode: string): boolean => {
    return responseCode === '00';
};

/**
 * Get human-readable message for response code
 */
export const getResponseMessage = (responseCode: string): string => {
    return VNPAY_RESPONSE_CODES[responseCode] || 'Lỗi không xác định';
};

/**
 * Format amount for display (VNPAY uses amount * 100)
 */
export const formatVnpayAmount = (vnpAmount: string): number => {
    const amount = parseInt(vnpAmount, 10);
    return isNaN(amount) ? 0 : amount / 100;
};
