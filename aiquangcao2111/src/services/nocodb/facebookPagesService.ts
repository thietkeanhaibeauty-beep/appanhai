import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export interface FacebookPage {
  Id?: number;
  page_id: string;
  page_name: string;
  access_token: string;
  user_id?: string;
  is_active?: boolean;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

interface NocoDBListResponse {
  list: FacebookPage[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

/**
 * Get all Facebook pages for a specific user
 * @param userId - User ID to filter pages
 */
export const getAllPages = async (userId: string): Promise<FacebookPage[]> => {
  try {
    if (!userId) {
      throw new Error('userId is required for getAllPages');
    }

    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_PAGES)}?where=${whereClause}&limit=100`;



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
    console.error('❌ Error fetching pages from NocoDB:', error);
    throw error;
  }
};

/**
 * Get pages by user ID
 */
export const getPagesByUserId = async (userId: string): Promise<FacebookPage[]> => {
  try {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_PAGES)}?where=${whereClause}&limit=100`;

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
    console.error('Error fetching pages by user_id:', error);
    throw error;
  }
};

/**
 * Create or update page
 */
export const upsertPage = async (page: Partial<FacebookPage>): Promise<FacebookPage> => {
  try {
    const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_PAGES);

    // Convert boolean to number for NocoDB bigint column if is_active exists
    const pageData = { ...page };
    if ('is_active' in pageData && pageData.is_active !== undefined) {
      (pageData as any).is_active = pageData.is_active ? 1 : 0;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify(pageData),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error upserting page:', error);
    throw error;
  }
};

/**
 * Update a page by record ID
 */
export const updatePage = async (
  recordId: number,
  data: Partial<FacebookPage>
): Promise<FacebookPage> => {
  try {
    const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_PAGES);

    // Convert boolean to number for NocoDB bigint column if is_active exists
    const updateData = { ...data };
    if ('is_active' in updateData && updateData.is_active !== undefined) {
      (updateData as any).is_active = updateData.is_active ? 1 : 0;
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({
        Id: recordId,
        ...updateData,
      }),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating page:', error);
    throw error;
  }
};

/**
 * Delete all pages for a specific user
 * @param userId - User ID to filter pages for deletion
 */
export const deleteAllPages = async (userId: string): Promise<void> => {
  try {
    if (!userId) {
      throw new Error('userId is required for deleteAllPages');
    }

    // Get all pages for this user
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_PAGES)}?where=${whereClause}&limit=100`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status}`);
    }

    const data: NocoDBListResponse = await response.json();
    const totalRecords = data.list?.length || 0;

    if (totalRecords === 0) {
      return;
    }

    // Delete each record using Proxy Command Pattern
    await Promise.all(
      data.list.map(async (record) => {
        if (record.Id) {
          // Construct Proxy Command
          const fullUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_PAGES);
          const proxyBaseUrl = fullUrl.split('/api/v2')[0];
          const path = `/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PAGES}/records`;

          await fetch(proxyBaseUrl, {
            method: 'POST',
            headers: await getNocoDBHeaders(),
            body: JSON.stringify({
              path: path,
              method: 'DELETE',
              data: [{ Id: record.Id }]
            }),
          });
        }
      })
    );
  } catch (error) {
    console.error('Error deleting pages:', error);
    throw error;
  }
};
