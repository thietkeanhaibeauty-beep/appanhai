/**
 * Check Payment Status (Webhook-based)
 * 
 * This endpoint checks payment status directly in NocoDB.
 * The web2m-webhook function updates the payment status when it receives 
 * transaction notifications from Web2M/Pay2S.
 * 
 * This function is called by the frontend to poll for payment completion.
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration from Environment
const NOCODB_BASE_URL = Deno.env.get('NOCODB_BASE_URL') || 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = Deno.env.get('NOCODB_API_TOKEN') || '';

// Table IDs
const PAYMENT_TABLE_ID = 'mjlq3evtb8n7g08';

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { orderId } = await req.json();

        if (!orderId) {
            throw new Error('orderId is required');
        }

        console.log(`🔍 Checking payment status for order: ${orderId}`);

        // Get payment record from NocoDB
        const paymentResponse = await fetch(
            `${NOCODB_BASE_URL}/api/v2/tables/${PAYMENT_TABLE_ID}/records?where=(order_id,eq,${orderId})&limit=1`,
            {
                headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
            }
        );

        if (!paymentResponse.ok) {
            throw new Error('Failed to fetch payment record');
        }

        const paymentResult = await paymentResponse.json();
        const payment = paymentResult.list?.[0];

        if (!payment) {
            console.log(`❌ Payment not found: ${orderId}`);
            return new Response(
                JSON.stringify({
                    success: false,
                    status: 'not_found',
                    message: 'Payment not found',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`📋 Payment status: ${payment.status}`);

        // Return current status
        if (payment.status === 'completed') {
            return new Response(
                JSON.stringify({
                    success: true,
                    status: 'completed',
                    message: 'Payment completed successfully',
                    payment: {
                        orderId: payment.order_id,
                        amount: payment.amount,
                        completedAt: payment.completed_at,
                    },
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (payment.status === 'failed') {
            return new Response(
                JSON.stringify({
                    success: false,
                    status: 'failed',
                    message: 'Payment failed',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Status is still pending
        return new Response(
            JSON.stringify({
                success: true,
                status: 'pending',
                message: 'Waiting for payment',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('❌ Error checking payment:', error);
        return new Response(
            JSON.stringify({
                success: false,
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
