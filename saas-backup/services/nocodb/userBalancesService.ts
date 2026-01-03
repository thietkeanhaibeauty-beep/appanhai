/**
 * User Balances Service - NocoDB
 * Quản lý số dư coin của user
 */

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

const TABLE_ID = NOCODB_CONFIG.TABLES.USER_BALANCES;

export interface UserBalance {
    Id?: number;
    user_id: string;
    balance: number;
    total_deposited: number;
    total_spent: number;
}

/**
 * Lấy balance của user
 */
export const getUserBalance = async (userId: string): Promise<UserBalance | null> => {
    try {
        const headers = await getNocoDBHeaders();
        const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
        const response = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!response.ok) return null;

        const data = await response.json();
        return data.list?.[0] || null;
    } catch (error) {
        console.error('Error getting user balance:', error);
        return null;
    }
};

/**
 * Tạo balance record cho user mới
 */
export const createUserBalance = async (userId: string, initialBalance: number = 0): Promise<UserBalance | null> => {
    try {
        const headers = await getNocoDBHeaders();
        const url = getNocoDBUrl(TABLE_ID);

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                user_id: userId,
                balance: initialBalance,
                total_deposited: initialBalance,
                total_spent: 0,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn('⚠️ createUserBalance failed:', response.status, errorText);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.warn('⚠️ Error creating user balance:', error);
        return null;
    }
};

/**
 * Lấy hoặc tạo balance cho user
 */
export const getOrCreateBalance = async (userId: string): Promise<UserBalance | null> => {
    let balance = await getUserBalance(userId);

    if (!balance) {
        balance = await createUserBalance(userId, 0);
    }

    return balance;
};

/**
 * Cộng coin (nạp tiền)
 * ✅ FIX: Use array with Id in body (NocoDB API v2 format) - matching salesReportsService
 */
export const addCoins = async (userId: string, amount: number): Promise<boolean> => {
    try {
        const balance = await getOrCreateBalance(userId);
        if (!balance?.Id) {
            console.error('No balance record found for user:', userId);
            return false;
        }

        const headers = await getNocoDBHeaders();
        // ✅ NocoDB API v2: PATCH /records với array chứa Id
        const response = await fetch(getNocoDBUrl(TABLE_ID), {
            method: 'PATCH',
            headers,
            body: JSON.stringify([{
                Id: balance.Id,
                balance: (balance.balance || 0) + amount,
                total_deposited: (balance.total_deposited || 0) + amount,
            }]),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to add coins:', response.status, errorText);
        }
        return response.ok;
    } catch (error) {
        console.error('Error adding coins:', error);
        return false;
    }
};

/**
 * Trừ coin (sử dụng)
 * ✅ FIX: Use array with Id in body (NocoDB API v2 format)
 */
export const deductCoins = async (userId: string, amount: number): Promise<boolean> => {
    try {
        const balance = await getUserBalance(userId);
        if (!balance?.Id) return false;

        // Kiểm tra đủ coin không
        if ((balance.balance || 0) < amount) {
            console.error('Insufficient balance');
            return false;
        }

        const headers = await getNocoDBHeaders();
        const response = await fetch(getNocoDBUrl(TABLE_ID), {
            method: 'PATCH',
            headers,
            body: JSON.stringify([{
                Id: balance.Id,
                balance: (balance.balance || 0) - amount,
                total_spent: (balance.total_spent || 0) + amount,
            }]),
        });

        return response.ok;
    } catch (error) {
        console.error('Error deducting coins:', error);
        return false;
    }
};

/**
 * Kiểm tra user có đủ coin không
 */
export const hasEnoughBalance = async (userId: string, requiredAmount: number): Promise<boolean> => {
    const balance = await getUserBalance(userId);
    return (balance?.balance || 0) >= requiredAmount;
};
