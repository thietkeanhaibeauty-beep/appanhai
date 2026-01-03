/**
 * VNPAY IPN (Instant Payment Notification) Handler
 * This endpoint is called by VNPAY after a payment is processed
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const VNP_HASH_SECRET = Deno.env.get('VNPAY_HASH_SECRET') || '';
const NOCODB_BASE_URL = Deno.env.get('NOCODB_BASE_URL') || 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = Deno.env.get('NOCODB_API_TOKEN') || '';
const PAYMENT_TABLE_ID = 'mlzf3x531jjw8eb';
const SUBSCRIPTION_TABLE_ID = 'mhanefxi3xtc4b3';
const PACKAGE_TABLE_ID = 'm7oivsc6c73wc3i';
const TOKEN_PACKAGES_TABLE_ID = 'mtalzi3mr80u6xu';
const USER_BALANCES_TABLE_ID = 'mbpatk8hctj9u1o';
const COIN_TRANSACTIONS_TABLE_ID = 'mai6u2tkuy7pumx';

function sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        sorted[key] = obj[key];
    }
    return sorted;
}

async function verifySecureHash(params: URLSearchParams, secureHash: string): Promise<boolean> {
    // Remove hash params for verification
    const verifyParams: Record<string, string> = {};
    params.forEach((value, key) => {
        if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
            verifyParams[key] = value;
        }
    });

    const sortedParams = sortObject(verifyParams);
    const signData = new URLSearchParams(sortedParams).toString();

    // Create HMAC SHA512
    const encoder = new TextEncoder();
    const key = encoder.encode(VNP_HASH_SECRET);
    const data = encoder.encode(signData);
    const hashBuffer = await crypto.subtle.importKey(
        'raw', key, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
    ).then(k => crypto.subtle.sign('HMAC', k, data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return calculatedHash.toLowerCase() === secureHash.toLowerCase();
}

async function activateSubscription(userId: string, packageId: string): Promise<boolean> {
    try {
        // Get package details
        const pkgResponse = await fetch(
            `${NOCODB_BASE_URL}/api/v2/tables/${PACKAGE_TABLE_ID}/records?where=(Id,eq,${packageId})`,
            {
                headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
            }
        );
        const pkgResult = await pkgResponse.json();
        const packageData = pkgResult.list?.[0];

        // ⚠️ CRITICAL FIX: Validate and sanitize duration_days
        let rawDurationDays = packageData?.duration_days;
        let durationDays = Number(rawDurationDays) || 30;

        console.log(`📅 Raw duration_days value: "${rawDurationDays}" (type: ${typeof rawDurationDays}) -> Parsed: ${durationDays}`);

        // 🛡️ VALIDATION: Cap duration at reasonable maximum (365 days = 1 year)
        if (durationDays > 365) {
            console.warn(`⚠️ SUSPICIOUS duration_days: ${durationDays} - capping to 30 days`);
            durationDays = 30;
        }
        if (durationDays <= 0) {
            console.warn(`⚠️ INVALID duration_days: ${durationDays} - defaulting to 30 days`);
            durationDays = 30;
        }

        // Calculate dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);

        console.log(`📅 Calculated dates: start=${startDate.toISOString()}, end=${endDate.toISOString()}, duration=${durationDays} days`);

        // Check existing subscription
        const existingResponse = await fetch(
            `${NOCODB_BASE_URL}/api/v2/tables/${SUBSCRIPTION_TABLE_ID}/records?where=(user_id,eq,${userId})~and(status,eq,active)&limit=1`,
            {
                headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
            }
        );
        const existingResult = await existingResponse.json();
        const existingSub = existingResult.list?.[0];

        if (existingSub) {
            // Extend existing subscription
            const currentEndDate = new Date(existingSub.end_date);
            const newEndDate = new Date(Math.max(currentEndDate.getTime(), startDate.getTime()));
            newEndDate.setDate(newEndDate.getDate() + durationDays);

            await fetch(
                `${NOCODB_BASE_URL}/api/v2/tables/${SUBSCRIPTION_TABLE_ID}/records/${existingSub.Id}`,
                {
                    method: 'PATCH',
                    headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        end_date: newEndDate.toISOString(),
                        package_id: packageId,
                    }),
                }
            );
            console.log(`✅ Extended subscription for user ${userId} to ${newEndDate.toISOString()}`);
        } else {
            // Create new subscription
            await fetch(
                `${NOCODB_BASE_URL}/api/v2/tables/${SUBSCRIPTION_TABLE_ID}/records`,
                {
                    method: 'POST',
                    headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        package_id: packageId,
                        status: 'active',
                        start_date: startDate.toISOString(),
                        end_date: endDate.toISOString(),
                        auto_renew: false,
                    }),
                }
            );
            console.log(`✅ Created new subscription for user ${userId}`);
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

Deno.serve(async (req) => {
    // Handle both GET (return URL) and POST (IPN)
    const url = new URL(req.url);
    const params = url.searchParams;

    // If no params in URL, try to get from body (POST)
    if (params.toString() === '' && req.method === 'POST') {
        try {
            const body = await req.text();
            const bodyParams = new URLSearchParams(body);
            bodyParams.forEach((value, key) => params.set(key, value));
        } catch {
            // Ignore body parse errors
        }
    }

    const vnpTxnRef = params.get('vnp_TxnRef') || '';
    const vnpResponseCode = params.get('vnp_ResponseCode') || '';
    const vnpTransactionNo = params.get('vnp_TransactionNo') || '';
    const vnpBankCode = params.get('vnp_BankCode') || '';
    const vnpAmount = params.get('vnp_Amount') || '';
    const vnpSecureHash = params.get('vnp_SecureHash') || '';

    console.log(`📥 VNPAY IPN received: TxnRef=${vnpTxnRef}, ResponseCode=${vnpResponseCode}`);

    // Verify hash
    const isValidHash = await verifySecureHash(params, vnpSecureHash);
    if (!isValidHash) {
        console.error('❌ Invalid secure hash');
        return new Response(JSON.stringify({ RspCode: '97', Message: 'Invalid Checksum' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Get payment record
    const paymentResponse = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${PAYMENT_TABLE_ID}/records?where=(order_id,eq,${vnpTxnRef})&limit=1`,
        {
            headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
        }
    );
    const paymentResult = await paymentResponse.json();
    const payment = paymentResult.list?.[0];

    if (!payment) {
        console.error('❌ Payment not found:', vnpTxnRef);
        return new Response(JSON.stringify({ RspCode: '01', Message: 'Order not found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Check if already processed
    if (payment.status === 'completed') {
        console.log('ℹ️ Payment already processed:', vnpTxnRef);
        return new Response(JSON.stringify({ RspCode: '02', Message: 'Order already confirmed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Verify amount
    const expectedAmount = Math.round(payment.amount * 100);
    if (parseInt(vnpAmount) !== expectedAmount) {
        console.error('❌ Amount mismatch:', vnpAmount, 'vs', expectedAmount);
        return new Response(JSON.stringify({ RspCode: '04', Message: 'Invalid Amount' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Update payment status
    const newStatus = vnpResponseCode === '00' ? 'completed' : 'failed';
    await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${PAYMENT_TABLE_ID}/records/${payment.Id}`,
        {
            method: 'PATCH',
            headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: newStatus,
                vnp_transaction_no: vnpTransactionNo,
                vnp_bank_code: vnpBankCode,
                vnp_response_code: vnpResponseCode,
                completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
            }),
        }
    );

    // Activate subscription or add tokens if successful
    if (vnpResponseCode === '00') {
        // Check if this is a token top-up payment (package_id starts with "token_")
        if (payment.package_id && payment.package_id.startsWith('token_')) {
            await addTokensToUser(payment.user_id, payment.package_id);
            console.log(`✅ Token top-up ${vnpTxnRef} completed - tokens added to user ${payment.user_id}`);
        } else {
            await activateSubscription(payment.user_id, payment.package_id);
            console.log(`✅ Payment ${vnpTxnRef} completed - subscription activated for user ${payment.user_id}`);
        }
    } else {
        console.log(`❌ Payment ${vnpTxnRef} failed with code ${vnpResponseCode}`);
    }

    return new Response(JSON.stringify({ RspCode: '00', Message: 'Confirm Success' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
});
