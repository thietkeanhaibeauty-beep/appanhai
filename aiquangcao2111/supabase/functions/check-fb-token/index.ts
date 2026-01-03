import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserFromRequest } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to fetch all paginated data
async function fetchAllPaginated(url: string, timeout: number = 10000): Promise<any[]> {
  let allData: any[] = [];
  let nextUrl: string | null = url;
  let pageCount = 0;
  const maxPages = 100; // Safety limit to prevent infinite loops

  while (nextUrl && pageCount < maxPages) {
    pageCount++;
    console.log(`📄 Fetching page ${pageCount}...`);

    const response: Response = await fetch(nextUrl);

    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch page ${pageCount}`);
      break;
    }

    const data: any = await response.json();

    // Add current page data
    if (data.data && Array.isArray(data.data)) {
      allData = allData.concat(data.data);
      console.log(`✅ Page ${pageCount}: ${data.data.length} items (total: ${allData.length})`);
    }

    // Check for next page
    nextUrl = data.paging?.next || null;

    if (nextUrl) {
      console.log(`➡️ Has next page, continuing...`);
    }
  }

  return allData;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ Authenticate user first
    const user = await getUserFromRequest(req);
    console.log('🔐 Authenticated user:', user.id);

    const { token } = await req.json();

    if (!token) {
      throw new Error("Token is required");
    }

    console.log("🔍 Token length:", token.length);
    console.log("🔍 Token starts with:", token.substring(0, 10) + "...");

    // =====================================================
    // BƯỚC 1: Gọi /me để validate token và lấy thông tin user
    // =====================================================
    console.log("👤 Step 1: Calling /me endpoint to validate token...");

    let meResponse;
    try {
      // Removed AbortSignal.timeout to avoid potential runtime issues
      meResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?access_token=${token}&fields=id,name,email`
      );
      console.log("📊 /me response status:", meResponse.status);
    } catch (fetchError) {
      console.error("❌ Network error calling /me:", fetchError);
      throw new Error(`Lỗi kết nối tới Facebook API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
    }

    if (!meResponse.ok) {
      const errorData = await meResponse.json();
      console.error("❌ /me error response:", JSON.stringify(errorData, null, 2));

      // Parse Facebook error
      const fbError = errorData.error;
      if (fbError) {
        if (fbError.code === 190) {
          throw new Error("Token không hợp lệ hoặc đã hết hạn");
        } else if (fbError.code === 104) {
          throw new Error("Token thiếu quyền truy cập cần thiết");
        }
        throw new Error(fbError.message || "Token không hợp lệ");
      }
      throw new Error(`Không thể xác thực token với Facebook (Status: ${meResponse.status})`);
    }

    const userData = await meResponse.json();
    console.log("✅ User data received:", userData.id, userData.name);

    // =====================================================
    // BƯỚC 2: Lấy danh sách permissions
    // =====================================================
    console.log("🔑 Step 2: Fetching permissions...");

    let permissionsResponse;
    let grantedPermissions: string[] = [];

    try {
      permissionsResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/permissions?access_token=${token}`
      );

      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json();
        grantedPermissions = permissionsData.data
          ?.filter((p: any) => p.status === 'granted')
          .map((p: any) => p.permission) || [];
        console.log(`✅ Found ${grantedPermissions.length} granted permissions`);
      } else {
        console.warn("⚠️ Could not fetch permissions");
      }
    } catch (e) {
      console.warn("⚠️ Error fetching permissions:", e);
    }

    // =====================================================
    // BƯỚC 3: Check required permissions
    // =====================================================
    const requiredPermissions = [
      'ads_management',
      'pages_show_list',
      'pages_manage_posts',
      'pages_read_engagement'
    ];

    const missingPermissions = requiredPermissions.filter(
      perm => !grantedPermissions.includes(perm)
    );

    console.log(`🔑 Permissions: ${grantedPermissions.length} granted, ${missingPermissions.length} missing`);

    // =====================================================
    // BƯỚC 4: Fetch ALL ad accounts (with pagination)
    // =====================================================
    let adAccounts = [];
    console.log("📊 Step 4: Fetching ad accounts...");
    try {
      const initialUrl = `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${token}&fields=id,name,account_status,currency&limit=100`;
      adAccounts = await fetchAllPaginated(initialUrl);
      console.log(`✅ Total ad accounts found: ${adAccounts.length}`);
    } catch (e) {
      console.warn("⚠️ Could not fetch ad accounts:", e);
    }

    // =====================================================
    // BƯỚC 5: Fetch ALL pages (with pagination)
    // =====================================================
    let pages = [];
    console.log("📄 Step 5: Fetching pages...");
    try {
      const initialUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${token}&fields=id,name,category,access_token&limit=100`;
      pages = await fetchAllPaginated(initialUrl);
      console.log(`✅ Total pages found: ${pages.length}`);
    } catch (e) {
      console.warn("⚠️ Could not fetch pages:", e);
    }

    // =====================================================
    // BƯỚC 6: Estimate token expiry (không có debug_token nên estimate)
    // =====================================================
    // User tokens thường có validity 60 ngày
    const estimatedExpiryDays = 60;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + estimatedExpiryDays);

    // =====================================================
    // BƯỚC 7: Return response
    // =====================================================
    return new Response(
      JSON.stringify({
        success: true,
        tokenType: "USER", // Giả định là USER token vì gọi được /me
        isValid: true,
        expiresIn: estimatedExpiryDays * 24 * 3600, // seconds
        expiresAt: expiresAt.toISOString(),
        userId: userData.id,
        appId: null, // Không có từ /me endpoint
        permissions: {
          granted: grantedPermissions,
          missing: missingPermissions,
          allRequired: missingPermissions.length === 0
        },
        data: {
          user: userData,
          adAccounts: adAccounts,
          pages: pages,
          counts: {
            adAccounts: adAccounts.length,
            pages: pages.length
          }
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error checking token:", error);

    // Return 200 even for errors so the client can read the error message body
    // instead of throwing a generic "Edge Function returned a non-2xx status code"
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        details: String(error)
      }),
      {
        status: 200, // ✅ Changed to 200 for debugging
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

