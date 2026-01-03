import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// THIRD-PARTY API: nqtam.id.vn (No token required)
// Supports all Facebook URL formats: /share/r/, /share/p/, /reel/, /posts/, /videos/, etc.
// ============================================================================
async function resolveViaNqtamAPI(url: string): Promise<{
    id: string;           // Content ID (video/post/reel ID)
    id_original: string | null;  // Page/Profile ID
    name: string | null;
    isPublic: boolean;
} | null> {
    try {
        console.log(`🔍 Calling nqtam.id.vn API...`);
        const apiUrl = `https://nqtam.id.vn/get-id?link=${encodeURIComponent(url)}`;
        const res = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
        const data = await res.json();

        console.log(`📡 nqtam.id.vn response:`, JSON.stringify(data));

        if (data.status === 'success' && data.data?.id) {
            return {
                id: data.data.id,
                id_original: data.data.id_original || null,
                name: data.data.name || null,
                isPublic: data.is_public || false,
            };
        }

        console.warn('⚠️ nqtam.id.vn: No valid ID returned');
        return null;
    } catch (error) {
        console.error('❌ nqtam.id.vn error:', error);
        return null;
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function jsonOK(data: any) {
    return new Response(
        JSON.stringify({ success: true, ...data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}

function jsonError(message: string, status = 400) {
    return new Response(
        JSON.stringify({ success: false, error: message }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { postUrl } = await req.json();

        if (!postUrl) {
            return jsonError("Missing postUrl parameter");
        }

        console.log(`\n=== VALIDATION START ===`);
        console.log(`Input: ${postUrl}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);

        // ✅ Call nqtam.id.vn API to get ID
        const result = await resolveViaNqtamAPI(postUrl.trim());

        if (result) {
            // ✅ Determine postId based on URL type:
            // - For reel/video links: API returns video ID in 'id' field
            // - For post links: API returns post ID in 'id' field
            // - 'id_original' contains page ID (if available)

            const contentId = result.id;
            const pageId = result.id_original;

            // ✅ Construct fullPostId = pageId_contentId (if pageId is available)
            // This is required format for Facebook Ads API: object_story_id
            let fullPostId: string;

            if (pageId) {
                // We have both page ID and content ID - construct full format
                fullPostId = `${pageId}_${contentId}`;
                console.log(`✅ Constructed fullPostId: ${fullPostId} (from id_original + id)`);
            } else {
                // Only content ID available
                fullPostId = contentId;
                console.log(`⚠️ No id_original, using contentId only: ${contentId}`);
            }

            // ✅ Detect content type from URL
            let contentType = 'post';
            if (postUrl.includes('/reel/') || postUrl.includes('/share/r/')) {
                contentType = 'reel';
            } else if (postUrl.includes('/video') || postUrl.includes('/watch') || postUrl.includes('/share/v/')) {
                contentType = 'video';
            } else if (postUrl.includes('/photo')) {
                contentType = 'photo';
            }

            console.log(`📌 Content type: ${contentType}`);
            console.log(`📌 Page ID (id_original): ${pageId || 'N/A'}`);
            console.log(`📌 Content ID (id): ${contentId}`);
            console.log(`✅ Final fullPostId: ${fullPostId}`);

            return jsonOK({
                postId: contentId,        // Just the content ID
                fullPostId: fullPostId,   // Full format: pageId_contentId
                pageId: pageId || 'unknown',
                contentType: contentType,
                name: result.name,
                isPublic: result.isPublic,
            });
        }

        // ❌ Failed to resolve
        console.log(`❌ Could not resolve post URL`);
        return jsonError(`Could not resolve Facebook post URL: ${postUrl}`);

    } catch (error) {
        console.error("❌ Validation error:", error);
        return jsonError(
            error instanceof Error ? error.message : "Unknown error occurred"
        );
    }
});
