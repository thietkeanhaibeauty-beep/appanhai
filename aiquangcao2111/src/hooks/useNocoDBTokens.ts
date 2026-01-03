import { useState, useEffect } from 'react';
import {
  getApiTokens,
  getApiTokensByUserId,
  createApiToken,
  updateApiToken,
  deleteApiToken,
} from '@/services/nocodbService';
import { useToast } from '@/hooks/use-toast';

interface ApiToken {
  Id?: number;
  user_id?: string;
  [key: string]: any;
}

export const useNocoDBTokens = (userId?: string) => {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadTokens = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (userId) {
        const data = await getApiTokensByUserId(userId);
        setTokens(data);
      } else {
        const response = await getApiTokens();
        setTokens(response.list);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tokens';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addToken = async (tokenData: ApiToken) => {
    try {
      setLoading(true);
      const newToken = await createApiToken(tokenData);
      await loadTokens();
      toast({
        title: 'Success',
        description: 'Token created successfully',
      });
      return newToken;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create token';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateToken = async (recordId: number, tokenData: ApiToken) => {
    try {
      setLoading(true);
      const updatedToken = await updateApiToken(recordId, tokenData);
      await loadTokens();
      toast({
        title: 'Success',
        description: 'Token updated successfully',
      });
      return updatedToken;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update token';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeToken = async (recordId: number) => {
    try {
      setLoading(true);
      await deleteApiToken(recordId);
      await loadTokens();
      toast({
        title: 'Success',
        description: 'Token deleted successfully',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete token';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, [userId]);

  return {
    tokens,
    loading,
    error,
    loadTokens,
    addToken,
    updateToken,
    removeToken,
  };
};
