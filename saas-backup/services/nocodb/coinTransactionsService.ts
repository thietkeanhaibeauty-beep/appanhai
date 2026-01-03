/**
 * Coin Transactions Service - NocoDB
 * Lịch sử giao dịch coin
 */

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

const TABLE_ID = NOCODB_CONFIG.TABLES.COIN_TRANSACTIONS;

export type TransactionType = 'deposit' | 'spend' | 'refund';

export interface CoinTransaction {
    Id?: number;
    user_id: string;
    type: TransactionType;
    amount: number;
    description: string;
    reference_id?: string;
    created_at?: string;
}

/**
 * Tạo giao dịch mới
 */
export const createTransaction = async (
    userId: string,
    type: TransactionType,
    amount: number,
    description: string,
    referenceId?: string
): Promise<CoinTransaction | null> => {
    try {
        const headers = await getNocoDBHeaders();
        const response = await fetch(getNocoDBUrl(TABLE_ID), {
            method: 'POST',
            headers,
            body: JSON.stringify({
                user_id: userId,
                type,
                amount,
                description,
                reference_id: referenceId || '',
                created_at: new Date().toISOString(),
            }),
        });

        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error creating transaction:', error);
        return null;
    }
};

/**
 * Lấy lịch sử giao dịch của user
 */
export const getTransactionsByUserId = async (
    userId: string,
    limit: number = 50
): Promise<CoinTransaction[]> => {
    try {
        const headers = await getNocoDBHeaders();
        const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
        const response = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&sort=-created_at&limit=${limit}`,
            { headers }
        );

        if (!response.ok) return [];

        const data = await response.json();
        return data.list || [];
    } catch (error) {
        console.error('Error getting transactions:', error);
        return [];
    }
};

/**
 * Record deposit transaction
 */
export const recordDeposit = async (
    userId: string,
    amount: number,
    paymentId?: string
): Promise<CoinTransaction | null> => {
    return createTransaction(
        userId,
        'deposit',
        amount,
        `Nạp ${amount.toLocaleString()} coin`,
        paymentId
    );
};

/**
 * Record spend transaction
 */
export const recordSpend = async (
    userId: string,
    amount: number,
    feature: string,
    usageId?: string
): Promise<CoinTransaction | null> => {
    return createTransaction(
        userId,
        'spend',
        -amount, // Negative for spending
        `Sử dụng ${feature}: ${amount} coin`,
        usageId
    );
};
