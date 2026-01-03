import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZALO_API_KEY = "zalo_33752f0e1b1057e2f1cd837d04e704e49ac6693d675e467c657701a0e67e38c5";

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { url, method, body } = await req.json();

        if (!url) {
            throw new Error("Missing 'url' in request body");
        }

        // Construct full URL
        // /zalo-login is at root, other endpoints are under /external/api
        const ROOT_URL = "https://zaloapi.hpb.edu.vn";
        const API_URL = "https://zaloapi.hpb.edu.vn/external/api";

        // List of endpoints that are at the root level (based on new 11.txt)
        // IMPORTANT: /api/* endpoints must be listed for proper VPS routing
        const rootEndpoints = [
            '/zalo-login',
            '/findUser',
            '/getUserInfo',
            '/accounts',
            '/getGroupInfo',
            '/sendFriendRequest',
            '/sendmessage',
            '/createGroup',
            '/addUserToGroup',
            '/removeUserFromGroup',
            '/sendImageToUser',
            '/sendImagesToUser',
            '/sendImageToGroup',
            '/sendImagesToGroup',
            // API endpoints with /api/ prefix
            '/api/findUser',
            '/api/findUserByAccount',
            '/api/sendFriendRequest',
            '/api/sendFriendRequestByAccount',
            '/api/acceptFriendRequest',
            '/api/acceptFriendRequestByAccount',
            '/api/getAllFriendsByAccount',
            '/api/getAllGroups',
            '/api/getGroupInfo',
            '/api/sendmessage',
            '/api/sendMessageByAccount',
            '/api/accounts',
            '/api/zalo-accounts',
            '/api'
        ];

        const isRootEndpoint = rootEndpoints.some(endpoint => url === endpoint || url.startsWith(endpoint));
        const baseUrl = isRootEndpoint ? ROOT_URL : API_URL;
        const targetUrl = `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;

        console.log(`Proxying ${method} request to: ${targetUrl}`);

        const options: RequestInit = {
            method: method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': ZALO_API_KEY  // Uppercase as per API docs
            }
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(targetUrl, options);

        // Try to parse response as text first
        const responseText = await response.text();
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { rawResponse: responseText };
        }

        // Log detailed info for debugging 403 errors
        if (!response.ok) {
            console.error(`[zalo-proxy] Error ${response.status} from ${targetUrl}:`, responseText);
        }

        return new Response(JSON.stringify({
            ...responseData,
            _debug: {
                targetUrl,
                status: response.status,
                apiKeyUsed: ZALO_API_KEY.substring(0, 20) + '...'
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: response.status,
        });

    } catch (error) {
        console.error("Proxy error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
