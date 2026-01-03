import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'trial';

export interface UserSubscription {
  Id?: number;
  user_id: string;
  package_id: string;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
}

const TABLE_ID = NOCODB_CONFIG.TABLES.USER_SUBSCRIPTIONS || 'user_subscriptions';

/**
 * Get active or trial subscription for user
 * Finds any subscription that is active or trial status
 */
export const getActiveSubscription = async (userId: string): Promise<UserSubscription | null> => {
  try {
    // Find subscription with status 'active' OR 'trial' - prevents duplicates
    // Using separate queries since NocoDB OR syntax can be tricky
    let subscription = null;

    // First try to find active subscription
    const activeWhere = `(user_id,eq,${userId})~and(status,eq,active)`;
    const activeUrl = `${getNocoDBUrl(TABLE_ID)}?where=${encodeURIComponent(activeWhere)}&limit=1&sort=-CreatedAt`;
    const activeResponse = await fetch(activeUrl, {
      method: 'GET',
      headers: await getNocoDBHeaders()
    });

    if (activeResponse.ok) {
      const activeResult = await activeResponse.json();
      subscription = activeResult.list?.[0] || null;
    }

    // If no active, try to find trial subscription
    if (!subscription) {
      const trialWhere = `(user_id,eq,${userId})~and(status,eq,trial)`;
      const trialUrl = `${getNocoDBUrl(TABLE_ID)}?where=${encodeURIComponent(trialWhere)}&limit=1&sort=-CreatedAt`;
      const trialResponse = await fetch(trialUrl, {
        method: 'GET',
        headers: await getNocoDBHeaders()
      });

      if (trialResponse.ok) {
        const trialResult = await trialResponse.json();
        subscription = trialResult.list?.[0] || null;
      }
    }

    return subscription;
  } catch (error) {
    console.error('❌ getActiveSubscription error:', error);
    return null;
  }
};

/**
 * Get all subscriptions for user
 */
export const getUserSubscriptions = async (userId: string): Promise<UserSubscription[]> => {
  try {
    const where = `(user_id,eq,${userId})`;
    const response = await fetch(
      `${getNocoDBUrl(TABLE_ID)}?where=${encodeURIComponent(where)}&sort=-CreatedAt&limit=10`,
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
    console.error('❌ getUserSubscriptions error:', error);
    throw error;
  }
};

/**
 * Get ALL active subscriptions for user (for multiple packages display)
 */
export const getAllActiveSubscriptions = async (userId: string): Promise<UserSubscription[]> => {
  try {
    const where = `(user_id,eq,${userId})~and(status,eq,active)`;
    const response = await fetch(
      `${getNocoDBUrl(TABLE_ID)}?where=${encodeURIComponent(where)}&sort=-CreatedAt&limit=10`,
      {
        method: 'GET',
        headers: await getNocoDBHeaders()
      }
    );

    if (!response.ok) {
      console.error('❌ getAllActiveSubscriptions HTTP error:', response.status);
      return [];
    }

    const result = await response.json();
    return result.list || [];
  } catch (error) {
    console.error('❌ getAllActiveSubscriptions error:', error);
    return [];
  }
};

/**
 * Create subscription AND auto-add tokens from package
 */
export const createSubscription = async (
  data: Omit<UserSubscription, 'Id' | 'CreatedAt' | 'UpdatedAt'>
): Promise<UserSubscription> => {
  try {
    // 1. Create subscription record
    const response = await fetch(
      getNocoDBUrl(TABLE_ID),
      {
        method: 'POST',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify(data)
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const subscription = await response.json();

    // 2. Auto-add tokens from package configuration
    try {
      const { getPaymentPackages } = await import('./paymentPackagesService');
      const { addCoins } = await import('./userBalancesService');

      const allPackages = await getPaymentPackages(true);
      const targetPackage = allPackages.find((p: any) =>
        p.name === data.package_id || p.name?.toLowerCase() === data.package_id.toLowerCase()
      );

      const tokens = targetPackage?.tokens || (targetPackage as any)?.Tokens || 0;

      if (tokens > 0) {
        await addCoins(data.user_id, tokens);
      }
    } catch (tokenError) {
      console.warn('⚠️ Error adding tokens (subscription still created):', tokenError);
      // Don't throw - subscription was created successfully, token addition is secondary
    }

    return subscription;
  } catch (error) {
    console.error('❌ createSubscription error:', error);
    throw error;
  }
};

/**
 * Update subscription status
 */
export const updateSubscriptionStatus = async (
  subscriptionId: number,
  status: SubscriptionStatus
): Promise<UserSubscription> => {
  try {
    const response = await fetch(
      getNocoDBUrl(TABLE_ID, String(subscriptionId)),
      {
        method: 'PATCH',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify({
          status,
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ updateSubscriptionStatus error:', error);
    throw error;
  }
};

/**
 * Check if user has active subscription
 */
export const hasActiveSubscription = async (userId: string): Promise<boolean> => {
  const subscription = await getActiveSubscription(userId);

  if (!subscription) return false;

  // Check if not expired
  const now = new Date();
  const endDate = new Date(subscription.end_date);

  return subscription.status === 'active' && endDate > now;
};

/**
 * Expire old subscriptions (run periodically)
 */
export const expireOldSubscriptions = async (): Promise<number> => {
  try {
    const now = new Date().toISOString();

    // Get all active subscriptions that have passed end_date
    const where = `(status,eq,active)~and(end_date,lt,${now})`;
    const response = await fetch(
      `${getNocoDBUrl(TABLE_ID)}?where=${encodeURIComponent(where)}`,
      {
        method: 'GET',
        headers: await getNocoDBHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    const expired = result.list || [];

    // Update each to expired status
    for (const sub of expired) {
      await updateSubscriptionStatus(sub.Id, 'expired');
    }


    return expired.length;
  } catch (error) {
    console.error('❌ expireOldSubscriptions error:', error);
    return 0;
  }
};
