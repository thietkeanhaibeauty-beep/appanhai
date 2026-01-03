import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// URL PATTERNS - Based on n8n workflow logic
// ============================================================================
const urlPatterns = [
    // Share Link Patterns (needs resolution)
    {
        regex: /facebook\.com\/share\/v\/([^\/\?&]+)/,
        type: 'share_link_v',
        shareIdIndex: 1,
        needsResolution: true,
        contentType: 'unknown',
    },
    {
        regex: /facebook\.com\/share\/p\/([^\/\?&]+)/,
        type: 'share_link_p',
        shareIdIndex: 1,
        needsResolution: true,
        contentType: 'unknown',
    },
    {
        regex: /facebook\.com\/share\/r\/([^\/\?&]+)/,
        type: 'share_link_r',
        shareIdIndex: 1,
        needsResolution: true,
        contentType: 'reel',
    },

    // Video Patterns
    // Pattern: /PageID/videos/SLUG/VideoID (with slug in middle)
    {
        regex: /facebook\.com\/(\d{10,})\/videos\/[^\/]+\/(\d{10,})/,
        type: 'pageid_video_with_slug',
        pageIdIndex: 1,
        postIndex: 2,
        contentType: 'video',
    },
    {
        regex: /facebook\.com\/([a-zA-Z][a-zA-Z0-9._-]{0,49})\/videos\/[^\/]+\/(\d{10,})/,
        type: 'username_video_with_slug',
        usernameIndex: 1,
        postIndex: 2,
        contentType: 'video',
    },
    {
        regex: /facebook\.com\/([a-zA-Z][a-zA-Z0-9._-]{0,49})\/videos\/([^\/\?&]+)/,
        type: 'username_video',
        usernameIndex: 1,
        postIndex: 2,
        contentType: 'video',
    },
    {
        regex: /facebook\.com\/(\d{10,})\/videos\/([^\/\?&]+)/,
        type: 'pageid_video',
        pageIdIndex: 1,
        postIndex: 2,
        contentType: 'video',
    },
    {
        regex: /facebook\.com\/watch\/\?v=([^\/\?&]+)/,
        type: 'watch_video',
        postIndex: 1,
        contentType: 'video',
    },
    {
        regex: /facebook\.com\/reel\/([^\/\?&]+)/,
        type: 'reel_video',
        postIndex: 1,
        contentType: 'reel',
    },

    // Post Patterns
    {
        regex: /facebook\.com\/([a-zA-Z][a-zA-Z0-9._-]{0,49})\/posts\/([^\/\?&]+)/,
        type: 'username_post',
        usernameIndex: 1,
        postIndex: 2,
        contentType: 'post',
    },
    {
        regex: /facebook\.com\/(\d{10,})\/posts\/([^\/\?&]+)/,
        type: 'pageid_post',
        pageIdIndex: 1,
        postIndex: 2,
        contentType: 'post',
    },
    {
        regex: /facebook\.com\/permalink\.php\?story_fbid=([^&]+)&id=([^&]+)/,
        type: 'permalink',
        postIndex: 1,
        pageIdIndex: 2,
        contentType: 'post',
    },
];

// ============================================================================
// HELPER: Fetch with timeout
// ============================================================================
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(id);
    }
}

// ============================================================================
// RESOLVE SHARE LINK - Fetch HTML and extract canonical URL
// ============================================================================
async function resolveShareLink(shareUrl: string): Promise<string | null> {
    try {
        console.log(`🔗 Resolving share link: ${shareUrl}`);

        const response = await fetchWithTimeout(shareUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html',
            },
            redirect: 'follow',
        }, 10000);

        if (!response.ok) {
            console.error(`❌ Failed to fetch share link: ${response.status}`);
            return null;
        }

        // ✅ CHECK REDIRECTED URL (response.url) - Critical for share links
        // ⚠️ IMPORTANT: Only use redirect URL for posts/permalink, NOT for video URLs
        // Video URLs need to be resolved to post IDs via Graph API
        const finalUrl = response.url;
        if (finalUrl && finalUrl !== shareUrl && !finalUrl.includes('facebook.com/login')) {
            console.log(`🔀 Followed redirect to: ${finalUrl}`);
            // ✅ Only use redirect if it's a POST or PERMALINK (not video!)
            // Video URLs should fall through to HTML parsing to find the actual post
            if (finalUrl.match(/\/posts\/|permalink\.php/)) {
                console.log(`✅ Using final redirected URL (post/permalink): ${finalUrl}`);
                return finalUrl;
            }
            // For video URLs, log but continue to HTML parsing
            if (finalUrl.match(/\/videos\//)) {
                console.log(`⚠️ Redirect is video URL, will try to find permalink in HTML...`);
            }
        }

        const html = await response.text();

        // Extract URL from meta tags - try multiple patterns
        const extractionMethods = [
            /<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i,
            /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i,
            /data-href=["']([^"']*facebook\.com[^"']*posts[^"']*)["']/i,
            // Permalink patterns - capture permalink.php URLs
            /"permalink_url":\s*"([^"]+permalink\.php[^"]+)"/i,
            /href=["'](https?:\/\/[^"']*facebook\.com\/permalink\.php[^"']+)["']/i,
        ];

        for (const regex of extractionMethods) {
            const match = html.match(regex);
            if (match && match[1]) {
                let resolvedUrl = match[1]
                    .replace(/&amp;/g, '&')
                    .replace(/\\\//g, '/');

                // Handle Login Redirects: https://www.facebook.com/login/?next=...
                if (resolvedUrl.includes('facebook.com/login/')) {
                    console.log(`⚠️ Resolved to login URL: ${resolvedUrl}`);
                    try {
                        const loginUrlObj = new URL(resolvedUrl);
                        const nextParam = loginUrlObj.searchParams.get('next');
                        if (nextParam) {
                            resolvedUrl = decodeURIComponent(nextParam);
                            console.log(`✅ Extracted 'next' URL from login redirect: ${resolvedUrl}`);
                        }
                    } catch (e) {
                        console.warn('❌ Failed to parse login URL next param', e);
                    }
                }

                console.log(`✅ Resolved URL: ${resolvedUrl}`);
                return resolvedUrl;
            }
        }

        console.warn('⚠️ Could not extract URL from share link HTML');
        return null;
    } catch (error) {
        console.error('❌ Error resolving share link:', error);
        return null;
    }
}

// ============================================================================
// PARSE URL - Extract post ID and page ID from URL
// ============================================================================
function parseUrl(url: string, pageIdFromSettings?: string): {
    postId: string | null;
    pageId: string | null;
    pageUsername: string | null;
    contentType: string;
    needsResolution: boolean;
    shareId: string | null;
    needsPageIdLookup: boolean;
} {
    let postId: string | null = null;
    let pageId: string | null = pageIdFromSettings || null;
    let pageUsername: string | null = null;
    let contentType = 'post';
    let needsResolution = false;
    let shareId: string | null = null;
    let needsPageIdLookup = false;

    // ========================================
    // SPECIAL HANDLING: Permalink URLs with pfbid or story_fbid
    // Parse query parameters directly for permalink.php URLs
    // ========================================
    if (url.includes('permalink.php')) {
        console.log(`📎 Detected permalink.php URL, parsing query params...`);
        try {
            const urlObj = new URL(url);
            const storyFbid = urlObj.searchParams.get('story_fbid');
            const idParam = urlObj.searchParams.get('id');

            if (storyFbid) {
                postId = storyFbid;  // Can be pfbid format or numeric
                contentType = 'post';
                console.log(`   story_fbid: ${storyFbid}`);
            }
            if (idParam && !pageId) {
                pageId = idParam;
                console.log(`   id (page): ${idParam}`);
            }

            if (postId) {
                return {
                    postId,
                    pageId,
                    pageUsername,
                    contentType,
                    needsResolution: false,
                    shareId: null,
                    needsPageIdLookup: false,
                };
            }
        } catch (e) {
            console.log(`   URL parse error, falling back to regex`);
        }
    }

    // ========================================
    // STANDARD URL PATTERN MATCHING
    // ========================================
    for (const pattern of urlPatterns) {
        const match = url.match(pattern.regex);
        if (match) {
            contentType = pattern.contentType;

            if (pattern.needsResolution) {
                shareId = match[pattern.shareIdIndex!];
                needsResolution = true;
                console.log(`📌 Share link detected: ${pattern.type}, shareId: ${shareId}`);
            } else {
                if (pattern.postIndex) {
                    postId = match[pattern.postIndex];
                }

                if (pattern.usernameIndex) {
                    pageUsername = match[pattern.usernameIndex];
                    if (!pageId) {
                        needsPageIdLookup = true;
                    }
                } else if (pattern.pageIdIndex && !pageId) {
                    pageId = match[pattern.pageIdIndex];
                }
            }

            break;
        }
    }

    return {
        postId,
        pageId,
        pageUsername,
        contentType,
        needsResolution,
        shareId,
        needsPageIdLookup,
    };
}

// ============================================================================
// GET PAGE ID FROM USERNAME - Using Facebook Graph API
// ============================================================================
async function getPageIdFromUsername(username: string, accessToken: string): Promise<string | null> {
    try {
        console.log(`🔍 Looking up page ID for username: ${username}`);

        const url = `https://graph.facebook.com/v20.0/${username}?fields=id,name&access_token=${accessToken}`;
        const response = await fetchWithTimeout(url, {}, 10000);
        const data = await response.json();

        if (data.id) {
            console.log(`✅ Found page ID: ${data.id} for ${username}`);
            return data.id;
        }

        console.warn(`⚠️ Could not find page ID for ${username}`);
        return null;
    } catch (error) {
        console.error('❌ Error looking up page ID:', error);
        return null;
    }
}

// ============================================================================
// RESOLVE VIDEO ID TO POST ID - Search page posts to find actual post ID
// Based on n8n workflow logic: Search Page Posts for Reel -> Process Reel Resolution
// ============================================================================
async function resolveVideoToPostId(
    videoId: string,
    pageId: string,
    accessToken: string
): Promise<{ postId: string; fullPostId: string; resolved: boolean } | null> {
    try {
        console.log(`\n🔎 Resolving video ID ${videoId} to post ID...`);
        console.log(`   Page ID: ${pageId}`);

        // Step 1: Try direct video API call to get post_id
        const videoUrl = `https://graph.facebook.com/v20.0/${videoId}?fields=id,created_time,from{id,name},permalink_url,post_id&access_token=${accessToken}`;
        const videoResponse = await fetchWithTimeout(videoUrl, {}, 15000);
        const videoData = await videoResponse.json();

        if (!videoData.error) {
            console.log(`📹 Video API response:`, JSON.stringify(videoData));

            // Check if video API returned a different post_id
            if (videoData.post_id && videoData.post_id !== videoId) {
                console.log(`✅ Found post_id from video API: ${videoData.post_id}`);
                return {
                    postId: videoData.post_id,
                    fullPostId: `${pageId}_${videoData.post_id}`,
                    resolved: true,
                };
            }

            // Try to extract post ID from permalink_url - multiple patterns
            if (videoData.permalink_url) {
                // Pattern 1: /posts/POSTID
                const postsMatch = videoData.permalink_url.match(/posts\/(\d+)/);
                if (postsMatch && postsMatch[1] !== videoId) {
                    console.log(`✅ Extracted post ID from permalink (posts): ${postsMatch[1]}`);
                    return {
                        postId: postsMatch[1],
                        fullPostId: `${pageId}_${postsMatch[1]}`,
                        resolved: true,
                    };
                }

                // Pattern 2: story_fbid=POSTID in permalink
                const storyMatch = videoData.permalink_url.match(/story_fbid=(\d+)/);
                if (storyMatch && storyMatch[1] !== videoId) {
                    console.log(`✅ Extracted post ID from permalink (story_fbid): ${storyMatch[1]}`);
                    return {
                        postId: storyMatch[1],
                        fullPostId: `${pageId}_${storyMatch[1]}`,
                        resolved: true,
                    };
                }
            }
        } else {
            console.log(`⚠️ Video API error: ${videoData.error?.message}`);
        }

        // Step 2: Try using page_id_video composite ID to get post info
        console.log(`🔍 Trying composite ID lookup: ${pageId}_${videoId}...`);
        try {
            const compositeUrl = `https://graph.facebook.com/v20.0/${pageId}_${videoId}?fields=id,permalink_url&access_token=${accessToken}`;
            const compositeResponse = await fetchWithTimeout(compositeUrl, {}, 10000);
            const compositeData = await compositeResponse.json();

            if (!compositeData.error && compositeData.id) {
                // The API returns the actual post ID in the id field
                const actualPostId = compositeData.id.split('_')[1] || compositeData.id;
                if (actualPostId && actualPostId !== videoId) {
                    console.log(`✅ Found post ID from composite lookup: ${actualPostId}`);
                    return {
                        postId: actualPostId,
                        fullPostId: compositeData.id,
                        resolved: true,
                    };
                }
            }
        } catch (e) {
            console.log(`   Composite lookup failed: ${e}`);
        }

        // Step 3: Search page posts to find matching video (increased limit)
        console.log(`🔍 Searching page posts for video ID ${videoId}...`);
        const postsUrl = `https://graph.facebook.com/v20.0/${pageId}/posts?fields=id,created_time,message,permalink_url,attachments{media_type,target{id}}&limit=100&access_token=${accessToken}`;
        const postsResponse = await fetchWithTimeout(postsUrl, {}, 30000);
        const postsData = await postsResponse.json();

        if (postsData.data && Array.isArray(postsData.data)) {
            console.log(`   Found ${postsData.data.length} posts to search`);

            // Look for post that contains this video
            for (const post of postsData.data) {
                // Check attachments for matching video ID
                if (post.attachments?.data) {
                    for (const attachment of post.attachments.data) {
                        if (attachment.target?.id === videoId) {
                            const postIdPart = post.id.split('_')[1] || post.id;
                            console.log(`✅ Found matching post: ${post.id}`);
                            return {
                                postId: postIdPart,
                                fullPostId: post.id,
                                resolved: true,
                            };
                        }
                    }
                }

                // Check if permalink contains the video ID
                if (post.permalink_url && post.permalink_url.includes(videoId)) {
                    const postIdPart = post.id.split('_')[1] || post.id;
                    console.log(`✅ Found post via permalink match: ${post.id}`);
                    return {
                        postId: postIdPart,
                        fullPostId: post.id,
                        resolved: true,
                    };
                }
            }

            // Step 4: Fallback - find most recent promotable post (pattern 122...)
            console.log(`⚠️ No exact match, looking for recent promotable posts...`);
            for (const post of postsData.data) {
                const postId = post.id.split('_')[1];
                if (postId && postId.startsWith('122')) {
                    console.log(`✅ Found recent promotable post: ${post.id}`);
                    return {
                        postId: postId,
                        fullPostId: post.id,
                        resolved: true,
                    };
                }
            }
        }

        console.log(`❌ Could not resolve video ID to post ID`);
        return null;
    } catch (error) {
        console.error('❌ Error resolving video to post:', error);
        return null;
    }
}

// ============================================================================
// GET PAGE ID FROM VIDEO - Extract page/from ID from Video API
// Used when we only have video ID from /reel/ or /share/r/ links
// ============================================================================
async function getPageIdFromVideo(videoId: string, accessToken: string): Promise<string | null> {
    try {
        console.log(`🔍 Getting page ID from video: ${videoId}`);

        const videoUrl = `https://graph.facebook.com/v20.0/${videoId}?fields=from{id,name}&access_token=${accessToken}`;
        const response = await fetchWithTimeout(videoUrl, {}, 10000);
        const data = await response.json();

        if (data.error) {
            console.log(`⚠️ Video API error: ${data.error?.message}`);
            return null;
        }

        if (data.from?.id) {
            console.log(`✅ Found page ID from video: ${data.from.id} (${data.from.name || 'N/A'})`);
            return data.from.id;
        }

        console.log(`⚠️ Could not get page ID from video`);
        return null;
    } catch (error) {
        console.error('❌ Error getting page ID from video:', error);
        return null;
    }
}

// ============================================================================
// RESOLVE PFBID TO NUMERIC ID - Convert alphanumeric ID to numeric ID
// ============================================================================
async function resolvePfbidToNumericId(pfbid: string, accessToken: string, pageId?: string | null): Promise<string | null> {
    try {
        console.log(`🔍 Resolving pfbid ${pfbid} to numeric ID...`);

        // Strategy 1: Direct lookup
        try {
            const url = `https://graph.facebook.com/v20.0/${pfbid}?fields=id&access_token=${accessToken}`;
            const response = await fetchWithTimeout(url, {}, 5000); // 5s timeout
            if (response.ok) {
                const data = await response.json();
                if (data.id) {
                    console.log(`✅ Strategy 1: Resolved pfbid to numeric ID: ${data.id}`);
                    return data.id;
                }
            }
        } catch (e) {
            console.log(`   Strategy 1 failed: ${e.message}`);
        }

        if (pageId) {
            // Strategy 2: PageID_Pfbid lookup
            try {
                const compositeId = `${pageId}_${pfbid}`;
                const url = `https://graph.facebook.com/v20.0/${compositeId}?fields=id&access_token=${accessToken}`;
                const response = await fetchWithTimeout(url, {}, 5000);
                if (response.ok) {
                    const data = await response.json();
                    if (data.id) {
                        const numericId = data.id.split('_')[1] || data.id; // Extract post part
                        console.log(`✅ Strategy 2: Resolved composite ID to: ${numericId}`);
                        return numericId;
                    }
                }
            } catch (e) {
                console.log(`   Strategy 2 failed: ${e.message}`);
            }

            // Strategy 3: Search Page Posts
            console.log(`🔍 Strategy 3: Searching page posts for pfbid...`);
            try {
                const postsUrl = `https://graph.facebook.com/v20.0/${pageId}/posts?fields=id,permalink_url&limit=50&access_token=${accessToken}`;
                const postsResponse = await fetchWithTimeout(postsUrl, {}, 15000);
                const postsData = await postsResponse.json();

                if (postsData.data && Array.isArray(postsData.data)) {
                    for (const post of postsData.data) {
                        // Check if permalink contains pfbid
                        if (post.permalink_url && post.permalink_url.includes(pfbid)) {
                            const numericId = post.id.split('_')[1] || post.id;
                            console.log(`✅ Strategy 3: Found match in permalink: ${post.id}`);
                            return numericId;
                        }
                    }
                }
            } catch (e) {
                console.log(`   Strategy 3 failed: ${e.message}`);
            }
        }

        console.warn(`⚠️ Could not resolve pfbid via any strategy`);
        return null;
    } catch (error) {
        console.error('❌ Error resolving pfbid:', error);
        return null;
    }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const {
            facebook_post_input,
            access_token,
            page_access_token,
            page_id: pageIdParam
        } = await req.json();

        if (!facebook_post_input) {
            return new Response(
                JSON.stringify({ success: false, error: "Missing facebook_post_input parameter" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const graphApiToken = page_access_token || access_token;

        console.log(`\n=== FACEBOOK POST EXTRACTOR ===`);
        console.log(`Input: ${facebook_post_input}`);
        console.log(`Has access token: ${!!graphApiToken}`);
        console.log(`Page ID from param: ${pageIdParam || 'N/A'}`);

        let finalPostId: string | null = null;
        let finalPageId: string | null = pageIdParam || null;
        let contentType = 'post';
        let resolvedUrl: string | null = null;

        // Check if input is a URL or direct ID
        if (facebook_post_input.includes('facebook.com')) {
            // Parse the initial URL
            let parseResult = parseUrl(facebook_post_input, pageIdParam);

            // Handle share links - need to resolve first
            if (parseResult.needsResolution) {
                console.log('🔗 Share link detected, resolving...');
                resolvedUrl = await resolveShareLink(facebook_post_input);

                if (resolvedUrl) {
                    // ✅ CRITICAL: Parse resolved URL WITHOUT pageIdParam
                    // Let it detect page from URL (needed for pfbid resolution)
                    parseResult = parseUrl(resolvedUrl); // ← NO pageIdParam!
                    console.log(`📌 Parsed resolved URL: postId=${parseResult.postId}, pageId=${parseResult.pageId}`);
                } else {
                    return new Response(
                        JSON.stringify({ success: false, error: "Could not resolve share link" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }
            }

            finalPostId = parseResult.postId;
            contentType = parseResult.contentType;

            // Get page ID from username if needed
            if (parseResult.needsPageIdLookup && parseResult.pageUsername && graphApiToken) {
                const lookedUpPageId = await getPageIdFromUsername(parseResult.pageUsername, graphApiToken);
                if (lookedUpPageId) {
                    finalPageId = lookedUpPageId;
                } else {
                    // ✅ Prefer pageIdParam (numeric) over username (text)
                    finalPageId = pageIdParam || parseResult.pageUsername;
                }
            } else if (parseResult.pageId) {
                finalPageId = parseResult.pageId;
            }

        } else {
            // Direct ID input
            const input = facebook_post_input.trim();
            if (input.includes('_')) {
                const parts = input.split('_');
                if (parts.length >= 2) {
                    if (!finalPageId) {
                        finalPageId = parts[0];
                    }
                    finalPostId = parts.slice(1).join('_');
                }
            } else {
                finalPostId = input;
            }
        }

        // Validate results
        if (!finalPostId) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Could not extract post ID from input",
                    debug: {
                        original_input: facebook_post_input,
                        resolved_url: resolvedUrl,
                        content_type: contentType,
                    }
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ============================================================================
        // PFBID TO NUMERIC ID RESOLUTION
        // If post ID starts with 'pfbid', try to resolve to numeric ID
        // ============================================================================
        if (finalPostId.startsWith('pfbid') && graphApiToken) {
            const numericId = await resolvePfbidToNumericId(finalPostId, graphApiToken, finalPageId);
            if (numericId) {
                console.log(`✅ Converted pfbid ${finalPostId} → ${numericId}`);
                finalPostId = numericId;
            }
        }

        // ============================================================================
        // VIDEO TO POST ID RESOLUTION
        // If content is video/reel and we have token, try to find actual post ID
        // ============================================================================
        let originalVideoId: string | null = null;
        let videoResolved = false;

        // 🆕 If video/reel but no pageId, try to get pageId from video API
        if ((contentType === 'video' || contentType === 'reel') && !finalPageId && finalPostId && graphApiToken) {
            console.log(`\n📹 No pageId for ${contentType}, attempting to get from video API...`);
            const videoPageId = await getPageIdFromVideo(finalPostId, graphApiToken);
            if (videoPageId) {
                finalPageId = videoPageId;
                console.log(`✅ Got pageId from video: ${finalPageId}`);
            }
        }

        if ((contentType === 'video' || contentType === 'reel') && finalPageId && graphApiToken) {
            console.log(`\n🎬 Content is ${contentType}, attempting to resolve video ID to post ID...`);

            const resolvedPost = await resolveVideoToPostId(finalPostId, finalPageId, graphApiToken);

            if (resolvedPost && resolvedPost.resolved) {
                originalVideoId = finalPostId;  // Keep original video ID for reference
                finalPostId = resolvedPost.postId;
                videoResolved = true;
                console.log(`✅ Video resolved: ${originalVideoId} → ${finalPostId}`);
            } else {
                console.log(`⚠️ Could not resolve video to post, keeping video ID: ${finalPostId}`);
            }
        }

        // Construct full content ID
        const fullContentId = finalPageId ? `${finalPageId}_${finalPostId}` : finalPostId;

        console.log(`\n✅ EXTRACTION RESULT:`);
        console.log(`   Post ID: ${finalPostId}${videoResolved ? ' (resolved from video)' : ''}`);
        console.log(`   Page ID: ${finalPageId || 'N/A'}`);
        console.log(`   Full Content ID: ${fullContentId}`);
        console.log(`   Content Type: ${contentType}`);
        if (originalVideoId) {
            console.log(`   Original Video ID: ${originalVideoId}`);
        }

        return new Response(
            JSON.stringify({
                success: true,
                post_id: finalPostId,
                page_id: finalPageId,
                full_content_id: fullContentId,
                content_type: contentType,
                resolved_url: resolvedUrl,
                original_input: facebook_post_input,
                // Video resolution info
                video_resolved: videoResolved,
                original_video_id: originalVideoId,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("❌ Error:", error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
