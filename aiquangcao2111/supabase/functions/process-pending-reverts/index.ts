import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { NOCODB_CONFIG } from "../_shared/nocodb-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use shared config
const NOCODB_API_URL = NOCODB_CONFIG.BASE_URL;
const NOCODB_API_TOKEN = NOCODB_CONFIG.API_TOKEN;

const TABLES = {
  FACEBOOK_AD_ACCOUNTS: NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS,
  PENDING_REVERTS: NOCODB_CONFIG.TABLES.PENDING_REVERTS,
};

const getNocoDBHeaders = () => ({
  "xc-token": NOCODB_API_TOKEN,
  "Content-Type": "application/json",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {


    const now = new Date().toISOString();

    // Fetch pending reverts from NocoDB that are due
    const whereClause = encodeURIComponent(`(status,eq,pending)`);
    const revertsUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLES.PENDING_REVERTS}/records?where=${whereClause}&limit=100&sort=-revert_at`;



    const revertsResponse = await fetch(revertsUrl, {
      method: "GET",
      headers: getNocoDBHeaders(),
    });

    if (!revertsResponse.ok) {
      const errorText = await revertsResponse.text();
      console.error("[process-pending-reverts] ❌ Error fetching pending reverts:", errorText);
      throw new Error(`Failed to fetch pending reverts: ${revertsResponse.status}`);
    }

    const revertsData = await revertsResponse.json();
    const allReverts = revertsData.list || [];

    // Filter by revert_at <= now (NocoDB doesn't support date comparison in WHERE)
    const pendingReverts = allReverts.filter((revert: any) => {
      if (!revert.revert_at) return false;
      return new Date(revert.revert_at).getTime() <= new Date(now).getTime();
    });



    if (pendingReverts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending reverts to process",
          processed: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let successCount = 0;
    let failureCount = 0;
    const results = [];

    for (const revert of pendingReverts) {
      try {
        // Get Facebook ad account token for this user
        // ✅ FIX: Use 1 instead of true for NocoDB boolean filter
        const accountWhereClause = encodeURIComponent(`(user_id,eq,${revert.user_id})~and(is_active,eq,1)`);
        const accountResponse = await fetch(
          `${NOCODB_API_URL}/api/v2/tables/${TABLES.FACEBOOK_AD_ACCOUNTS}/records?where=${accountWhereClause}&limit=1`,
          {
            method: "GET",
            headers: getNocoDBHeaders(),
          }
        );

        if (!accountResponse.ok) {
          throw new Error("No active Facebook ad account found");
        }

        const accountData = await accountResponse.json();
        const adAccount = accountData.list?.[0];

        if (!adAccount) {
          throw new Error("No active Facebook ad account found");
        }

        // Execute the revert action via Facebook API
        const result = await executeRevertAction(
          revert.object_id,
          revert.revert_action,
          adAccount.access_token
        );

        // Mark as completed in NocoDB - use PATCH to /records with Id in body
        const updateUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLES.PENDING_REVERTS}/records`;
        const updateResponse = await fetch(updateUrl, {
          method: 'PATCH',
          headers: getNocoDBHeaders(),
          body: JSON.stringify({
            Id: revert.Id,
            status: 'completed'
          })
        });

        if (!updateResponse.ok) {
          const errText = await updateResponse.text();
          console.error(`[process-pending-reverts] ⚠️ Failed to update revert status: ${updateResponse.status} - ${errText}`);
        }

        successCount++;
        results.push({
          revertId: revert.Id,
          objectId: revert.object_id,
          status: "success",
          result
        });



      } catch (error) {
        console.error(`[process-pending-reverts] ❌ Failed to process revert ${revert.Id}:`, error);

        // Mark as failed in NocoDB - use PATCH to /records with Id in body
        const updateUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLES.PENDING_REVERTS}/records`;
        const updateResponse = await fetch(updateUrl, {
          method: 'PATCH',
          headers: getNocoDBHeaders(),
          body: JSON.stringify({
            Id: revert.Id,
            status: 'failed'
          })
        });

        if (!updateResponse.ok) {
          const errText = await updateResponse.text();
          console.error(`[process-pending-reverts] ⚠️ Failed to update revert status: ${updateResponse.status} - ${errText}`);
        }

        failureCount++;
        results.push({
          revertId: revert.Id,
          objectId: revert.object_id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }



    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingReverts.length,
        successCount,
        failureCount,
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[process-pending-reverts] ❌ Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper: Execute revert action via Facebook API
async function executeRevertAction(
  objectId: string,
  revertAction: string,
  token: string
): Promise<any> {
  const url = `https://graph.facebook.com/v18.0/${objectId}`;

  // 1️⃣ Fetch current status first
  const statusResponse = await fetch(`${url}?fields=status&access_token=${token}`, {
    method: 'GET'
  });

  if (!statusResponse.ok) {
    // If can't fetch status, try to execute blindly or throw
    console.warn(`[process-pending-reverts] ⚠️ Could not check Status for ${objectId}, proceeding blindly.`);
  } else {
    const currentData = await statusResponse.json();
    const currentStatus = currentData.status; // "ACTIVE" or "PAUSED" or "ARCHIVED"

    console.log(`[process-pending-reverts] 🔍 Checked status for ${objectId}: ${currentStatus}`);

    if (revertAction === 'turn_on') {
      if (currentStatus === 'ACTIVE') {
        console.log(`[process-pending-reverts] ⏩ Object ${objectId} is already ACTIVE. Skipping Turn On.`);
        return { skipped: true, reason: 'Already ACTIVE' };
      }
    } else if (revertAction === 'turn_off') {
      if (currentStatus === 'PAUSED' || currentStatus === 'ARCHIVED') {
        console.log(`[process-pending-reverts] ⏩ Object ${objectId} is already ${currentStatus}. Skipping Turn Off.`);
        return { skipped: true, reason: `Already ${currentStatus}` };
      }
    }
  }

  switch (revertAction) {
    case "turn_on":
      const onResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ACTIVE",
          access_token: token,
        }),
      });

      if (!onResponse.ok) {
        const errorText = await onResponse.text();
        throw new Error(`Facebook API error: ${onResponse.status} - ${errorText}`);
      }

      return await onResponse.json();

    case "turn_off":
      const offResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAUSED",
          access_token: token,
        }),
      });

      if (!offResponse.ok) {
        const errorText = await offResponse.text();
        throw new Error(`Facebook API error: ${offResponse.status} - ${errorText}`);
      }

      return await offResponse.json();

    default:
      throw new Error(`Unsupported revert action: ${revertAction}`);
  }
}
