/**
 * Web2M Webhook Handler
 * 
 * Receives bank transaction notifications from Web2M.
 * When a payment is received, it automatically activates the subscription.
 * 
 * Web2M Webhook Payload:
 * {
 *   "status": true,
 *   "data": [
 *     {
 *       "id": "753632",
 *       "type": "IN",
 *       "transactionID": "24213",
 *       "amount": "100000",
 *       "description": "NAP14838 GD 941234-010624",
 *       "date": "01/04/2024",
 *       "bank": "ACB"
 *     }
 *   ]
 * }
 * 
 * Required Response: { "status": true, "msg": "Ok" }
 * Authorization: Bearer Token in header
 * Timeout: Must respond within 5 seconds
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const NOCODB_BASE_URL = Deno.env.get('NOCODB_BASE_URL') || 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = Deno.env.get('NOCODB_API_TOKEN') || '';
const WEB2M_ACCESS_TOKEN = Deno.env.get('WEB2M_ACCESS_TOKEN') || '';

// Table IDs
const PAYMENT_TABLE_ID = 'mjlq3evtb8n7g08';
const SUBSCRIPTION_TABLE_ID = 'mhanefxi3xtc4b3';
const PACKAGE_TABLE_ID = 'm7oivsc6c73wc3i';
const TOKEN_PACKAGES_TABLE_ID = 'mtalzi3mr80u6xu';
const USER_BALANCES_TABLE_ID = 'mbpatk8hctj9u1o';
const COIN_TRANSACTIONS_TABLE_ID = 'mai6u2tkuy7pumx';

interface Web2MTransaction {
    id: string;
    type: 'IN' | 'OUT';
    transactionID: string;
    amount: string;
    description: string;
    date: string;
    bank: string;
}

interface Web2MWebhookPayload {
    status: boolean;
    data: Web2MTransaction[];
}

async function findMatchingPayment(description: string, amount: number): Promise<any | null> {
    try {
        // Get all pending payments
        const url = `${NOCODB_BASE_URL}/api/v2/tables/${PAYMENT_TABLE_ID}/records?where=(status,eq,pending)&limit=50`;
        console.log('🔍 Fetching pending payments from:', url);
        console.log('🔑 Token present:', !!NOCODB_API_TOKEN, 'Length:', NOCODB_API_TOKEN?.length);

        const response = await fetch(url, {
            headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
        });

        console.log('📡 NocoDB response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Failed to fetch pending payments:', response.status, errorText);
            return null;
        }

        const result = await response.json();
        const payments = result.list || [];
        console.log('📋 Found pending payments:', payments.length);


        // Normalize description for matching
        const descUpper = description.toUpperCase().replace(/\s+/g, '');

        for (const payment of payments) {
            const orderId = (payment.order_id || '').toUpperCase();

            // Check if order_id is in description and amount matches (with 1% tolerance)
            if (orderId && descUpper.includes(orderId) &&
                amount >= payment.amount * 0.99) {
                return payment;
            }
        }

        return null;
    } catch (error) {
        console.error('Error finding matching payment:', error);
        return null;
    }
}

async function activateSubscription(userId: string, packageId: string): Promise<boolean> {
    try {
        console.log(`📦 Activating subscription - User: ${userId}, Package: ${packageId}`);

        // Get package details - try by Id first, then by name
        let packageData = null;

        // Try lookup by numeric Id first
        const pkgByIdResponse = await fetch(
            `${NOCODB_BASE_URL}/api/v2/tables/${PACKAGE_TABLE_ID}/records?where=(Id,eq,${packageId})&limit=1`,
            {
                headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
            }
        );
        const pkgByIdResult = await pkgByIdResponse.json();
        packageData = pkgByIdResult.list?.[0];

        // If not found by Id, try by name
        if (!packageData) {
            console.log(`⚠️ Package not found by Id, trying by name: ${packageId}`);
            const pkgByNameResponse = await fetch(
                `${NOCODB_BASE_URL}/api/v2/tables/${PACKAGE_TABLE_ID}/records?where=(name,eq,${packageId})&limit=1`,
                {
                    headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
                }
            );
            const pkgByNameResult = await pkgByNameResponse.json();
            packageData = pkgByNameResult.list?.[0];
        }

        console.log(`📦 Package data:`, JSON.stringify(packageData));

        // ⚠️ CRITICAL FIX: Validate and sanitize duration_days
        let rawDurationDays = packageData?.duration_days;
        let durationDays = Number(rawDurationDays) || 30;

        // Log raw value for debugging
        console.log(`📅 Raw duration_days value: "${rawDurationDays}" (type: ${typeof rawDurationDays}) -> Parsed: ${durationDays}`);

        // 🛡️ VALIDATION: Cap duration at reasonable maximum (365 days = 1 year)
        // If duration is suspiciously high (>365), it's likely a bug - default to 30 days
        if (durationDays > 365) {
            console.warn(`⚠️ SUSPICIOUS duration_days: ${durationDays} - capping to 30 days (likely data error)`);
            durationDays = 30;
        }
        if (durationDays <= 0) {
            console.warn(`⚠️ INVALID duration_days: ${durationDays} - defaulting to 30 days`);
            durationDays = 30;
        }

        const packageName = packageData?.name || packageId;
        const packageTokens = Number(packageData?.tokens) || 0;

        console.log(`📦 Package: ${packageName}, Duration: ${durationDays} days, Tokens: ${packageTokens}`);

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);

        console.log(`📅 Calculated dates: start=${startDate.toISOString()}, end=${endDate.toISOString()}, duration=${durationDays} days`);

        // Check existing subscription for this user (ANY status - not just active)
        // This prevents duplicates and ensures we update instead of create
        const existingResponse = await fetch(
            `${NOCODB_BASE_URL}/api/v2/tables/${SUBSCRIPTION_TABLE_ID}/records?where=(user_id,eq,${userId})&sort=-CreatedAt&limit=1`,
            {
                headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
            }
        );
        const existingResult = await existingResponse.json();
        const existingSub = existingResult.list?.[0];
        console.log(`📋 Existing subscription:`, JSON.stringify(existingSub));

        if (existingSub) {
            console.log(`📝 Existing subscription found: ${existingSub.Id}, updating to ${packageName}...`);

            // Update subscription with new package and dates
            const patchResponse = await fetch(
                `${NOCODB_BASE_URL}/api/v2/tables/${SUBSCRIPTION_TABLE_ID}/records`,
                {
                    method: 'PATCH',
                    headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        Id: existingSub.Id,
                        package_id: packageName,
                        status: 'active',
                        start_date: startDate.toISOString(),
                        end_date: endDate.toISOString(),
                    }),
                }
            );

            if (!patchResponse.ok) {
                const errorText = await patchResponse.text();
                console.error(`❌ Failed to update subscription: ${patchResponse.status}`, errorText);
            } else {
                console.log(`✅ Updated subscription to ${packageName}: ${startDate.toISOString()} - ${endDate.toISOString()}`);
            }
        } else {
            console.log(`📝 No existing ${packageName} subscription, creating new one`);

            // Create new subscription
            await fetch(
                `${NOCODB_BASE_URL}/api/v2/tables/${SUBSCRIPTION_TABLE_ID}/records`,
                {
                    method: 'POST',
                    headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        package_id: packageName,
                        status: 'active',
                        start_date: startDate.toISOString(),
                        end_date: endDate.toISOString(),
                        auto_renew: false,
                    }),
                }
            );
            console.log(`✅ Created subscription for user ${userId}, package: ${packageName}`);
        }

        // ✅ ADD TOKENS FROM PACKAGE TO USER BALANCE
        if (packageTokens > 0) {
            console.log(`💰 Adding ${packageTokens} tokens from package ${packageName} to user ${userId}`);

            // Get or create user balance
            const balanceResponse = await fetch(
                `${NOCODB_BASE_URL}/api/v2/tables/${USER_BALANCES_TABLE_ID}/records?where=(user_id,eq,${userId})&limit=1`,
                {
                    headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
                }
            );
            const balanceResult = await balanceResponse.json();
            const userBalance = balanceResult.list?.[0];

            if (!userBalance) {
                // Create new balance record
                await fetch(
                    `${NOCODB_BASE_URL}/api/v2/tables/${USER_BALANCES_TABLE_ID}/records`,
                    {
                        method: 'POST',
                        headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: userId,
                            balance: packageTokens,
                            total_deposited: packageTokens,
                            total_spent: 0,
                        }),
                    }
                );
                console.log(`✅ Created balance with ${packageTokens} tokens for user ${userId}`);
            } else {
                // Update existing balance
                const currentBalance = Number(userBalance.balance) || 0;
                const currentTotalDeposited = Number(userBalance.total_deposited) || 0;
                const newBalance = currentBalance + packageTokens;
                const newTotalDeposited = currentTotalDeposited + packageTokens;

                await fetch(
                    `${NOCODB_BASE_URL}/api/v2/tables/${USER_BALANCES_TABLE_ID}/records`,
                    {
                        method: 'PATCH',
                        headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
                        body: JSON.stringify([{
                            Id: userBalance.Id,
                            balance: newBalance,
                            total_deposited: newTotalDeposited,
                        }]),
                    }
                );
                console.log(`✅ Updated balance: ${currentBalance} + ${packageTokens} = ${newBalance} for user ${userId}`);
            }

            // Record the transaction
            await fetch(
                `${NOCODB_BASE_URL}/api/v2/tables/${COIN_TRANSACTIONS_TABLE_ID}/records`,
                {
                    method: 'POST',
                    headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        type: 'deposit',
                        amount: packageTokens,
                        description: `Gói ${packageName}: +${packageTokens.toLocaleString()} tokens`,
                        reference_id: `subscription_${packageName}`,
                        created_at: new Date().toISOString(),
                    }),
                }
            );
            console.log(`✅ Recorded token deposit for user ${userId}`);
        } else {
            console.log(`ℹ️ Package ${packageName} has no tokens configured`);
        }

        return true;
    } catch (error) {
        console.error('❌ Failed to activate subscription:', error);
        return false;
    }
}

/**
 * Add tokens/coins to user balance for Token Top-up payments
 * @param userId - The user ID
 * @param packageId - Format: "token_123" where 123 is the token package Id
 */
async function addTokensToUser(userId: string, packageId: string): Promise<boolean> {
    try {
        // Extract token package ID from "token_123" format
        const tokenPackageIdStr = packageId.replace('token_', '');
        const tokenPackageId = parseInt(tokenPackageIdStr, 10);

        if (isNaN(tokenPackageId)) {
            console.error('❌ Invalid token package ID:', packageId);
            return false;
        }

        // Get token package details
        const pkgResponse = await fetch(
            `${NOCODB_BASE_URL}/api/v2/tables/${TOKEN_PACKAGES_TABLE_ID}/records?where=(Id,eq,${tokenPackageId})&limit=1`,
            {
                headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
            }
        );
        const pkgResult = await pkgResponse.json();
        const tokenPackage = pkgResult.list?.[0];

        if (!tokenPackage) {
            console.error('❌ Token package not found:', tokenPackageId);
            return false;
        }

        const tokensToAdd = Number(tokenPackage.tokens) || 0;
        console.log(`📦 Adding ${tokensToAdd} tokens to user ${userId}`);

        // Get or create user balance
        let balanceResponse = await fetch(
            `${NOCODB_BASE_URL}/api/v2/tables/${USER_BALANCES_TABLE_ID}/records?where=(user_id,eq,${userId})&limit=1`,
            {
                headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
            }
        );
        let balanceResult = await balanceResponse.json();
        let userBalance = balanceResult.list?.[0];

        if (!userBalance) {
            // Create new balance record
            const createResponse = await fetch(
                `${NOCODB_BASE_URL}/api/v2/tables/${USER_BALANCES_TABLE_ID}/records`,
                {
                    method: 'POST',
                    headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        balance: tokensToAdd,
                        total_deposited: tokensToAdd,
                        total_spent: 0,
                    }),
                }
            );
            if (!createResponse.ok) {
                console.error('❌ Failed to create user balance');
                return false;
            }
            userBalance = await createResponse.json();
            console.log(`✅ Created new balance for user ${userId} with ${tokensToAdd} tokens`);
        } else {
            // Update existing balance - use array format for NocoDB API v2
            // ✅ FIX: Convert to Number to avoid string concatenation bug
            const currentBalance = Number(userBalance.balance) || 0;
            const currentTotalDeposited = Number(userBalance.total_deposited) || 0;
            const newBalance = currentBalance + tokensToAdd;
            const newTotalDeposited = currentTotalDeposited + tokensToAdd;

            const updateResponse = await fetch(
                `${NOCODB_BASE_URL}/api/v2/tables/${USER_BALANCES_TABLE_ID}/records`,
                {
                    method: 'PATCH',
                    headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
                    body: JSON.stringify([{
                        Id: userBalance.Id,
                        balance: newBalance,
                        total_deposited: newTotalDeposited,
                    }]),
                }
            );
            if (!updateResponse.ok) {
                console.error('❌ Failed to update user balance');
                return false;
            }
            console.log(`✅ Updated balance for user ${userId}: ${userBalance.balance} + ${tokensToAdd} = ${newBalance}`);
        }

        // Record the transaction
        await fetch(
            `${NOCODB_BASE_URL}/api/v2/tables/${COIN_TRANSACTIONS_TABLE_ID}/records`,
            {
                method: 'POST',
                headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    type: 'deposit',
                    amount: tokensToAdd,
                    description: `Nạp ${tokensToAdd.toLocaleString()} coin từ Token Package #${tokenPackageId}`,
                    reference_id: packageId,
                    created_at: new Date().toISOString(),
                }),
            }
        );
        console.log(`✅ Recorded deposit transaction for user ${userId}`);

        return true;
    } catch (error) {
        console.error('❌ Failed to add tokens to user:', error);
        return false;
    }
}

async function updatePaymentStatus(paymentId: number, transaction: Web2MTransaction): Promise<void> {
    console.log(`📝 Updating payment ${paymentId} to completed...`);

    // NocoDB v2 API: PATCH /records with Id in body (not in URL)
    const response = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${PAYMENT_TABLE_ID}/records`,
        {
            method: 'PATCH',
            headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Id: paymentId,
                status: 'completed',
                payment_gateway_id: String(transaction.transactionID),
                vnp_bank_code: transaction.bank || '',
                vnp_transaction_no: String(transaction.id),
                completed_at: new Date().toISOString(),
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to update payment status: ${response.status}`, errorText);
    } else {
        console.log(`✅ Payment ${paymentId} marked as completed`);
    }
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Verify Bearer Token if configured
        if (WEB2M_ACCESS_TOKEN) {
            const authHeader = req.headers.get('authorization');
            const expectedAuth = `Bearer ${WEB2M_ACCESS_TOKEN}`;

            if (!authHeader || authHeader !== expectedAuth) {
                console.error('❌ Invalid or missing Authorization header');
                return new Response(
                    JSON.stringify({ status: false, msg: 'Unauthorized' }),
                    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        const payload: Web2MWebhookPayload = await req.json();

        console.log('📥 Web2M Webhook received:', JSON.stringify(payload, null, 2));

        if (!payload.status || !payload.data || !Array.isArray(payload.data)) {
            console.log('⚠️ Invalid webhook payload structure');
            return new Response(
                JSON.stringify({ status: true, msg: 'Invalid payload' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Process each transaction
        for (const tx of payload.data) {
            // Only process incoming transfers
            if (tx.type !== 'IN') {
                console.log(`ℹ️ Skipping non-incoming transaction: ${tx.id}`);
                continue;
            }

            const amount = parseFloat(tx.amount) || 0;

            // Find matching pending payment
            const payment = await findMatchingPayment(tx.description, amount);

            if (!payment) {
                console.log(`⚠️ No matching payment for tx ${tx.id}: "${tx.description}"`);
                continue;
            }

            console.log(`✅ Matched payment ${payment.order_id} with tx ${tx.id}`);
            console.log('📦 Payment object:', JSON.stringify(payment, null, 2));

            // Update payment status
            await updatePaymentStatus(payment.Id, tx);

            // Check if this is a token top-up payment (package_id starts with "token_")
            if (payment.package_id && payment.package_id.startsWith('token_')) {
                await addTokensToUser(payment.user_id, payment.package_id);
                console.log(`✅ Token top-up ${payment.order_id} completed - tokens added to user ${payment.user_id}`);
            } else {
                await activateSubscription(payment.user_id, payment.package_id);
                console.log(`✅ Subscription activated for user ${payment.user_id}`);
            }

            console.log(`✅ Payment ${payment.order_id} completed via Web2M webhook`);
        }

        // Web2M requires this exact response format
        return new Response(
            JSON.stringify({ status: true, msg: 'Ok' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('❌ Webhook error:', error);
        // Still return success to prevent Web2M from retrying indefinitely
        return new Response(
            JSON.stringify({ status: true, msg: 'Error processed' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
