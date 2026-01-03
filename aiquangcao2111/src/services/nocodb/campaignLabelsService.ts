import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export interface CampaignLabel {
  Id?: number;
  // id?: string; // Removed duplicate id
  label_name: string;
  label_color: string;
  user_id: string; // ✅ Required for user isolation
  created_at?: string;
  updated_at?: string;
}

interface NocoDBListResponse {
  list: CampaignLabel[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

/**
 * Get all campaign labels
 */
export const getAllLabels = async (): Promise<CampaignLabel[]> => {
  try {
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.CAMPAIGN_LABELS)}?sort=label_name&limit=100`;

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
    console.error('Error fetching labels from NocoDB:', error);
    throw error;
  }
};

/**
 * Get labels by user ID
 */
export const getLabelsByUserId = async (userId: string): Promise<CampaignLabel[]> => {
  try {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.CAMPAIGN_LABELS)}?where=${whereClause}&sort=label_name&limit=100`;

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
    console.error('Error fetching labels by user_id:', error);
    throw error;
  }
};

/**
 * Create new label
 */
export const createLabel = async (label: Partial<CampaignLabel>): Promise<CampaignLabel> => {


  // ✅ Validate user_id is provided
  if (!label.user_id) {
    throw new Error('user_id is required. User must be authenticated to create labels.');
  }

  try {
    const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.CAMPAIGN_LABELS);


    const headers = await getNocoDBHeaders();


    const body = JSON.stringify(label);




    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body,
    });



    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔵 [NocoDB] Error response body:', errorText);
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return result;
  } catch (error) {

    throw error;
  }
};

/**
 * Update label by ID
 */
/**
 * Update label by ID
 */
export const updateLabel = async (recordId: number, label: Partial<CampaignLabel>): Promise<CampaignLabel> => {
  try {
    // Construct Proxy Command
    const fullUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.CAMPAIGN_LABELS);
    const proxyBaseUrl = fullUrl.split('/api/v2')[0];
    const path = `/api/v2/tables/${NOCODB_CONFIG.TABLES.CAMPAIGN_LABELS}/records`;

    const payload = [{
      Id: recordId,
      ...label
    }];

    const response = await fetch(proxyBaseUrl, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({
        path: path,
        method: 'PATCH',
        data: payload
      }),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result[0] : result;
  } catch (error) {
    console.error('Error updating label:', error);
    throw error;
  }
};

/**
 * Delete label by ID
 */
export const deleteLabel = async (recordId: number): Promise<void> => {
  try {
    // Construct Proxy Command
    const fullUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.CAMPAIGN_LABELS);
    const proxyBaseUrl = fullUrl.split('/api/v2')[0];
    const path = `/api/v2/tables/${NOCODB_CONFIG.TABLES.CAMPAIGN_LABELS}/records`;

    const response = await fetch(proxyBaseUrl, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({
        path: path,
        method: 'DELETE',
        data: [{ Id: recordId }] // ✅ NocoDB expects Array for DELETE
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
  } catch (error) {
    console.error('Error deleting label:', error);
    throw error;
  }
};
