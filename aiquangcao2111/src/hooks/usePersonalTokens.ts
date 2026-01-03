import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  PersonalToken,
  getPersonalTokensByUserId,
  updatePersonalToken,
  activatePersonalToken,
} from '@/services/nocodb/personalTokensService';
import { parseToken } from '@/utils/tokenParser';

interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
  currency: string;
}

interface Page {
  id: string;
  name: string;
  category: string;
}

interface ValidationResult {
  success: boolean;
  data?: {
    facebookUserId: string;
    facebookUserName: string;
    email: string | null;
    permissions: {
      granted: string[];
      declined: string[];
    };
    adAccounts: AdAccount[];
    pages: Page[];
  };
  error?: string;
}

export const usePersonalTokens = () => {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<PersonalToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  // Load all tokens for the user
  const loadTokens = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await getPersonalTokensByUserId(user.id);
      setTokens(data);
    } catch (error) {
      console.error('Error loading tokens:', error);
      toast.error('Không thể tải danh sách tokens');
    } finally {
      setLoading(false);
    }
  };

  // Validate token with Facebook API
  const validateToken = async (rawToken: string): Promise<ValidationResult> => {
    setValidating(true);
    try {
      // Parse token from various formats
      const cleanToken = parseToken(rawToken);

      // Call edge function to validate with Facebook
      const { data, error } = await supabase.functions.invoke('check-personal-token', {
        body: { accessToken: cleanToken },
      });

      if (error) throw error;

      return data as ValidationResult;
    } catch (error: any) {
      console.error('Error validating token:', error);
      return {
        success: false,
        error: error.message || 'Không thể xác thực token',
      };
    } finally {
      setValidating(false);
    }
  };

  // Add new token (with validation)
  const addToken = async (
    rawToken: string,
    tokenType: 'primary' | 'secondary',
    validationData: ValidationResult['data']
  ): Promise<void> => {
    if (!user || !validationData) return;

    try {
      const cleanToken = parseToken(rawToken);

      // Save to database via edge function
      const { data, error } = await supabase.functions.invoke('save-personal-token', {
        body: {
          accessToken: cleanToken,
          tokenType,
          validationData,
        },
      });

      if (error) throw error;

      if (data.action === 'created') {
        toast.success('✅ Đã thêm token thành công');
      } else {
        toast.success('✅ Đã cập nhật token');
      }

      // Reload tokens list
      await loadTokens();
    } catch (error: any) {
      console.error('Error adding token:', error);
      throw new Error(error.message || 'Không thể lưu token');
    }
  };

  // Activate token (and deactivate others)
  const activateToken = async (tokenId: number): Promise<void> => {
    try {
      const { error } = await supabase.functions.invoke('activate-personal-token', {
        body: { tokenId },
      });

      if (error) throw error;

      toast.success('✅ Đã kích hoạt token');
      await loadTokens();
    } catch (error: any) {
      console.error('Error activating token:', error);
      toast.error(error.message || 'Không thể kích hoạt token');
    }
  };

  // Revalidate token
  const revalidateToken = async (tokenId: number, accessToken: string): Promise<void> => {
    try {
      const { data, error } = await supabase.functions.invoke('check-personal-token', {
        body: { tokenId, accessToken },
      });

      if (error) throw error;

      if (!data.success) {
        toast.error('Token không hợp lệ');
      } else {
        toast.success('✅ Token vẫn còn hiệu lực');
        await loadTokens();
      }
    } catch (error: any) {
      console.error('Error revalidating token:', error);
      toast.error(error.message || 'Không thể xác thực lại token');
    }
  };

  // Change token type
  const changeTokenType = async (
    tokenId: number,
    newType: 'primary' | 'secondary'
  ): Promise<void> => {
    if (!user) return;

    try {
      await updatePersonalToken(tokenId, { token_type: newType });

      // If changing to primary, activate it
      if (newType === 'primary') {
        await activateToken(tokenId);
      } else {
        toast.success('✅ Đã đổi loại token');
        await loadTokens();
      }
    } catch (error: any) {
      console.error('Error changing token type:', error);
      toast.error(error.message || 'Không thể đổi loại token');
    }
  };

  // Delete token
  const deleteToken = async (tokenId: number): Promise<void> => {
    try {
      const { error } = await supabase.functions.invoke('delete-personal-token', {
        body: { tokenId },
      });

      if (error) throw error;

      toast.success('✅ Đã xóa token');
      await loadTokens();
    } catch (error: any) {
      console.error('Error deleting token:', error);
      toast.error(error.message || 'Không thể xóa token');
    }
  };

  // Load tokens on mount
  useEffect(() => {
    if (user) {
      loadTokens();
    }
  }, [user]);

  // Get the active primary token
  const primaryToken = tokens.find(t => t.token_type === 'primary' && t.is_active)?.access_token;

  return {
    tokens,
    loading,
    validating,
    primaryToken,
    validateToken,
    addToken,
    activateToken,
    revalidateToken,
    changeTokenType,
    deleteToken,
    loadTokens,
  };
};
