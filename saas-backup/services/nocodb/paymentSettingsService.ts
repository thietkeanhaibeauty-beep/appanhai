import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export interface PaymentSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

const TABLE_ID = NOCODB_CONFIG.TABLES.PAYMENT_SETTINGS || 'payment_settings';

/**
 * Get all payment settings (Super Admin only)
 */
export const getPaymentSettings = async (): Promise<PaymentSetting[]> => {
  try {
    const response = await fetch(
      `${getNocoDBUrl(TABLE_ID)}?sort=setting_key`,
      {
        method: 'GET',
        headers: await getNocoDBHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    return result.list || [];
  } catch (error) {
    console.error('❌ getPaymentSettings error:', error);
    return [];
  }
};

/**
 * Get a specific payment setting by key
 */
export const getPaymentSetting = async (key: string): Promise<string | null> => {
  try {
    const response = await fetch(
      `${getNocoDBUrl(TABLE_ID)}?where=(setting_key,eq,${key})&limit=1`,
      {
        method: 'GET',
        headers: await getNocoDBHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    return result.list?.[0]?.setting_value || null;
  } catch (error) {
    console.error('❌ getPaymentSetting error:', error);
    return null;
  }
};

/**
 * Update or create a payment setting
 */
export const updatePaymentSetting = async (
  key: string,
  value: string,
  description?: string
): Promise<void> => {
  try {
    // Check if exists
    const existing = await fetch(
      `${getNocoDBUrl(TABLE_ID)}?where=(setting_key,eq,${key})&limit=1`,
      {
        method: 'GET',
        headers: await getNocoDBHeaders()
      }
    );

    const existingResult = await existing.json();
    const existingRecord = existingResult.list?.[0];

    if (existingRecord) {
      // Update
      await fetch(
        getNocoDBUrl(TABLE_ID, String(existingRecord.Id)),
        {
          method: 'PATCH',
          headers: await getNocoDBHeaders(),
          body: JSON.stringify({
            setting_value: value,
            description,
            updated_at: new Date().toISOString()
          })
        }
      );
    } else {
      // Create
      await fetch(
        getNocoDBUrl(TABLE_ID),
        {
          method: 'POST',
          headers: await getNocoDBHeaders(),
          body: JSON.stringify({
            setting_key: key,
            setting_value: value,
            description
          })
        }
      );
    }


  } catch (error) {
    console.error('❌ updatePaymentSetting error:', error);
    throw error;
  }
};

/**
 * Delete a payment setting
 */
export const deletePaymentSetting = async (key: string): Promise<void> => {
  try {
    // Find record first
    const response = await fetch(
      `${getNocoDBUrl(TABLE_ID)}?where=(setting_key,eq,${key})&limit=1`,
      {
        method: 'GET',
        headers: await getNocoDBHeaders()
      }
    );

    const result = await response.json();
    const record = result.list?.[0];

    if (!record) {
      throw new Error(`Setting ${key} not found`);
    }

    // Construct Proxy Command
    const fullUrl = getNocoDBUrl(TABLE_ID);
    const proxyBaseUrl = fullUrl.split('/api/v2')[0];
    const path = `/api/v2/tables/${TABLE_ID}/records`;

    await fetch(proxyBaseUrl, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({
        path: path,
        method: 'DELETE',
        data: [{ Id: record.Id }]
      }),
    });


  } catch (error) {
    console.error('❌ deletePaymentSetting error:', error);
    throw error;
  }
};