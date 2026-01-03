import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'stripe' | 'vnpay' | 'bank_transfer';

export interface PaymentTransaction {
  Id?: number;
  order_id: string;           // Unique order ID for VNPAY (vnp_TxnRef)
  user_id: string;
  package_id: string;         // Package being purchased
  subscription_id?: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_gateway_id?: string;
  vnp_transaction_no?: string; // VNPAY transaction number
  vnp_bank_code?: string;      // Bank used for payment
  vnp_response_code?: string;  // Response code from VNPAY
  status: PaymentStatus;
  created_at?: string;
  completed_at?: string;
}

const TABLE_ID = NOCODB_CONFIG.TABLES.PAYMENT_TRANSACTIONS || 'payment_transactions';

/**
 * Create payment transaction
 */
export const createTransaction = async (
  data: Omit<PaymentTransaction, 'Id' | 'created_at'>
): Promise<PaymentTransaction> => {
  try {
    const response = await fetch(
      getNocoDBUrl(TABLE_ID),
      {
        method: 'POST',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify({
          ...data,
          currency: data.currency || 'VND'
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ createTransaction error:', error);
    throw error;
  }
};

/**
 * Get transaction by ID
 */
export const getTransaction = async (transactionId: number): Promise<PaymentTransaction | null> => {
  try {
    const response = await fetch(
      getNocoDBUrl(TABLE_ID, String(transactionId)),
      {
        method: 'GET',
        headers: await getNocoDBHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ getTransaction error:', error);
    return null;
  }
};

/**
 * Get user's transactions
 */
export const getUserTransactions = async (
  userId: string,
  limit = 50
): Promise<PaymentTransaction[]> => {
  try {
    const response = await fetch(
      `${getNocoDBUrl(TABLE_ID)}?where=(user_id,eq,${userId})&limit=${limit}&sort=-created_at`,
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
    console.error('❌ getUserTransactions error:', error);
    return [];
  }
};

/**
 * Update transaction status
 */
export const updateTransactionStatus = async (
  transactionId: number,
  status: PaymentStatus,
  gatewayId?: string
): Promise<PaymentTransaction> => {
  try {
    const updates: any = { status };

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    if (gatewayId) {
      updates.payment_gateway_id = gatewayId;
    }

    const response = await fetch(
      getNocoDBUrl(TABLE_ID, String(transactionId)),
      {
        method: 'PATCH',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify(updates)
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ updateTransactionStatus error:', error);
    throw error;
  }
};

/**
 * Get pending transactions
 */
export const getPendingTransactions = async (): Promise<PaymentTransaction[]> => {
  try {
    const response = await fetch(
      `${getNocoDBUrl(TABLE_ID)}?where=(status,eq,pending)&sort=-created_at`,
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
    console.error('❌ getPendingTransactions error:', error);
    return [];
  }
};

/**
 * Get payment by order_id (for VNPAY callback)
 */
export const getPaymentByOrderId = async (orderId: string): Promise<PaymentTransaction | null> => {
  try {
    const url = `${getNocoDBUrl(TABLE_ID)}?where=(order_id,eq,${orderId})&limit=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders()
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    return result.list?.[0] || null;
  } catch (error) {
    console.error('❌ getPaymentByOrderId error:', error);
    return null;
  }
};

/**
 * Update payment by order_id
 */
export const updatePaymentByOrderId = async (
  orderId: string,
  data: Partial<PaymentTransaction>
): Promise<PaymentTransaction | null> => {
  try {
    const existing = await getPaymentByOrderId(orderId);
    if (!existing || !existing.Id) return null;

    const response = await fetch(
      getNocoDBUrl(TABLE_ID, String(existing.Id)),
      {
        method: 'PATCH',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify(data)
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ updatePaymentByOrderId error:', error);
    return null;
  }
};

/**
 * Generate unique order ID for VNPAY
 */
export const generateOrderId = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${timestamp}${random}`;
};
