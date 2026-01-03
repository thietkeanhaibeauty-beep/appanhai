import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook để lấy user ID từ AuthContext
 * Throws error nếu user chưa đăng nhập
 */
export const useUserId = () => {
  const { user } = useAuth();
  
  if (!user) {
    throw new Error('User not authenticated. Please login to continue.');
  }
  
  return user.id;
};

/**
 * Hook để lấy user ID từ AuthContext (nullable)
 * Trả về null nếu user chưa đăng nhập
 */
export const useUserIdNullable = () => {
  const { user } = useAuth();
  return user?.id || null;
};
