import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserFromRequest } from "../_shared/auth.ts";
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ Authenticate user first
    const user = await getUserFromRequest(req);
    console.log("🔐 Authenticated user:", user.id);

    const { token } = await req.json();

    if (!token) {
      throw new Error("Token is required");
    }

    console.log("📥 Fetching page info from Facebook");

    // Fetch current page info (Page Token only has access to itself)
    // ✅ Remove 'category' - not supported for /me endpoint with page token
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${token}&fields=id,name`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to fetch page info");
    }

    const pageData = await response.json();
    const pages = [pageData]; // Wrap single page in array for consistency

    // ✅ Save to NocoDB with user_id
    console.log("💾 Saving pages to NocoDB for user:", user.id);

    const nocoDBUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PAGES}/records`;

    for (const page of pages) {
      // ✅ STEP 1: Deactivate ALL active pages for this user first
      const activePageUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PAGES}/records?where=(user_id,eq,${user.id})~and(is_active,eq,1)&limit=100`;
      const activeResponse = await fetch(activePageUrl, {
        method: 'GET',
        headers: getNocoDBHeaders(),
      });

      const activeData = await activeResponse.json();

      if (activeData.list && activeData.list.length > 0) {
        const updateUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PAGES}/records`;
        for (const activePage of activeData.list) {
          await fetch(updateUrl, {
            method: 'PATCH',
            headers: getNocoDBHeaders(),
            body: JSON.stringify([{
              Id: activePage.Id,
              is_active: 0,
            }]),
          });
        }
        console.log(`✅ Deactivated ${activeData.list.length} active pages for user ${user.id}`);
      }

      // ✅ STEP 2: Check if page_id exists for this user (active or inactive)
      const checkUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PAGES}/records?where=(user_id,eq,${user.id})~and(page_id,eq,${page.id})&limit=1`;
      const checkResponse = await fetch(checkUrl, {
        method: 'GET',
        headers: getNocoDBHeaders(),
      });

      const existingData = await checkResponse.json();

      if (existingData.list && existingData.list.length > 0) {
        // ✅ STEP 3: UPDATE existing page and activate it
        const existingRecord = existingData.list[0];
        const updateUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PAGES}/records`;
        await fetch(updateUrl, {
          method: 'PATCH',
          headers: getNocoDBHeaders(),
          body: JSON.stringify([{
            Id: existingRecord.Id,
            page_name: page.name,
            access_token: token,
            is_active: 1,
          }]),
        });
        console.log(`✅ Updated and activated page: ${page.id}`);
      } else {
        // ✅ STEP 4: INSERT new page
        const pageRecord = {
          page_id: page.id,
          page_name: page.name,
          access_token: token,
          is_active: 1,
          user_id: user.id,
        };

        const nocoResponse = await fetch(nocoDBUrl, {
          method: "POST",
          headers: getNocoDBHeaders(),
          body: JSON.stringify(pageRecord),
        });

        if (!nocoResponse.ok) {
          const errorData = await nocoResponse.json();
          console.error("❌ NocoDB error:", errorData);
          throw new Error(`Failed to save page to NocoDB: ${JSON.stringify(errorData)}`);
        }

        console.log("✅ Inserted new page:", page.id);
      }
    }

    console.log(`✅ Saved ${pages.length} pages for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        pages: pages.map((page: any) => ({
          id: page.id,
          name: page.name,
          category: page.category,
        })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error fetching pages:", error);
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
