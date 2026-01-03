const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOCODB_API_URL = Deno.env.get("NOCODB_API_URL")?.replace(/\/+$/, '') || '';
const NOCODB_API_TOKEN = "u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij";

const getNocoDBHeaders = () => ({
  "xc-token": NOCODB_API_TOKEN,
  "Content-Type": "application/json",
});

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId = "test-user-001" } = await req.json();
    
    console.log(`[fix-label-assignments] 🔧 Starting fix for user: ${userId}`);

    // Step 1: Fetch all label assignments with null user_id
    const fetchUrl = `${NOCODB_API_URL}/api/v2/tables/m4lohjtee32lbau/records?where=(user_id,is,null)&limit=1000`;
    
    console.log(`[fix-label-assignments] 📡 Fetching null assignments from: ${fetchUrl}`);
    
    const fetchResponse = await fetch(fetchUrl, {
      method: "GET",
      headers: getNocoDBHeaders(),
    });

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error(`[fix-label-assignments] ❌ Failed to fetch assignments:`, errorText);
      throw new Error(`Failed to fetch assignments: ${fetchResponse.status} - ${errorText}`);
    }

    const data = await fetchResponse.json();
    const nullAssignments = data.list || [];
    
    console.log(`[fix-label-assignments] 📋 Found ${nullAssignments.length} assignments with null user_id`);

    if (nullAssignments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No assignments need fixing",
          updatedCount: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Update each assignment with the correct user_id
    const updateUrl = `${NOCODB_API_URL}/api/v2/tables/m4lohjtee32lbau/records`;
    let updatedCount = 0;
    const errors: any[] = [];

    for (const assignment of nullAssignments) {
      try {
        console.log(`[fix-label-assignments] 🔄 Updating assignment Id=${assignment.Id} with user_id=${userId}`);
        
        const updateResponse = await fetch(updateUrl, {
          method: "PATCH",
          headers: getNocoDBHeaders(),
          body: JSON.stringify([{
            Id: assignment.Id,
            user_id: userId
          }]),
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(`[fix-label-assignments] ❌ Failed to update Id=${assignment.Id}:`, errorText);
          errors.push({ 
            Id: assignment.Id, 
            error: errorText 
          });
          continue;
        }

        updatedCount++;
        console.log(`[fix-label-assignments] ✅ Updated assignment Id=${assignment.Id}`);
      } catch (error: any) {
        console.error(`[fix-label-assignments] ❌ Error updating Id=${assignment.Id}:`, error);
        errors.push({ 
          Id: assignment.Id, 
          error: error.message 
        });
      }
    }

    console.log(`[fix-label-assignments] ✅ Fix complete. Updated: ${updatedCount}/${nullAssignments.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fixed ${updatedCount} label assignments`,
        totalFound: nullAssignments.length,
        updatedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[fix-label-assignments] ❌ Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
