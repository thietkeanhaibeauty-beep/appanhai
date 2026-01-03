/**
 * Hook to get Admin Zalo account
 * Located: src/features/admin-zalo/hooks/useAdminZalo.ts
 */

import { useState, useEffect } from 'react';
import { getAdminZaloAccount, AdminZaloAccount } from '../services/adminZaloService';

export const useAdminZalo = () => {
    const [adminAccount, setAdminAccount] = useState<AdminZaloAccount | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAdminAccount = async () => {
        try {
            setLoading(true);
            setError(null);
            const account = await getAdminZaloAccount();
            setAdminAccount(account);
        } catch (err: any) {
            console.error('[useAdminZalo] Error:', err);
            setError(err.message || 'Không thể tải thông tin Admin Zalo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminAccount();
    }, []);

    return {
        adminAccount,
        adminPhone: adminAccount?.phone_number || '',
        adminOwnId: adminAccount?.own_id || '',
        loading,
        error,
        refresh: fetchAdminAccount,
    };
};
