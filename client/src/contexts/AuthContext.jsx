import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);

            // Assign trial for new users
            if (session?.user) {
                assignTrialIfNeeded(session.user.id);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null);

                if (event === 'SIGNED_IN' && session?.user) {
                    assignTrialIfNeeded(session.user.id);
                    createProfileIfNeeded(session.user.id, session.user.email);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const assignTrialIfNeeded = async (userId) => {
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ljpownumtmclnrtnqldt.supabase.co';
            const response = await fetch(`${supabaseUrl}/functions/v1/assign-trial-subscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
                body: JSON.stringify({ userId }),
            });

            if (response.ok) {
                console.log('✅ Trial subscription checked/assigned');
            }
        } catch (error) {
            console.error('Error assigning trial:', error);
        }
    };

    const createProfileIfNeeded = async (userId, email) => {
        try {
            const nocodbUrl = 'https://db.hpb.edu.vn';
            const nocodbToken = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';
            const profilesTableId = 'mhegyo7nyk6wiaj';
            const balancesTableId = 'm16m58ti6kjlax0';

            // Check if profile exists
            const checkUrl = `${nocodbUrl}/api/v2/tables/${profilesTableId}/records?where=(user_id,eq,${userId})&limit=1`;
            const checkRes = await fetch(checkUrl, {
                headers: { 'xc-token': nocodbToken }
            });

            if (checkRes.ok) {
                const { list } = await checkRes.json();
                if (list && list.length > 0) {
                    console.log('✅ Profile already exists');
                    return;
                }
            }

            // Create profile
            const createUrl = `${nocodbUrl}/api/v2/tables/${profilesTableId}/records`;
            const createRes = await fetch(createUrl, {
                method: 'POST',
                headers: {
                    'xc-token': nocodbToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    email: email,
                    full_name: ''
                })
            });

            if (createRes.ok) {
                console.log('✅ Profile created in NocoDB');
            }

            // Create coin balance (10000 coins for new users)
            const balanceUrl = `${nocodbUrl}/api/v2/tables/${balancesTableId}/records`;
            await fetch(balanceUrl, {
                method: 'POST',
                headers: {
                    'xc-token': nocodbToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    coin_balance: 10000
                })
            });
            console.log('✅ Coin balance created (10000 coins)');
        } catch (error) {
            console.error('Error creating profile:', error);
        }
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    };

    const signUp = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        return { data, error };
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    };

    const value = {
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
