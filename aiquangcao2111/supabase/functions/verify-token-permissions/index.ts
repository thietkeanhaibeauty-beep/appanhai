import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserFromRequest } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromRequest(req);


    const { token } = await req.json();

    if (!token) {
      throw new Error("Token is required");
    }



    // Get token debug info
    const debugResponse = await fetch(
      `https://graph.facebook.com/v18.0/debug_token?input_token=${token}&access_token=${token}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!debugResponse.ok) {
      const errorData = await debugResponse.json();
      console.error("Facebook API error:", errorData);
      throw new Error(errorData.error?.message || "Invalid token");
    }

    const debugData = await debugResponse.json();
    const tokenInfo = debugData.data;



    // Check for required permissions
    const requiredPermissions = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'ads_management'
    ];

    const grantedPermissions = tokenInfo.scopes || [];

    const permissionCheck = requiredPermissions.map(perm => ({
      permission: perm,
      granted: grantedPermissions.includes(perm),
      description: getPermissionDescription(perm)
    }));

    const allGranted = permissionCheck.every(p => p.granted);



    return new Response(
      JSON.stringify({
        success: true,
        data: {
          tokenValid: tokenInfo.is_valid,
          appId: tokenInfo.app_id,
          userId: tokenInfo.user_id,
          expiresAt: tokenInfo.expires_at,
          allPermissions: grantedPermissions,
          permissionCheck: permissionCheck,
          allRequiredGranted: allGranted,
          canReplacePageToken: allGranted,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error verifying token:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function getPermissionDescription(permission: string): string {
  const descriptions: Record<string, string> = {
    'pages_show_list': 'Xem danh sách pages',
    'pages_read_engagement': 'Đọc engagement của pages',
    'pages_manage_posts': 'Quản lý posts trên pages',
    'ads_management': 'Quản lý quảng cáo'
  };
  return descriptions[permission] || permission;
}
