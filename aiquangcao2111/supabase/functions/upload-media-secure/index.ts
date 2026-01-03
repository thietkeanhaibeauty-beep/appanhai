import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// NocoDB config
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const AD_ACCOUNTS_TABLE = 'ms3iubpejoynr9a';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Authenticate user
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. Parse multipart form data
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const adAccountId = formData.get('adAccountId') as string;
        const mediaType = formData.get('mediaType') as string; // 'image' or 'video'

        if (!file || !adAccountId || !mediaType) {
            return new Response(JSON.stringify({ error: 'Missing required fields: file, adAccountId, mediaType' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`[upload-media-secure] User: ${user.email} | Type: ${mediaType} | Size: ${file.size} | Name: ${file.name}`);

        // Check file size limit (Edge Function limit is ~6MB, but we allow up to 5MB to be safe)
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_SIZE) {
            return new Response(JSON.stringify({
                error: `File too large. Maximum size for secure upload is ${MAX_SIZE / 1024 / 1024}MB. For larger files, please use standard upload.`,
                maxSize: MAX_SIZE,
                fileSize: file.size,
            }), {
                status: 413,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 3. Get access token from NocoDB
        const nocodbResponse = await fetch(
            `${NOCODB_URL}/api/v2/tables/${AD_ACCOUNTS_TABLE}/records?where=(user_id,eq,${user.id})~and(is_active,eq,true)&limit=1`,
            {
                headers: {
                    'xc-token': NOCODB_TOKEN,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!nocodbResponse.ok) {
            throw new Error('Failed to fetch ad account from NocoDB');
        }

        const nocodbData = await nocodbResponse.json();
        const adAccount = nocodbData.list?.[0];

        if (!adAccount?.access_token) {
            return new Response(JSON.stringify({ error: 'No active ad account found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const accessToken = adAccount.access_token;
        const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

        // 4. Upload to Facebook
        const fbFormData = new FormData();
        fbFormData.append('access_token', accessToken);

        if (mediaType === 'image') {
            fbFormData.append('filename', file);

            const response = await fetch(
                `https://graph.facebook.com/v21.0/${accountId}/adimages`,
                {
                    method: 'POST',
                    body: fbFormData,
                }
            );

            if (!response.ok) {
                const error = await response.json();
                console.error('[upload-media-secure] Facebook image error:', error);
                throw new Error(error.error?.message || 'Failed to upload image');
            }

            const data = await response.json();
            const imageData = Object.values(data.images)[0] as any;

            console.log(`[upload-media-secure] Image uploaded: ${imageData.hash}`);

            return new Response(JSON.stringify({
                success: true,
                mediaType: 'image',
                hash: imageData.hash,
                url: imageData.url || imageData.permalink_url,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });

        } else if (mediaType === 'video') {
            fbFormData.append('source', file);

            const response = await fetch(
                `https://graph-video.facebook.com/v21.0/${accountId}/advideos`,
                {
                    method: 'POST',
                    body: fbFormData,
                }
            );

            if (!response.ok) {
                const error = await response.json();
                console.error('[upload-media-secure] Facebook video error:', error);
                throw new Error(
                    error.error_user_title ||
                    error.error?.error_user_title ||
                    error.error_user_msg ||
                    error.error?.error_user_msg ||
                    error.error?.message ||
                    'Failed to upload video'
                );
            }

            const data = await response.json();

            console.log(`[upload-media-secure] Video uploaded: ${data.id}`);

            return new Response(JSON.stringify({
                success: true,
                mediaType: 'video',
                id: data.id,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });

        } else {
            return new Response(JSON.stringify({ error: 'Invalid media type. Must be "image" or "video"' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

    } catch (error) {
        console.error('[upload-media-secure] Error:', error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
