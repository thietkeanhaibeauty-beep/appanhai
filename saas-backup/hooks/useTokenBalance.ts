/**
 * useTokenBalance Hook
 * Quản lý số dư coin - hỗ trợ Workspace Token Pool
 * - Owner: dùng balance của chính mình
 * - Member (marketing/sales/admin): dùng balance của Owner
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    UserBalance,
    getUserBalance,
    getOrCreateBalance,
    hasEnoughBalance,
} from '@/services/nocodb/userBalancesService';
import {
    CoinTransaction,
    getTransactionsByUserId,
} from '@/services/nocodb/coinTransactionsService';
import {
    getMembershipByUserId,
} from '@/services/nocodb/workspaceMembersService';
import {
    getWorkspaceById,
} from '@/services/nocodb/workspacesService';

interface UseTokenBalanceReturn {
    // State
    balance: number;
    totalDeposited: number;
    totalSpent: number;
    transactions: CoinTransaction[];
    loading: boolean;
    error: string | null;

    // Workspace info
    isUsingOwnerBalance: boolean;  // true nếu đang dùng balance của owner
    ownerEmail?: string;           // Email owner (để hiển thị)

    // Actions
    refreshBalance: () => Promise<void>;
    loadTransactions: () => Promise<void>;
    checkBalance: (requiredAmount: number) => Promise<boolean>;
    getEffectiveUserId: () => Promise<string | null>; // User ID để deduct tokens
}

export const useTokenBalance = (): UseTokenBalanceReturn => {
    const { user } = useAuth();

    const [balanceData, setBalanceData] = useState<UserBalance | null>(null);
    const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isUsingOwnerBalance, setIsUsingOwnerBalance] = useState(false);
    const [ownerEmail, setOwnerEmail] = useState<string | undefined>();
    const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);

    // Get effective user ID (owner's ID if member, own ID if owner)
    const getEffectiveUserId = useCallback(async (): Promise<string | null> => {
        if (!user?.id) return null;

        try {
            // Check if user is a member of a workspace
            const membership = await getMembershipByUserId(user.id);

            if (membership && membership.role !== 'owner') {
                // User is a member (not owner) → get workspace owner's ID
                const workspace = await getWorkspaceById(membership.workspace_id);
                if (workspace?.owner_user_id) {
                    return workspace.owner_user_id;
                }
            }

            // User is owner or no workspace → use own ID
            return user.id;
        } catch (err) {
            console.error('Error getting effective user ID:', err);
            return user.id;
        }
    }, [user?.id]);

    // Load balance (từ owner nếu là member)
    const refreshBalance = useCallback(async () => {
        if (!user?.id) return;

        setLoading(true);
        setError(null);

        try {
            // Check workspace membership
            const membership = await getMembershipByUserId(user.id);

            let targetUserId = user.id;
            let usingOwnerBalance = false;
            let ownerEmailValue: string | undefined;

            if (membership && membership.role !== 'owner') {
                // Member → use owner's balance
                const workspace = await getWorkspaceById(membership.workspace_id);
                if (workspace?.owner_user_id) {
                    targetUserId = workspace.owner_user_id;
                    usingOwnerBalance = true;
                    ownerEmailValue = workspace.name; // Use workspace name instead
                }
            }

            const data = await getOrCreateBalance(targetUserId);
            setBalanceData(data);
            setIsUsingOwnerBalance(usingOwnerBalance);
            setOwnerEmail(ownerEmailValue);
            setEffectiveUserId(targetUserId);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // Load transactions
    const loadTransactions = useCallback(async () => {
        if (!effectiveUserId) return;

        try {
            const txs = await getTransactionsByUserId(effectiveUserId, 50);
            setTransactions(txs);
        } catch (err: any) {
            console.error('Error loading transactions:', err);
        }
    }, [effectiveUserId]);

    // Check if there's enough balance
    const checkBalance = useCallback(async (requiredAmount: number): Promise<boolean> => {
        const userId = await getEffectiveUserId();
        if (!userId) return false;
        return await hasEnoughBalance(userId, requiredAmount);
    }, [getEffectiveUserId]);

    // Auto-load on mount
    useEffect(() => {
        if (user?.id) {
            refreshBalance();
        }
    }, [user?.id, refreshBalance]);

    // Listen for global 'balance-updated' event
    useEffect(() => {
        const handleBalanceUpdated = () => {
            refreshBalance();
        };

        window.addEventListener('balance-updated', handleBalanceUpdated);
        return () => window.removeEventListener('balance-updated', handleBalanceUpdated);
    }, [refreshBalance]);

    return {
        balance: balanceData?.balance || 0,
        totalDeposited: balanceData?.total_deposited || 0,
        totalSpent: balanceData?.total_spent || 0,
        transactions,
        loading,
        error,

        isUsingOwnerBalance,
        ownerEmail,

        refreshBalance,
        loadTransactions,
        checkBalance,
        getEffectiveUserId,
    };
};
