import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { initNocoDB, TABLE_IDS, NOCODB_URL, NOCODB_TOKEN } from '../services/api';

/**
 * Hook to get user role from NocoDB user_roles table
 */
export const useUserRole = () => {
    const { user } = useAuth();
    const [role, setRole] = useState('user'); // default to 'user'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserRole = async () => {
            if (!user?.id) {
                setRole('user');
                setLoading(false);
                return;
            }

            try {
                // Initialize to get correct Table IDs
                await initNocoDB();

                // Find UserRoles table ID with fallback
                const userRolesTableId = TABLE_IDS.UserRoles || TABLE_IDS.user_roles || TABLE_IDS['User Roles'];

                if (!userRolesTableId) {
                    console.warn('⚠️ UserRoles table ID not found. Check NocoDB table name.');
                    // If we can't find the table, we can't verify role. Default to 'user'.
                    setLoading(false);
                    return;
                }

                const baseUrl = NOCODB_URL || 'https://db.hpb.edu.vn';
                const token = NOCODB_TOKEN || '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';

                const res = await fetch(
                    `${baseUrl}/api/v2/tables/${userRolesTableId}/records?where=(user_id,eq,${user.id})&limit=1`,
                    { headers: { 'xc-token': token } }
                );

                if (res.ok) {
                    const { list } = await res.json();
                    if (list?.[0]?.role) {
                        console.log('✅ Fetched User Role:', list[0].role, 'for User ID:', user.id);
                        setRole(list[0].role);
                    } else {
                        console.log('⚠️ No role found for user:', user.id);
                    }
                } else {
                    console.error('❌ Failed to fetch role:', res.status, res.statusText);
                }
            } catch (err) {
                console.error('Error fetching user role:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserRole();
    }, [user]);

    // Robust role checking
    const normalizedRole = role?.toLowerCase() || '';
    const isAdmin = normalizedRole === 'admin' || normalizedRole === 'super_admin' || normalizedRole === 'superadmin';
    const isSuperAdmin = normalizedRole === 'super_admin' || normalizedRole === 'superadmin';

    return {
        role,
        loading,
        isAdmin,
        isSuperAdmin,
    };
};

export default useUserRole;
