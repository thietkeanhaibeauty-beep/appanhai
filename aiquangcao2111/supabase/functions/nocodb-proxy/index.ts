import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-method-override',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Public Tables that allow anonymous read access (GET only)
        const PUBLIC_TABLES = [
            'm7oivsc6c73wc3i', // PAYMENT_PACKAGES
            'm4vhdk99vpso26v', // FEATURE_FLAGS
            'm8zi9ymtb23dsih', // ROLE_FEATURE_FLAGS
            'mtalzi3mr80u6xu', // TOKEN_PACKAGES
        ];

        // Check if request is for a public table (GET only)
        const requestUrl = new URL(req.url);
        let isPublicRequest = false;

        // Simple check in URL or body path
        if (req.method === 'GET') {
            // Check URL path
            isPublicRequest = PUBLIC_TABLES.some(tableId => requestUrl.pathname.includes(tableId));

            // Also check body path if present (though GET usually doesn't have body, our helper uses body for proxying sometimes)
            // But for public access we rely on standard GET usually. 
        }

        // If strict body-based proxying is used even for GET, we need to inspect it. 
        // However, standard fetch from service uses `nocodb-proxy` with method and specific path.
        // Let's rely on Step 1: Verify Auth existing logic unless it's public.

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        let user = null;
        let authError = null;

        // SKIP Auth for Public Tables
        if (!isPublicRequest) {
            const authResponse = await supabaseClient.auth.getUser()
            user = authResponse.data.user
            authError = authResponse.error

            if (authError || !user) {
                console.error('Auth Error:', authError)
                return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }
        } else {
            console.log(`[Proxy] Public Access Granted for: ${req.url}`);
            // Mock user for consistent logging if needed, or just proceed
            user = { email: 'public_guest' }
        }

        // 2. NocoDB Configuration (server-side only - not exposed to frontend)
        const nocodbUrl = 'https://db.hpb.edu.vn'
        const nocodbToken = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_'

        if (!nocodbUrl || !nocodbToken) {
            console.error('Missing NocoDB Configuration')
            return new Response(JSON.stringify({ error: 'Server Configuration Error' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 3. Parse request - support both URL path and body format
        const url = new URL(req.url)
        let relativePath = ''
        let method = req.method
        let bodyData: string | null = null

        // Check if request has body with path/method/data (new format from frontend)
        // Support POST, PUT, PATCH methods
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            try {
                const requestBody = await req.json()
                if (requestBody.path) {
                    // New format: { path, method, data }
                    relativePath = requestBody.path
                    method = requestBody.method || 'GET'
                    bodyData = requestBody.data ? JSON.stringify(requestBody.data) : null
                    console.log(`[Proxy V3] New format - path: ${relativePath}, method: ${method}`)
                } else {
                    // Old format: direct body data for POST/PUT/PATCH
                    bodyData = JSON.stringify(requestBody)
                }
            } catch (e) {
                // No body or not JSON - continue with URL path
            }
        }

        // Fallback to URL path if not in body
        if (!relativePath) {
            const apiIndex = url.pathname.indexOf('/api/v2')
            if (apiIndex !== -1) {
                relativePath = url.pathname.substring(apiIndex)
            } else {
                const funcIndex = url.pathname.indexOf('/nocodb-proxy')
                if (funcIndex !== -1) {
                    relativePath = url.pathname.substring(funcIndex + '/nocodb-proxy'.length)
                } else {
                    relativePath = url.pathname
                }
            }
        }

        // Ensure relativePath starts with /
        if (relativePath && !relativePath.startsWith('/')) {
            relativePath = '/' + relativePath
        }

        const cleanBaseUrl = nocodbUrl.replace(/\/$/, '')
        const queryString = relativePath.includes('?') ? '' : url.search
        const targetUrl = `${cleanBaseUrl}${relativePath}${queryString}`

        console.log(`[Proxy V3] User: ${user.email} | ${method} ${targetUrl}`)

        // 4. Forward Request to NocoDB
        const response = await fetch(targetUrl, {
            method: method,
            headers: {
                'xc-token': nocodbToken,
                'Content-Type': 'application/json',
                'User-Agent': 'node-fetch/1.0',
                'Accept': '*/*',
            },
            body: bodyData,
        })

        // 5. Return Response to Client
        const responseBody = await response.text()

        if (!response.ok) {
            console.error(`[Proxy] Remote Error: ${response.status}`, responseBody)

            if (response.status === 404) {
                return new Response(JSON.stringify({
                    error: 'NocoDB Resource Not Found',
                    originalStatus: 404,
                }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            if (response.status === 422) {
                return new Response(JSON.stringify({
                    error: 'NocoDB Validation Error',
                    originalStatus: 422,
                    details: responseBody
                }), {
                    status: 422,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }
        }

        return new Response(responseBody, {
            status: response.status,
            headers: {
                ...corsHeaders,
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
            },
        })

    } catch (error) {
        console.error('Proxy Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
