
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { NOCODB_CONFIG, getNocoDBHeaders } from "../_shared/nocodb-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOCODB_API_URL = NOCODB_CONFIG.BASE_URL;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://jtaekxrkubhwtqgodvtx.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const TABLES = {
  AUTOMATED_RULES: NOCODB_CONFIG.TABLES.AUTOMATED_RULES,
  SYNC_LOGS: NOCODB_CONFIG.TABLES.SYNC_LOGS,
};

serve(async (req) => {
  // 1. Handle CORS immediately
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ✅ FIX: Capture incoming Authorization header to forward to nested calls
    const incomingAuthHeader = req.headers.get("Authorization");
    const effectiveAuthToken = incomingAuthHeader?.replace('Bearer ', '') || SUPABASE_SERVICE_ROLE_KEY;

    // Parse body safely to check for manualRun
    let manualRun = false;
    try {
      const body = await req.json();
      manualRun = body.manualRun === true;
    } catch (e) {
      // Body might be empty for automated cron calls
    }

    console.log(`[auto-automation-rules-cron] 🕐 Starting cron job execution (Manual: ${manualRun})`);
    console.log(`[auto-automation-rules-cron] 🔑 Using auth from: ${incomingAuthHeader ? 'incoming header' : 'env variable'}`);

    if (!SUPABASE_URL || !effectiveAuthToken) {
      throw new Error("Supabase configuration not found or no auth token available");
    }

    // Fetch all active automation rules
    // We still filter by is_active=true even for manual run (unless we want to force inactive ones too, but likely not)
    const filter = '(is_active,eq,true)';
    const whereClause = encodeURIComponent(filter);
    const rulesUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?where=${whereClause}&limit=1000`;

    console.log(`[auto-automation-rules-cron] 🔍 Fetching active rules from: ${rulesUrl}`);

    const rulesResponse = await fetch(rulesUrl, {
      method: "GET",
      headers: getNocoDBHeaders(),
    });

    if (!rulesResponse.ok) {
      const errorText = await rulesResponse.text();
      console.error(`[auto-automation-rules-cron] ❌ Failed to fetch rules:`, {
        status: rulesResponse.status,
        url: rulesUrl,
        error: errorText
      });
      throw new Error(`Failed to fetch rules: ${rulesResponse.status} - ${errorText}`);
    }

    const rulesData = await rulesResponse.json();
    const allRules = rulesData.list || [];

    console.log(`[auto-automation-rules-cron] Found ${allRules.length} active rules`);

    // Filter rules that are ready to run
    const readyRules = [];

    for (const rule of allRules) {
      try {
        // Parse advanced_settings if it's a string
        let advancedSettings = rule.advanced_settings || {};
        if (typeof advancedSettings === 'string') {
          try {
            advancedSettings = JSON.parse(advancedSettings);
          } catch (e) {
            console.error(`[auto-automation-rules-cron] ⚠️ Failed to parse advanced_settings for rule ${rule.rule_name}`);
            advancedSettings = {};
          }
        }

        // If Manual Run, bypass schedule checks
        if (!manualRun) {
          // ✅ Check 1: Must have enableAutoSchedule enabled
          if (!advancedSettings.enableAutoSchedule) {
            console.log(`[auto-automation-rules-cron] ⏭️ Skipping rule ${rule.Id} (${rule.rule_name}) - auto-schedule disabled`);
            continue;
          }

          // ✅ Check 2: Must have checkFrequency set
          const checkFrequency = advancedSettings.checkFrequency || rule.checkFrequency;
          if (!checkFrequency || checkFrequency < 1) {
            console.log(`[auto-automation-rules-cron] ⏭️ Skipping rule ${rule.Id} (${rule.rule_name}) - invalid checkFrequency: ${checkFrequency}`);
            continue;
          }

          // ✅ Check 3: Not currently processing (unless stuck > 10 minutes)
          if (rule.processing_status === 'processing') {
            const processingStartedAt = rule.processing_started_at ? new Date(rule.processing_started_at).getTime() : 0;
            const now = Date.now();
            const minutesProcessing = (now - processingStartedAt) / (60 * 1000);

            if (minutesProcessing > 10) {
              console.log(`[auto-automation-rules-cron] ⚠️ Rule ${rule.Id} (${rule.rule_name}) stuck for ${Math.round(minutesProcessing)} minutes - will force unlock`);
              // Allow this rule to run (it will unlock itself)
            } else {
              console.log(`[auto-automation-rules-cron] ⏭️ Skipping rule ${rule.Id} (${rule.rule_name}) - currently processing (${Math.round(minutesProcessing)} minutes)`);
              continue;
            }
          }

          // ✅ Check 4: Time to run based on checkFrequency
          const lastRunAt = rule.last_run_at ? new Date(rule.last_run_at).getTime() : 0;
          const intervalMs = checkFrequency * 60 * 1000;
          const nextRunTime = lastRunAt + intervalMs;
          const now = Date.now();

          if (now < nextRunTime) {
            const secondsRemaining = Math.round((nextRunTime - now) / 1000);
            console.log(`[auto-automation-rules-cron] ⏭️ Skipping rule ${rule.Id} (${rule.rule_name}) - not yet time (${secondsRemaining}s remaining)`);
            continue;
          }
        } else {
          console.log(`[auto-automation-rules-cron] ⚡ Manual Run: Bypassing schedule checks for rule ${rule.Id}`);
        }

        console.log(`[auto-automation-rules-cron] ✅ Rule ${rule.Id} (${rule.rule_name}) is ready to run`);
        readyRules.push({
          ...rule,
          advancedSettings,
        });

      } catch (error) {
        console.error(`[auto-automation-rules-cron] ❌ Error checking rule ${rule.Id}:`, error);
      }
    }

    console.log(`[auto-automation-rules-cron] 📋 ${readyRules.length} rules ready to execute`);

    if (readyRules.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No rules ready to execute",
          totalRules: allRules.length,
          readyRules: 0,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute each ready rule
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const rule of readyRules) {
      try {
        console.log(`[auto-automation-rules-cron] 🚀 Executing rule ${rule.Id} (${rule.rule_name})...`);

        // Call execute-automation-rule edge function using FETCH instead of supabase-js
        // ✅ FIX: Use effectiveAuthToken (forwarded from incoming request or env fallback)
        const executeUrl = `${SUPABASE_URL}/functions/v1/execute-automation-rule`;
        const executeResponse = await fetch(executeUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${effectiveAuthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ruleId: rule.Id,
            userId: rule.user_id,
            manualRun: manualRun, // ✅ Pass manualRun flag correctly
          })
        });

        if (!executeResponse.ok) {
          const errorText = await executeResponse.text();
          throw new Error(`Failed to invoke execute-automation-rule: ${executeResponse.status} - ${errorText}`);
        }

        const data = await executeResponse.json();

        successCount++;
        results.push({
          ruleId: rule.Id,
          ruleName: rule.rule_name,
          status: "success",
          result: data,
        });

        console.log(`[auto-automation-rules-cron] ✅ Rule ${rule.Id} (${rule.rule_name}) executed successfully`);

        // Delay 2 seconds between rules to avoid overload
        await new Promise((resolve) => setTimeout(resolve, 2000));

      } catch (error) {
        failureCount++;
        results.push({
          ruleId: rule.Id,
          ruleName: rule.rule_name,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error(`[auto-automation-rules-cron] ❌ Rule ${rule.Id} (${rule.rule_name}) failed:`, error);
      }
    }

    console.log(`[auto-automation-rules-cron] 🏁 Execution complete. Success: ${successCount}, Failed: ${failureCount}`);

    // ✅ Write Summary Log to SYNC_LOGS
    try {
      const summaryMessage = `Auto-Rules: Checked ${readyRules.length}/${allRules.length} active rules. Success: ${successCount}. Failed: ${failureCount}.`;
      await fetch(`${NOCODB_API_URL}/api/v2/tables/${TABLES.SYNC_LOGS}/records`, {
        method: 'POST',
        headers: getNocoDBHeaders(),
        body: JSON.stringify({
          status: failureCount > 0 ? 'warning' : 'success',
          details: JSON.stringify({ message: summaryMessage }),
          // message: summaryMessage // Use details as primary message holder based on frontend logic
        })
      });
      console.log('[auto-automation-rules-cron] 📝 Written summary log to SYNC_LOGS');
    } catch (logError) {
      console.error('[auto-automation-rules-cron] ⚠️ Failed to write summary log:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Executed ${successCount + failureCount} rules out of ${allRules.length} total`,
        totalRules: allRules.length,
        readyRules: readyRules.length,
        successCount,
        failureCount,
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[auto-automation-rules-cron] ❌ Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
