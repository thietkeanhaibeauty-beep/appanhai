import { supabase } from '@/integrations/supabase/client';
import { AppRole } from './userRolesService';

export interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: AppRole[];
}

/**
 * Get all users in the system (Super Admin only)
 */
export const getAllUsers = async (): Promise<UserWithRoles[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-all-users');

    if (error) {
      console.error('❌ Error getting all users:', error);
      throw error;
    }

    return data.users || [];
  } catch (error) {
    console.error('❌ Error in getAllUsers:', error);
    throw error;
  }
};

/**
 * Assign a role to a user (Super Admin only)
 */
export const assignRoleToUser = async (
  userId: string,
  role: AppRole
): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('update-user-role', {
      body: {
        userId,
        action: 'assign',
        role,
      },
    });

    if (error) {
      console.error('❌ Error assigning role:', error);
      throw error;
    }


  } catch (error) {
    console.error('❌ Error in assignRoleToUser:', error);
    throw error;
  }
};

/**
 * Remove a role from a user (Super Admin only)
 */
export const removeRoleFromUser = async (
  userId: string,
  role: AppRole
): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('update-user-role', {
      body: {
        userId,
        action: 'remove',
        role,
      },
    });

    if (error) {
      console.error('❌ Error removing role:', error);
      throw error;
    }


  } catch (error) {
    console.error('❌ Error in removeRoleFromUser:', error);
    throw error;
  }
};

/**
 * Delete a user and all related data (Super Admin only)
 */
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: {
        userId,
      },
    });

    if (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }


  } catch (error) {
    console.error('❌ Error in deleteUser:', error);
    throw error;
  }
};
