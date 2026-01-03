/**
 * Web2M Payment Service - Client-side helpers for bank transfer verification
 */

import { supabase } from '@/integrations/supabase/client';

export interface PaymentCheckResult {
    success: boolean;
    status: 'pending' | 'completed' | 'failed';
    message: string;
    transaction?: {
        id: string;
        amount: string;
        date: string;
    };
}

/**
 * Check payment status via Web2M
 */
export const checkPaymentStatus = async (orderId: string): Promise<PaymentCheckResult> => {
    try {
        const { data, error } = await supabase.functions.invoke('check-web2m-payment', {
            body: { orderId },
        });

        if (error) throw error;

        return data as PaymentCheckResult;
    } catch (error) {
        console.error('Error checking payment:', error);
        return {
            success: false,
            status: 'failed',
            message: error instanceof Error ? error.message : 'Failed to check payment',
        };
    }
};

/**
 * Generate VietQR URL for bank transfer
 * Using VietQR API: https://api.vietqr.io
 */
export const generateVietQRUrl = (
    bankId: string,
    accountNumber: string,
    accountName: string,
    amount: number,
    content: string
): string => {
    // VietQR format: https://img.vietqr.io/image/{bankId}-{accountNo}-{template}.png?amount={amount}&addInfo={content}&accountName={name}
    const encodedContent = encodeURIComponent(content);
    const encodedName = encodeURIComponent(accountName);

    return `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodedContent}&accountName=${encodedName}`;
};

/**
 * Bank codes for VietQR
 */
export const VIETQR_BANK_CODES: Record<string, { id: string; name: string; shortName: string }> = {
    vietcombank: { id: 'VCB', name: 'Vietcombank', shortName: 'VCB' },
    techcombank: { id: 'TCB', name: 'Techcombank', shortName: 'TCB' },
    mbbank: { id: 'MB', name: 'MB Bank', shortName: 'MB' },
    acb: { id: 'ACB', name: 'ACB', shortName: 'ACB' },
    tpbank: { id: 'TPB', name: 'TPBank', shortName: 'TPB' },
    vietinbank: { id: 'ICB', name: 'VietinBank', shortName: 'CTG' },
    agribank: { id: 'VBA', name: 'Agribank', shortName: 'AGR' },
    bidv: { id: 'BIDV', name: 'BIDV', shortName: 'BIDV' },
    sacombank: { id: 'STB', name: 'Sacombank', shortName: 'STB' },
    vpbank: { id: 'VPB', name: 'VPBank', shortName: 'VPB' },
};

/**
 * Format order ID for bank transfer content
 */
export const formatTransferContent = (orderId: string): string => {
    // Remove special characters and keep only alphanumeric
    return orderId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};
