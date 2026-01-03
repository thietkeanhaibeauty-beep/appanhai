import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export interface FacebookAdAccount {
  Id?: number;
  account_id: string;
  account_name?: string;
  access_token: string;
  is_active?: boolean | number; // NocoDB returns boolean but stores as bigint
  user_id?: string;
  currency?: string; // Ad account currency (VND, USD, etc.)
  created_at?: string;
  updated_at?: string;
}

interface NocoDBListResponse {
  list: FacebookAdAccount[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

/**
 * Get all active Facebook ad accounts for a specific user
 * @param userId - User ID to filter ad accounts
 */
export const getActiveAdAccounts = async (userId: string): Promise<FacebookAdAccount[]> => {
  try {
    if (!userId) {
      throw new Error('userId is required for getActiveAdAccounts');
    }

    // NocoDB uses bigint for is_active, so query with 1 instead of true
    // Filter by both user_id and is_active (handle both boolean true and number 1)
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})~and((is_active,eq,true)~or(is_active,eq,1))`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS)}?where=${whereClause}&limit=100`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    const data: NocoDBListResponse = await response.json();


    // Convert is_active to boolean for easier use in code
    const accounts = (data.list || []).map(acc => ({
      ...acc,
      is_active: Boolean(acc.is_active)
    }));

    return accounts;
  } catch (error) {
    console.error('❌ Error fetching ad accounts from NocoDB:', error);
    throw error;
  }
};

/**
 * Get ad accounts by user ID
 * @deprecated Use getActiveAdAccounts(userId) instead
 */
export const getAdAccountsByUserId = async (userId: string): Promise<FacebookAdAccount[]> => {
  console.warn('⚠️ getAdAccountsByUserId is deprecated. Use getActiveAdAccounts(userId) instead');
  return getActiveAdAccounts(userId);
};

/**
 * Create or update ad account
 */
export const upsertAdAccount = async (account: Partial<FacebookAdAccount>): Promise<FacebookAdAccount> => {
  try {
    const tableUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS);

    // Convert boolean to number for NocoDB bigint column if is_active exists
    const accountData = { ...account };
    if ('is_active' in accountData && accountData.is_active !== undefined) {
      (accountData as any).is_active = accountData.is_active ? 1 : 0;
    }

    if (!account.user_id || !account.account_id) {
      // Fallback to simple insert if keys missing (should not happen)
      const response = await fetch(tableUrl, {
        method: 'POST',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify(accountData),
      });
      if (!response.ok) throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
      return await response.json();
    }

    // 1. Check for existing record
    const whereClause = encodeURIComponent(`(user_id,eq,${account.user_id})~and(account_id,eq,${account.account_id})`);
    const checkUrl = `${tableUrl}?where=${whereClause}&limit=1`;
    const checkRes = await fetch(checkUrl, { method: 'GET', headers: await getNocoDBHeaders() });

    if (!checkRes.ok) throw new Error(`Check failed: ${checkRes.status}`);
    const checkData: NocoDBListResponse = await checkRes.json();
    const existing = checkData.list?.[0];

    // 2. Update or Insert
    if (existing && existing.Id) {
      // Update
      const updateResponse = await fetch(tableUrl, {
        method: 'PATCH',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify({
          Id: existing.Id,
          ...accountData
        }),
      });
      if (!updateResponse.ok) throw new Error(`Update failed: ${updateResponse.status}`);
      return await updateResponse.json();
    } else {
      // Insert
      const insertResponse = await fetch(tableUrl, {
        method: 'POST',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify(accountData),
      });
      if (!insertResponse.ok) throw new Error(`Insert failed: ${insertResponse.status}`);
      return await insertResponse.json();
    }

  } catch (error) {
    console.error('Error upserting ad account:', error);
    throw error;
  }
};

/**
 * Update ad account by ID
 */
export const updateAdAccount = async (recordId: number, data: Partial<FacebookAdAccount>): Promise<FacebookAdAccount> => {
  try {
    const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS);

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
    console.error('Error updating ad account:', error);
    throw error;
  }
};

/**
 * Delete ad accounts for a specific user only
 * @param userId - User ID to filter ad accounts for deletion
 */
export const deleteAllAdAccounts = async (userId: string): Promise<void> => {
  try {
    if (!userId) {
      throw new Error('userId is required for deleteAllAdAccounts');
    }

    // ✅ Get ONLY ad accounts for this specific user
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS)}?where=${whereClause}&limit=100`;



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
          const fullUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS);
          const proxyBaseUrl = fullUrl.split('/api/v2')[0];
          const path = `/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS}/records`;

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
    console.error('Error deleting ad accounts:', error);
    throw error;
  }
};
