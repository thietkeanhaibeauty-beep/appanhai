import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export interface PaymentPackage {
  Id?: number;
  id?: string; // Mapped from Id for frontend compatibility
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_days: number;
  tokens?: number; // Số Token AI
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentPackageData {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  duration_days: number;
  tokens?: number; // Số Token AI
  features?: string[];
  is_active?: boolean;
}

const TABLE_ID = NOCODB_CONFIG.TABLES.PAYMENT_PACKAGES || 'payment_packages';

/**
 * Get all payment packages
 * @param includeInactive - If true, includes inactive packages (admin only)
 */
export const getPaymentPackages = async (includeInactive = false): Promise<PaymentPackage[]> => {
  try {
    let url = getNocoDBUrl(TABLE_ID);
    const params = new URLSearchParams();

    if (!includeInactive) {
      params.append('where', '(is_active,eq,true)');
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    const packages = result.list || [];

    // Parse features from JSON string to array if needed
    return packages.map((pkg: any) => {
      let features: string[] = [];

      if (Array.isArray(pkg.features)) {
        features = pkg.features as string[];
      } else if (typeof pkg.features === 'string') {
        const raw = pkg.features.trim();
        try {
          // Log raw data for debugging


          // First try to parse as standard JSON
          const parsed = JSON.parse(raw);
          features = Array.isArray(parsed) ? (parsed as string[]) : [];
        } catch (e) {
          // If parsing fails, log and try to fix common formats from NocoDB/Postgres
          console.warn(`⚠️ Failed to parse features for package ${pkg.Id}:`, raw);

          // Case 1: Postgres-style array with curly braces: {"a","b"}
          if ((raw.startsWith('{') && raw.endsWith('}'))) {
            try {
              const inner = raw.slice(1, -1); // remove {}
              // Extract quoted tokens or fallback to comma split
              const byRegex = Array.from(inner.matchAll(/"([^"\\]+)"/g)).map(m => m[1]);
              const items = byRegex.length > 0
                ? byRegex
                : inner.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
              features = items.filter(Boolean);

            } catch (pgErr) {
              console.error('❌ Postgres-style parsing failed:', pgErr);
              features = [];
            }
          }
          // Case 2: Single-quoted JSON-like array: ['a','b']
          else if (raw.includes("['") || raw.includes("']")) {
            try {
              const fixed = raw.replace(/'/g, '"');

              const parsed = JSON.parse(fixed);
              features = Array.isArray(parsed) ? (parsed as string[]) : [];

            } catch (fixError) {
              console.error('❌ Still failed after single-quote fix:', fixError);
              features = [];
            }
          }
          // Case 3: Comma-separated values without brackets: a,b,c
          else if (!raw.includes('[') && !raw.includes('{') && raw.includes(',')) {
            features = raw.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
          }
          else {
            features = [];
          }
        }
      }

      // Deduplicate & sanitize
      features = Array.from(new Set(features.filter(Boolean)));

      return {
        ...pkg,
        id: pkg.id || (pkg.Id ? String(pkg.Id) : undefined),
        features
      };
    });
  } catch (error) {
    console.error('❌ getPaymentPackages error:', error);
    return [];
  }
};

/**
 * Get a single payment package by ID
 */
export const getPaymentPackage = async (id: string): Promise<PaymentPackage> => {
  try {
    const response = await fetch(
      getNocoDBUrl(TABLE_ID, id),
      {
        method: 'GET',
        headers: await getNocoDBHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const pkg = await response.json();

    // Parse features from JSON string to array if needed
    let features = [];

    if (Array.isArray(pkg.features)) {
      features = pkg.features;
    } else if (typeof pkg.features === 'string') {
      try {
        const raw = pkg.features.trim();
        // Try JSON first
        const parsed = JSON.parse(raw);
        features = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        // Postgres-style: {"a","b"}
        const raw = (pkg.features || '').trim();
        if (raw.startsWith('{') && raw.endsWith('}')) {
          try {
            const inner = raw.slice(1, -1);
            const byRegex = Array.from(inner.matchAll(/"([^"\\]+)"/g)).map(m => m[1]);
            features = byRegex.length > 0 ? byRegex : inner.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
          } catch {
            features = [];
          }
        } else if (raw.includes("['") || raw.includes("']")) {
          // Single quotes array ['a','b']
          try {
            const fixed = raw.replace(/'/g, '"');
            const parsed = JSON.parse(fixed);
            features = Array.isArray(parsed) ? parsed : [];
          } catch {
            features = [];
          }
        } else if (!raw.includes('[') && !raw.includes('{') && raw.includes(',')) {
          features = raw.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        } else {
          features = [];
        }
      }
    }

    return {
      ...pkg,
      id: pkg.id || (pkg.Id ? String(pkg.Id) : undefined),
      features
    };
  } catch (error) {
    console.error('❌ getPaymentPackage error:', error);
    throw error;
  }
};

/**
 * Create a new payment package (Super Admin only)
 */
export const createPaymentPackage = async (
  packageData: CreatePaymentPackageData
): Promise<PaymentPackage> => {
  try {
    const response = await fetch(
      getNocoDBUrl(TABLE_ID),
      {
        method: 'POST',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify({
          ...packageData,
          currency: packageData.currency || 'VND',
          features: JSON.stringify(packageData.features || []), // Convert to JSON string
          is_active: packageData.is_active ?? true
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();

    // Parse features back to array
    return {
      ...result,
      id: result.id || (result.Id ? String(result.Id) : undefined),
      features: typeof result.features === 'string'
        ? JSON.parse(result.features)
        : (Array.isArray(result.features) ? result.features : [])
    };
  } catch (error) {
    console.error('❌ createPaymentPackage error:', error);
    throw error;
  }
};

/**
 * Update a payment package (Super Admin only)
 */
export const updatePaymentPackage = async (
  id: string,
  packageData: Partial<CreatePaymentPackageData>
): Promise<PaymentPackage> => {
  try {
    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${TABLE_ID}/records`;

    // Prepare data with features as JSON string if present
    const dataToSend: any = { ...packageData, Id: parseInt(id) };
    if (packageData.features !== undefined) {
      dataToSend.features = JSON.stringify(packageData.features);
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify(dataToSend)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Update failed:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // Parse features back to array
    return {
      ...result,
      id: result.id || (result.Id ? String(result.Id) : undefined),
      features: typeof result.features === 'string'
        ? JSON.parse(result.features)
        : (Array.isArray(result.features) ? result.features : [])
    };
  } catch (error) {
    console.error('❌ updatePaymentPackage error:', error);
    throw error;
  }
};

/**
 * Delete a payment package (Super Admin only)
 */
export const deletePaymentPackage = async (id: string): Promise<void> => {
  try {
    // Construct Proxy Command
    const proxyBaseUrl = NOCODB_CONFIG.BASE_URL;
    const path = `/api/v2/tables/${TABLE_ID}/records`;

    const response = await fetch(proxyBaseUrl, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({
        path: path,
        method: 'DELETE',
        data: [{ Id: parseInt(id) }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Delete failed:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }


  } catch (error) {
    console.error('❌ deletePaymentPackage error:', error);
    throw error;
  }
};