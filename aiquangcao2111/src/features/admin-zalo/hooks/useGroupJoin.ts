/**
 * Hook for joining Zalo group via Admin
 * Located: src/features/admin-zalo/hooks/useGroupJoin.ts
 */

import { useState } from 'react';
import { joinGroupByLink, sendTestMessage } from '../services/adminZaloService';
import { saveUserAdminGroup, verifyGroup } from '../services/groupVerification';

interface UseGroupJoinOptions {
    adminOwnId: string;
    userId: string;
    userPhone: string;
}

export const useGroupJoin = ({ adminOwnId, userId, userPhone }: UseGroupJoinOptions) => {
    const [joining, setJoining] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [joinedGroupId, setJoinedGroupId] = useState<string | null>(null);
    const [testMessageSent, setTestMessageSent] = useState(false);

    /**
     * Step 1: Join group by link
     */
    const handleJoinGroup = async (groupLink: string): Promise<boolean> => {
        if (!adminOwnId) {
            setError('Chưa có tài khoản Admin Zalo');
            return false;
        }

        try {
            setJoining(true);
            setError(null);

            const result = await joinGroupByLink(groupLink, adminOwnId);

            if (result.success && result.groupId) {
                setJoinedGroupId(result.groupId);

                // Save to database
                await saveUserAdminGroup({
                    user_id: userId,
                    group_id: result.groupId,
                    group_name: 'Nhóm từ link',
                    verified: false,
                    admin_own_id: adminOwnId,
                });

                // Send test message
                const testResult = await sendTestMessage(result.groupId, userPhone, adminOwnId);
                if (testResult.success) {
                    setTestMessageSent(true);
                }

                return true;
            } else {
                setError(result.error || 'Không thể tham gia nhóm');
                return false;
            }
        } catch (err: any) {
            console.error('[useGroupJoin] Join error:', err);
            setError(err.message || 'Lỗi tham gia nhóm');
            return false;
        } finally {
            setJoining(false);
        }
    };

    /**
     * Step 2: User confirms they received the test message
     */
    const handleConfirmReceived = async (): Promise<boolean> => {
        if (!joinedGroupId) {
            setError('Chưa tham gia nhóm nào');
            return false;
        }

        try {
            setVerifying(true);
            setError(null);

            const success = await verifyGroup(joinedGroupId, userId);

            if (success) {
                return true;
            } else {
                setError('Không thể xác nhận nhóm');
                return false;
            }
        } catch (err: any) {
            console.error('[useGroupJoin] Verify error:', err);
            setError(err.message || 'Lỗi xác nhận');
            return false;
        } finally {
            setVerifying(false);
        }
    };

    const reset = () => {
        setJoinedGroupId(null);
        setTestMessageSent(false);
        setError(null);
    };

    return {
        joining,
        verifying,
        error,
        joinedGroupId,
        testMessageSent,
        handleJoinGroup,
        handleConfirmReceived,
        reset,
    };
};
