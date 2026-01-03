import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
                const nocodbUrl = 'https://db.hpb.edu.vn';
                const nocodbToken = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';
                const userRolesTableId = 'p8xfd6fzun2guxg';

                const res = await fetch(
                    `${nocodbUrl}/api/v2/tables/${userRolesTableId}/records?where=(user_id,eq,${user.id})&limit=1`,
                    { headers: { 'xc-token': nocodbToken } }
                );

                if (res.ok) {
                    const { list } = await res.json();
                    if (list?.[0]?.role) {
                        setRole(list[0].role);
                    }
                }
            } catch (err) {
                console.error('Error fetching user role:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserRole();
    }, [user]);

    const isAdmin = role === 'admin' || role === 'super_admin';
    const isSuperAdmin = role === 'super_admin';

    return {
        role,
        loading,
        isAdmin,
        isSuperAdmin,
    };
};

export default useUserRole;
