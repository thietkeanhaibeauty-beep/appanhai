import { getActivePersonalToken } from '@/services/nocodb/personalTokensService';

/**
 * Get the primary (active) access token for current user
 * Used for auto-comment, posting, and other Facebook interactions
 */
export const getPrimaryAccessToken = async (userId: string): Promise<string | null> => {
  try {
    const token = await getActivePersonalToken(userId);
    return token?.access_token || null;
  } catch (error) {
    console.error('Error getting primary token:', error);
    return null;
  }
};

/**
 * Validate that user has an active primary token before performing an action
 * Returns error info if validation fails
 */
export const validatePrimaryToken = async (userId: string): Promise<{
  hasError: boolean;
  message?: string;
}> => {
  const token = await getPrimaryAccessToken(userId);

  if (!token) {
    return {
      hasError: true,
      message: 'Bạn chưa cấu hình Personal Token. Vui lòng vào Settings để thêm token.',
    };
  }

  return { hasError: false };
};
