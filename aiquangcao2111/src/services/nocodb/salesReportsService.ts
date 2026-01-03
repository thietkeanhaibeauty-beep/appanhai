import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export interface SalesReport {
  Id?: number;
  phone_number: string;
  appointment_status: string;
  appointment_time: string | null;
  completed_at?: string | null; // ✨ NEW: Thời gian chốt đơn
  service_name: string | null;
  service_revenue: number;
  total_revenue: number;
  notes: string | null;
  campaign_name: string | null;
  campaign_results: number;
  campaign_id?: string; // ✨ Link to Facebook campaign
  adset_id?: string; // ✨ Link to Facebook adset
  ad_id?: string; // ✨ Link to Facebook ad
  ad_date?: string; // Date of the ad that generated this lead (YYYY-MM-DD)
  report_date?: string; // Date for aggregation (ISO date string)
  user_id: string;
  CreatedAt?: string; // NocoDB auto-generated (Ngày tạo)
  UpdatedAt?: string; // NocoDB auto-generated (Ngày cập nhật)
}

interface NocoDBListResponse {
  list: SalesReport[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

/**
 * Get all sales reports for a user
 * @param userId - user ID to filter by
 * @param startDate - optional start date (YYYY-MM-DD format) to filter by CreatedAt
 * @param endDate - optional end date (YYYY-MM-DD format) to filter by CreatedAt
 */
export const getSalesReports = async (userId: string, startDate?: string, endDate?: string): Promise<SalesReport[]> => {
  try {
    const whereClause = `(user_id,eq,${userId})`;

    const encodedWhere = encodeURIComponent(whereClause);
    // ✅ FIX: Use user_id filter only in API to avoid 422 on date format
    // Re-added sort=-CreatedAt as debug confirmed it works when date filter is removed
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.SALES_REPORTS)}?where=${encodedWhere}&limit=1000&sort=-CreatedAt`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      // Log detailed error from body like automatedRulesService
      const errorText = await response.text();
      console.error('❌ NocoDB API Error:', errorText);
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    const data: NocoDBListResponse = await response.json();
    let records = data.list || [];

    // ✅ Filter by date range on client side (CreatedAt field)
    // This ensures phone data matches the selected date range in Ads Report
    if (startDate || endDate) {
      const startMs = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : 0;
      const endMs = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Date.now();

      records = records.filter(record => {
        // Use CreatedAt as the primary date field for filtering
        const recordDate = record.CreatedAt ? new Date(record.CreatedAt).getTime() : 0;
        return recordDate >= startMs && recordDate <= endMs;
      });
    }

    return records;
  } catch (error) {
    console.error('Error fetching sales reports from NocoDB:', error);
    throw error;
  }
};


/**
 * Create a new sales report
 */
export const createSalesReport = async (report: Partial<SalesReport>): Promise<SalesReport> => {
  try {
    const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.SALES_REPORTS);

    const response = await fetch(url, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify(report),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ NocoDB Error (${response.status}):`, errorText);
      console.error('Payload sent:', JSON.stringify(report, null, 2));
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating sales report:', error);
    throw error;
  }
};

/**
 * Update a sales report
 * ✅ FIX: Use Proxy Command Pattern
 */
export const updateSalesReport = async (id: number, report: Partial<SalesReport>): Promise<SalesReport> => {
  try {
    // Construct Proxy Command
    const fullUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.SALES_REPORTS);
    const proxyBaseUrl = fullUrl.split('/api/v2')[0];
    const path = `/api/v2/tables/${NOCODB_CONFIG.TABLES.SALES_REPORTS}/records`;

    const payload = [{
      Id: id,
      ...report
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
      const errorText = await response.text();
      console.error(`❌ Update failed for ID ${id}:`, errorText);
      throw new Error(`NocoDB API error: ${response.status}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result[0] : result;
  } catch (error) {
    console.error('Error updating sales report:', error);
    throw error;
  }
};

/**
 * Delete a sales report
 * ✅ FIX: Use Proxy Command Pattern
 */
export const deleteSalesReport = async (id: number): Promise<void> => {
  try {
    // Construct Proxy Command
    const fullUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.SALES_REPORTS);
    const proxyBaseUrl = fullUrl.split('/api/v2')[0];
    const path = `/api/v2/tables/${NOCODB_CONFIG.TABLES.SALES_REPORTS}/records`;

    const response = await fetch(proxyBaseUrl, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({
        path: path,
        method: 'DELETE',
        data: [{ Id: id }] // ✅ NocoDB expects Array for DELETE
      }),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting sales report:', error);
    throw error;
  }
};
