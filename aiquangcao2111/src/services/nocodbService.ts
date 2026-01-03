import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './nocodb/config';

// Define interfaces locally or import from types if available
// Keeping them here for now to maintain backward compatibility
export interface NocoDBRecord {
  Id?: number;
  user_id?: string;
  [key: string]: any;
}

export interface NocoDBListResponse {
  list: NocoDBRecord[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

/**
 * Get all records from user_api_tokens table
 */
export const getApiTokens = async (
  offset = 0,
  limit = 25
): Promise<NocoDBListResponse> => {
  try {
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_API_TOKENS)}?offset=${offset}&limit=${limit}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching API tokens from NocoDB:', error);
    throw error;
  }
};

/**
 * Get a single record by ID
 */
export const getApiTokenById = async (recordId: number): Promise<NocoDBRecord> => {
  try {
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_API_TOKENS)}/${recordId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching API token by ID from NocoDB:', error);
    throw error;
  }
};

/**
 * Create a new record in user_api_tokens table
 */
export const createApiToken = async (data: NocoDBRecord): Promise<NocoDBRecord> => {
  try {
    const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_API_TOKENS);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating API token in NocoDB:', error);
    throw error;
  }
};

/**
 * Update a record by ID
 */
export const updateApiToken = async (
  recordId: number,
  data: NocoDBRecord
): Promise<NocoDBRecord> => {
  try {
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_API_TOKENS)}/${recordId}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating API token in NocoDB:', error);
    throw error;
  }
};

/**
 * Delete a record by ID
 */
export const deleteApiToken = async (recordId: number): Promise<void> => {
  try {
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_API_TOKENS)}/${recordId}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting API token from NocoDB:', error);
    throw error;
  }
};

/**
 * Search records by user_id
 */
export const getApiTokensByUserId = async (userId: string): Promise<NocoDBRecord[]> => {
  try {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_API_TOKENS)}?where=${whereClause}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    const data: NocoDBListResponse = await response.json();
    return data.list || [];
  } catch (error) {
    console.error('Error searching API tokens by user_id from NocoDB:', error);
    throw error;
  }
};
