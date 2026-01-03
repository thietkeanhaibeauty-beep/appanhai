import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalize URL to remove trailing slashes
const normalizeUrl = (url: string) => url?.replace(/\/+$/, '') || '';
const NOCODB_API_URL = normalizeUrl(Deno.env.get("NOCODB_API_URL") || 'https://db.hpb.edu.vn');
const NOCODB_API_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const TABLES = {
  AUTOMATED_RULES: "mp8nib5rn4l0mb4", // ✅ PATCHED: Updated from mhmhfd4m16a1hln to current ID
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
    console.log("[execute-all-automation-rules] Starting execution of all active rules");

    if (!NOCODB_API_URL) {
      throw new Error("NOCODB_API_URL not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration not found");
    }

    // Fetch all active automation rules from NocoDB
    const whereClause = encodeURIComponent(`(is_active,eq,true)`);
    const rulesUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?where=${whereClause}&limit=100`;

    console.log(`[execute-all-automation-rules] 🔍 Fetching rules from: ${rulesUrl}`);

    const rulesResponse = await fetch(rulesUrl, {
      method: "GET",
      headers: getNocoDBHeaders(),
    });

    if (!rulesResponse.ok) {
      const errorText = await rulesResponse.text();
      console.error(`[execute-all-automation-rules] ❌ Failed to fetch rules:`, {
        status: rulesResponse.status,
        url: rulesUrl,
        error: errorText
      });
      throw new Error(`Failed to fetch rules: ${rulesResponse.status} - ${errorText}`);
    }

    const rulesData = await rulesResponse.json();
    const activeRules = rulesData.list || [];

    console.log(`[execute-all-automation-rules] Found ${activeRules.length} active rules`);

    if (activeRules.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active rules to execute",
          executedCount: 0,
          results: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute each rule by calling execute-automation-rule function
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const rule of activeRules) {
      try {
        // Parse advanced_settings if it's a string
        let advancedSettings = rule.advanced_settings || {};
        if (typeof advancedSettings === 'string') {
          try {
            advancedSettings = JSON.parse(advancedSettings);
          } catch (e) {
            console.error(`[execute-all-automation-rules] ⚠️ Failed to parse advanced_settings for rule ${rule.rule_name}`);
            advancedSettings = {};
          }
        }

        // Check if auto-schedule is enabled
        if (!advancedSettings.enableAutoSchedule) {
          console.log(`[execute-all-automation-rules] Skipping rule ${rule.rule_name} - auto-schedule disabled`);
          continue;
        }

        // Check frequency
        const lastRun = rule.last_run_at ? new Date(rule.last_run_at) : null;
        const checkFrequency = advancedSettings.checkFrequency || 60; // minutes

        if (lastRun) {
          const minutesSinceLastRun = (Date.now() - lastRun.getTime()) / 60000;
          if (minutesSinceLastRun < checkFrequency) {
            console.log(`[execute-all-automation-rules] Skipping rule ${rule.rule_name} - ran ${Math.round(minutesSinceLastRun)} minutes ago`);
            continue;
          }
        }

        // ✅ CRITICAL: Use rule.Id (capital I) not rule.id (lowercase)
        console.log(`[execute-all-automation-rules] Executing rule: ${rule.rule_name} (Id: ${rule.Id})`);

        // Call execute-automation-rule edge function
        const executeResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/execute-automation-rule`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              ruleId: rule.Id, // ✅ Use capital I
              userId: rule.user_id,
              manualRun: false,
            }),
          }
        );

        const executeResult = await executeResponse.json();

        if (executeResponse.ok) {
          successCount++;
          results.push({
            ruleId: rule.id,
            ruleName: rule.rule_name,
            status: "success",
            result: executeResult,
          });
          console.log(`[execute-all-automation-rules] ✓ Rule ${rule.rule_name} executed successfully`);
        } else {
          failureCount++;
          results.push({
            ruleId: rule.id,
            ruleName: rule.rule_name,
            status: "failed",
            error: executeResult.error || "Unknown error",
          });
          console.error(`[execute-all-automation-rules] ✗ Rule ${rule.rule_name} failed:`, executeResult.error);
        }
      } catch (error) {
        failureCount++;
        results.push({
          ruleId: rule.id,
          ruleName: rule.rule_name,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error(`[execute-all-automation-rules] ✗ Error executing rule ${rule.rule_name}:`, error);
      }
    }

    console.log(`[execute-all-automation-rules] Execution complete. Success: ${successCount}, Failed: ${failureCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${activeRules.length} rules, executed ${successCount + failureCount}`,
        totalRules: activeRules.length,
        executedCount: successCount + failureCount,
        successCount,
        failureCount,
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[execute-all-automation-rules] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
