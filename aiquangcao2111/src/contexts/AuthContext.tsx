import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🛡️ Ref to prevent duplicate sync (race condition fix)
  const isSyncingRef = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle sign in - sync profile for new users
        if (event === 'SIGNED_IN' && session?.user) {
          const userId = session.user.id;

          // 🛡️ CHECK 1: Ref-based lock to prevent concurrent calls
          if (isSyncingRef.current) {
            return;
          }

          // 🛡️ CHECK 2: SessionStorage lock to prevent duplicate across page reload
          const syncKey = `profile_synced_${userId}`;
          const lastSync = sessionStorage.getItem(syncKey);
          const now = Date.now();

          // If synced within last 10 seconds, skip
          if (lastSync && (now - parseInt(lastSync)) < 10000) {
            return;
          }

          // Check if this was an OAuth login by looking at the AMR (Authentication Method Reference)
          // This is more reliable than checking provider, especially for linked accounts
          const amr = (session as any).amr || [];
          const isOAuthLogin = amr.some((m: any) => m.method === 'oauth');
          const providers = session.user.app_metadata?.providers || [];
          const hasGoogleProvider = providers.includes('google');

          // Sync for any login (both OAuth and email) to ensure profile/subscription exists

          // Set lock immediately
          isSyncingRef.current = true;
          sessionStorage.setItem(syncKey, now.toString());

          setTimeout(async () => {
            try {

              // Use client-side services instead of Edge Function to avoid JWT issues
              const { getOrCreateProfile } = await import('@/services/nocodb/profilesService');
              const { getActiveSubscription, createSubscription } = await import('@/services/nocodb/userSubscriptionsService');
              const { assignRole } = await import('@/services/nocodb/userRolesService');

              const user = session.user;

              // 1. Create/Get profile using client-side service
              const profile = await getOrCreateProfile(
                user.id,
                user.email!,
                user.user_metadata?.full_name || user.user_metadata?.name
              );

              // 2. Assign 'user' role (creates if not exists)
              const roleResult = await assignRole(user.id, 'user');

              // 3. Check and create Trial subscription
              // ✅ FIX: Check ALL subscriptions (including expired) to prevent duplicate trial tokens
              const { getUserSubscriptions } = await import('@/services/nocodb/userSubscriptionsService');
              const allSubs = await getUserSubscriptions(user.id);

              // Only create trial if user has NEVER had any subscription
              if (!allSubs || allSubs.length === 0) {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 3); // 3 days trial

                const newSub = await createSubscription({
                  user_id: user.id,
                  package_id: 'Trial',
                  status: 'trial',
                  start_date: startDate.toISOString(),
                  end_date: endDate.toISOString(),
                  auto_renew: false,
                });
              } else {
                // User already has subscription(s), skipping trial creation
              }

              // 5. Check and auto-accept pending workspace invite
              try {
                const { getPendingInviteByEmail, acceptInvite } = await import('@/services/nocodb/workspaceMembersService');
                const pendingInvite = await getPendingInviteByEmail(user.email!);

                if (pendingInvite) {
                  const accepted = await acceptInvite(pendingInvite.Id!, user.id);
                  if (accepted) {
                    // Show toast to notify user
                    const { toast } = await import('sonner');
                    toast.success(`Bạn đã được thêm vào workspace!`, {
                      description: `Vai trò: ${pendingInvite.role}`,
                      duration: 5000,
                    });
                  }
                }
              } catch (inviteErr) {
                console.error('❌ Error checking workspace invite:', inviteErr);
              }

              // Note: Tokens are automatically added by createSubscription() 
              // when subscription is created (see userSubscriptionsService.ts)

            } catch (err) {
              console.error('❌ Error syncing OAuth profile:', err);
              // Log full error details
              if (err instanceof Error) {
                console.error('Error message:', err.message);
                console.error('Error stack:', err.stack);
              }
            } finally {
              // 🛡️ Release lock
              isSyncingRef.current = false;
            }
          }, 5000); // 5 seconds delay to let session fully propagate
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ✅ Auto-sync profile removed to prevent race condition with signUp/signIn
  // useEffect(() => {
  //   if (user) {
  //     syncUserProfile(user);
  //   }
  // }, [user]);

  // Sync user profile to NocoDB
  const syncUserProfile = async (user: User) => {
    try {
      const { error } = await supabase.functions.invoke('sync-user-profile', {
        body: { userId: user.id }
      });

      if (error) {
        console.error('❌ Failed to sync user profile to NocoDB:', error);
      } else {

      }
    } catch (error) {
      console.error('❌ Error syncing user profile:', error);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });



      if (error) {
        console.error('❌ Signup error:', error);
        // Translate common Supabase errors to Vietnamese
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          throw new Error('Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.');
        }
        throw error;
      }

      // Handle Email Confirmation Case (OTP flow)
      // Toast and redirect handled by Signup.tsx
      if (data.user && !data.session) {
        return { error: null };
      }

      // Sync profile to NocoDB after successful signup (Auto-confirm disabled case)
      if (data.user && data.session) {


        // Wait for session to be ready, then sync everything
        setTimeout(async () => {
          try {
            // 1. Sync profile to NocoDB first
            const { error: syncError } = await supabase.functions.invoke('sync-user-profile');

            if (syncError) {
              console.error('❌ Failed to sync user profile to NocoDB:', syncError);
              toast.error('Không thể tạo profile. Vui lòng thử đăng nhập lại.');
            } else {
              // 2. Then assign default role

              const { error: roleError } = await supabase.functions.invoke('assign-default-role', {
                body: { userId: data.user!.id }
              });

              if (roleError) {
                console.error('❌ Failed to assign default role:', roleError);
              } else {
                // Trigger roles reload
                window.dispatchEvent(new CustomEvent('roles-updated'));
              }

              // 3. Finally assign trial subscription
              const { error: trialError } = await supabase.functions.invoke('assign-trial-subscription', {
                body: { userId: data.user!.id }
              });

              if (trialError) {
                console.error('❌ Failed to assign trial subscription:', trialError);
              } else {
              }

              toast.success('Tài khoản đã được thiết lập xong!');
            }
          } catch (err) {
            console.error('❌ Error in post-signup setup:', err);
            toast.error('Có lỗi xảy ra khi thiết lập tài khoản');
          }
        }, 2000); // Wait 2 seconds to ensure session is fully established
      }

      return { error: null };
    } catch (error: any) {
      console.error('❌ Signup exception:', error);

      let errorMessage = error.message || 'Đăng ký thất bại';
      let errorDescription = '';

      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('network')) {
        errorMessage = '❌ Lỗi kết nối';
        errorDescription = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra internet hoặc tắt AdBlock.';
      } else if (errorMessage.includes('already registered')) {
        errorMessage = 'Email đã tồn tại';
        errorDescription = 'Vui lòng đăng nhập hoặc dùng email khác.';
      }

      toast.error(errorMessage, {
        description: errorDescription,
        duration: 5000,
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Sync profile to NocoDB after successful signin
      if (data.user) {
        setTimeout(() => {
          syncUserProfile(data.user!);
        }, 100);
      }

      toast.success('Đăng nhập thành công!');
      navigate('/home');
      return { error: null };
    } catch (error: any) {
      console.error('❌ Sign in error:', error);

      // Enhanced error handling with Vietnamese translations
      let errorMessage = 'Đăng nhập thất bại';
      let errorDescription = '';

      const errorCode = error?.code;
      const errorMsg = error?.message?.toLowerCase() || '';

      // 1. Email not confirmed
      if (errorCode === 'email_not_confirmed' || errorMsg.includes('email not confirmed')) {
        errorMessage = '❌ Email chưa được xác nhận';
        errorDescription = 'Vui lòng kiểm tra email và click vào link xác nhận. Nếu không thấy email, kiểm tra hộp thư spam.';
      }
      // 2. Invalid credentials
      else if (errorCode === 'invalid_credentials' || errorMsg.includes('invalid login credentials')) {
        errorMessage = '❌ Email hoặc mật khẩu không đúng';
        errorDescription = 'Vui lòng kiểm tra lại thông tin đăng nhập.';
      }
      // 3. User not found
      else if (errorMsg.includes('user not found') || errorMsg.includes('email not found')) {
        errorMessage = '❌ Email không tồn tại';
        errorDescription = 'Email này chưa được đăng ký. Vui lòng đăng ký tài khoản mới.';
      }
      // 4. Too many requests
      else if (errorMsg.includes('too many requests') || errorCode === 'over_request_rate_limit') {
        errorMessage = '❌ Quá nhiều lần thử';
        errorDescription = 'Vui lòng đợi 5-10 phút trước khi thử lại.';
      }
      // 5. Network error
      else if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
        errorMessage = '❌ Lỗi kết nối';
        errorDescription = 'Vui lòng kiểm tra kết nối internet và thử lại.';
      }

      // Show toast with description
      toast.error(errorMessage, {
        description: errorDescription,
        duration: 5000,
      });

      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // If session not found, still proceed to clear local state and navigate
        console.warn('Sign out warning:', error.message);
      }

      setSession(null);
      setUser(null);

      // ✅ CRITICAL: Clear all browser cache to prevent cross-user data leaks
      // This ensures that when User A logs out, User B doesn't see A's cached data (e.g. cached_campaign_catalog)
      localStorage.clear();
      sessionStorage.clear();

      toast.success('Đã đăng xuất');
      navigate('/auth/login');
    } catch (error: any) {
      console.error('Sign out error:', error);
      // Navigate to login anyway to avoid being stuck
      navigate('/auth/login');
      toast.error(error.message || 'Đăng xuất thất bại');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      toast.success('Email đặt lại mật khẩu đã được gửi!');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || 'Gửi email thất bại');
      return { error };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      toast.success('Mật khẩu đã được cập nhật!');
      navigate('/home');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || 'Cập nhật mật khẩu thất bại');
      return { error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
