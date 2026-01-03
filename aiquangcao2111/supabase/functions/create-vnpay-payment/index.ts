import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VNPAY Configuration from environment
const VNP_TMN_CODE = Deno.env.get('VNPAY_TMN_CODE') || '';
const VNP_HASH_SECRET = Deno.env.get('VNPAY_HASH_SECRET') || '';
const VNP_URL = Deno.env.get('VNPAY_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNP_RETURN_URL = Deno.env.get('VNPAY_RETURN_URL') || '';

// NocoDB Configuration
const NOCODB_BASE_URL = Deno.env.get('NOCODB_BASE_URL') || 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = Deno.env.get('NOCODB_API_TOKEN') || '';
const PAYMENT_TABLE_ID = 'mlzf3x531jjw8eb';
const PACKAGE_TABLE_ID = 'm7oivsc6c73wc3i';

interface CreatePaymentRequest {
    packageId: string;
    userId: string;
    locale?: 'vn' | 'en';
    bankCode?: string;
}

function sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        sorted[key] = obj[key];
    }
    return sorted;
}

function dateFormat(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { packageId, userId, locale = 'vn', bankCode } = await req.json() as CreatePaymentRequest;

        if (!packageId || !userId) {
            throw new Error('packageId and userId are required');
        }

        if (!VNP_TMN_CODE || !VNP_HASH_SECRET) {
            throw new Error('VNPAY configuration missing. Please set VNPAY_TMN_CODE and VNPAY_HASH_SECRET');
        }

        // Fetch package details from NocoDB
        const packageResponse = await fetch(
            `${NOCODB_BASE_URL}/api/v2/tables/${PACKAGE_TABLE_ID}/records?where=(Id,eq,${packageId})`,
            {
                headers: {
                    'xc-token': NOCODB_API_TOKEN,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!packageResponse.ok) {
            throw new Error('Failed to fetch package details');
        }

        const packageResult = await packageResponse.json();
        const packageData = packageResult.list?.[0];

        if (!packageData) {
            throw new Error('Package not found');
        }

        // Generate unique order ID
        const orderId = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        const amount = Math.round(packageData.price * 100); // VNPAY uses amount * 100
        const orderInfo = `Thanh toan goi ${packageData.name}`;
        const createDate = dateFormat(new Date());
        const ipAddr = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

        // Build VNPAY params
        let vnpParams: Record<string, string> = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: VNP_TMN_CODE,
            vnp_Locale: locale,
            vnp_CurrCode: 'VND',
            vnp_TxnRef: orderId,
            vnp_OrderInfo: orderInfo,
            vnp_OrderType: 'other',
            vnp_Amount: amount.toString(),
            vnp_ReturnUrl: VNP_RETURN_URL,
            vnp_IpAddr: ipAddr.split(',')[0].trim(),
            vnp_CreateDate: createDate,
        };

        if (bankCode) {
            vnpParams['vnp_BankCode'] = bankCode;
        }

        // Sort and create query string
        vnpParams = sortObject(vnpParams);
        const signData = new URLSearchParams(vnpParams).toString();

        // Create HMAC SHA512 hash
        const encoder = new TextEncoder();
        const key = encoder.encode(VNP_HASH_SECRET);
        const data = encoder.encode(signData);
        const hashBuffer = await crypto.subtle.importKey(
            'raw', key, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
        ).then(k => crypto.subtle.sign('HMAC', k, data));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const secureHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        vnpParams['vnp_SecureHash'] = secureHash;

        // Create payment URL
        const paymentUrl = `${VNP_URL}?${new URLSearchParams(vnpParams).toString()}`;

        // Save payment transaction to NocoDB
        const transactionData = {
            order_id: orderId,
            user_id: userId,
            package_id: packageId,
            amount: packageData.price,
            currency: 'VND',
            payment_method: 'vnpay',
            status: 'pending',
            created_at: new Date().toISOString(),
        };

        const createTxResponse = await fetch(
            `${NOCODB_BASE_URL}/api/v2/tables/${PAYMENT_TABLE_ID}/records`,
            {
                method: 'POST',
                headers: {
                    'xc-token': NOCODB_API_TOKEN,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transactionData),
            }
        );

        if (!createTxResponse.ok) {
            console.error('Failed to create transaction record:', await createTxResponse.text());
            // Continue anyway - payment can still work
        }

        console.log(`✅ Created VNPAY payment: ${orderId} for package ${packageData.name}`);

        return new Response(
            JSON.stringify({
                success: true,
                paymentUrl,
                orderId,
                amount: packageData.price,
                packageName: packageData.name,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('❌ Error creating VNPAY payment:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});
