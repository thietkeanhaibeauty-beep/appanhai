import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getNocoDBUrl = (recordId?: string) => {
  const baseUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.USER_ROLES}/records`;
  return recordId ? `${baseUrl}/${recordId}` : baseUrl;
};

interface UserRole {
  Id?: number;
  user_id: string;
  role: 'super_admin' | 'admin' | 'user';
  created_at?: string;
  created_by?: string;
}

interface UserRoleListResponse {
  list: UserRole[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

/**
 * Check if user already has a role in NocoDB
 */
const checkRoleExists = async (userId: string): Promise<boolean> => {
  const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
  const url = `${getNocoDBUrl()}?where=${whereClause}`;

  console.log('🔍 Checking if role exists for user:', userId);

  const response = await fetch(url, {
    method: 'GET',
    headers: getNocoDBHeaders(),
  });

  if (!response.ok) {
    throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
  }

  const data: UserRoleListResponse = await response.json();
  const exists = data.list.length > 0;

  console.log(`📊 Role check result: ${exists ? 'EXISTS' : 'NOT FOUND'}`, { count: data.list.length });
  return exists;
};

/**
 * Create default 'user' role in NocoDB
 */
const createDefaultRole = async (userId: string): Promise<UserRole> => {
  const roleData = {
    user_id: userId,
    role: 'user' as const,
  };

  console.log('📝 Creating default role:', roleData);

  const response = await fetch(getNocoDBUrl(), {
    method: 'POST',
    headers: getNocoDBHeaders(),
    body: JSON.stringify(roleData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create role: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ Default role created successfully:', result);
  return result;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Assign Default Role - Start');

    // Authenticate user
    const user = await getUserFromRequest(req);
    console.log('👤 Authenticated user:', user.id);

    // Get userId from request body (for manual assignment) or use authenticated user
    const { userId } = await req.json().catch(() => ({ userId: null }));
    const targetUserId = userId || user.id;

    console.log('🎯 Target user ID:', targetUserId);

    // Check if role already exists
    const roleExists = await checkRoleExists(targetUserId);

    if (roleExists) {
      console.log('ℹ️ User already has a role, skipping creation');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'User already has a role',
          alreadyExists: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create default 'user' role
    const newRole = await createDefaultRole(targetUserId);

    console.log('🎉 Default role assignment completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Default role assigned successfully',
        role: newRole,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error in assign-default-role:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
