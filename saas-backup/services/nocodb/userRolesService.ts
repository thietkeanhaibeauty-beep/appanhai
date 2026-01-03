import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export type AppRole = 'super_admin' | 'admin' | 'user';

export interface UserRole {
  Id?: number;
  user_id: string;
  role: AppRole;
  created_at?: string;
  created_by?: string;
}

export interface UserRoleListResponse {
  list: UserRole[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

const TABLE_ID = NOCODB_CONFIG.TABLES.USER_ROLES;

/**
 * Get all user roles
 */
export const getUserRoles = async (
  offset = 0,
  limit = 25
): Promise<UserRoleListResponse> => {
  const url = `${getNocoDBUrl(TABLE_ID)}?offset=${offset}&limit=${limit}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: await getNocoDBHeaders(),
  });

  if (!response.ok) {
    throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Get roles for a specific user
 */
export const getUserRolesByUserId = async (userId: string): Promise<UserRole[]> => {
  const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
  const url = `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: await getNocoDBHeaders(),
  });

  if (!response.ok) {
    throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
  }

  const data: UserRoleListResponse = await response.json();
  return data.list;
};

/**
 * Check if user has a specific role
 */
export const hasRole = async (userId: string, role: string): Promise<boolean> => {
  const roles = await getUserRolesByUserId(userId);
  return roles.some(r => r.role === role);
};

/**
 * Create a new user role
 */
export const createUserRole = async (data: Omit<UserRole, 'Id'>): Promise<UserRole> => {
  const url = getNocoDBUrl(TABLE_ID);

  const response = await fetch(url, {
    method: 'POST',
    headers: await getNocoDBHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Update a user role
 */
export const updateUserRole = async (
  recordId: number,
  data: Partial<UserRole>
): Promise<UserRole> => {
  const url = getNocoDBUrl(TABLE_ID, recordId.toString());

  const response = await fetch(url, {
    method: 'PATCH',
    headers: await getNocoDBHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Delete a user role
 */
export const deleteUserRole = async (recordId: number): Promise<void> => {
  // Construct Proxy Command
  const fullUrl = getNocoDBUrl(TABLE_ID);
  const proxyBaseUrl = fullUrl.split('/api/v2')[0];
  const path = `/api/v2/tables/${TABLE_ID}/records`;

  const response = await fetch(proxyBaseUrl, {
    method: 'POST',
    headers: await getNocoDBHeaders(),
    body: JSON.stringify({
      path: path,
      method: 'DELETE',
      data: [{ Id: recordId }]
    }),
  });

  if (!response.ok) {
    throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
  }
};

/**
 * Assign a role to a user (create if not exists)
 */
export const assignRole = async (userId: string, role: AppRole, createdBy?: string): Promise<UserRole> => {
  // Check if role already exists
  const existingRoles = await getUserRolesByUserId(userId);
  const hasExistingRole = existingRoles.find(r => r.role === role);

  if (hasExistingRole) {
    return hasExistingRole;
  }

  // Create new role
  return await createUserRole({
    user_id: userId,
    role,
    created_by: createdBy,
  });
};
