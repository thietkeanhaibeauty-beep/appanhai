import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const targetUrl = 'https://db.hpb.edu.vn/api/v1/health'; // Reverting to IP to test firewall fix
        console.log(`Testing connection to: ${targetUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const startTime = Date.now();
        try {
            const response = await fetch(targetUrl, {
                method: 'GET',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            const duration = Date.now() - startTime;
            console.log(`Success! Status: ${response.status}, Duration: ${duration}ms`);

            return new Response(JSON.stringify({
                success: true,
                status: response.status,
                statusText: response.statusText,
                duration: duration,
                message: "Connection successful"
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });

        } catch (fetchError) {
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;
            console.error(`Connection failed:`, fetchError);

            return new Response(JSON.stringify({
                success: false,
                error: fetchError.message,
                name: fetchError.name,
                duration: duration,
                message: "Connection failed - likely firewall or network issue"
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
