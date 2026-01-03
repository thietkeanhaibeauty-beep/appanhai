
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
        const {
            accessToken,
            endpoint,
            method = 'GET',
            params = {},
            body = null,
            useFormData = false // New flag for form-data requests
        } = await req.json();

        if (!accessToken) {
            throw new Error('Access token is required');
        }

        if (!endpoint) {
            throw new Error('Endpoint is required');
        }

        // Construct URL
        const baseUrl = `https://graph.facebook.com/v21.0/${endpoint}`;
        const url = new URL(baseUrl);

        // Add query params
        // Always inject access_token here
        url.searchParams.append('access_token', accessToken);

        Object.keys(params).forEach(key => {
            // If params value is object/array, stringify it
            const value = typeof params[key] === 'object' ? JSON.stringify(params[key]) : String(params[key]);
            url.searchParams.append(key, value);
        });

        // Prepare fetch options
        const options: RequestInit = {
            method,
        };

        // Check if this is an endpoint that requires form-data (customaudiences, users, adsets, ads)
        // Facebook Marketing API requires form-urlencoded for most write operations
        const requiresFormData = useFormData ||
            endpoint.includes('customaudiences') ||
            endpoint.includes('/users') ||
            endpoint.includes('/adsets') ||  // ⭐ FIX: AdSets require form-data
            endpoint.includes('/ads');       // ⭐ FIX: Ads require form-data

        if (body && (method === 'POST' || method === 'PUT')) {
            if (requiresFormData) {
                // Use URL-encoded form data for Facebook API compatibility
                const formBody = new URLSearchParams();
                Object.keys(body).forEach(key => {
                    const value = typeof body[key] === 'object'
                        ? JSON.stringify(body[key])
                        : String(body[key]);
                    formBody.append(key, value);
                });
                options.body = formBody.toString();
                options.headers = {
                    'Content-Type': 'application/x-www-form-urlencoded',
                };
                console.log(`[Proxy] Using form-data for endpoint: ${endpoint}`);
            } else {
                options.body = JSON.stringify(body);
                options.headers = {
                    'Content-Type': 'application/json',
                };
            }
        }

        // Perform the fetching server-side
        console.log(`[Proxy] ${method} ${url.toString().replace(accessToken, '***')}`);
        const response = await fetch(url.toString(), options);
        const data = await response.json();

        if (!response.ok) {
            console.error('Facebook API Error:', data);
            // Always return 200 so client can access the error details
            // Error is wrapped in response body for client-side handling
            return new Response(JSON.stringify({
                error: data.error,
                fb_error_code: data.error?.code,
                fb_error_message: data.error?.message,
                fb_error_type: data.error?.type
            }), {
                status: 200, // Return 200 so Supabase client doesn't throw
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
