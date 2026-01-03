import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getUserFromRequest } from '../_shared/auth.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const user = await getUserFromRequest(req);

    const { action, ruleId, userId, checkFrequency } = await req.json();

    console.log(`🔧 [manage-rule-cron] Action: ${action}, Rule ID: ${ruleId}`);

    // Validate input
    if (!action || !ruleId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: action, ruleId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Security: Verify user owns this rule (userId must match)
    if (userId && userId !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: You can only manage your own rules" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const cronJobName = `automation_rule_${ruleId}`;

    if (action === 'create' || action === 'update') {
      if (!checkFrequency || checkFrequency < 5 || checkFrequency > 1440) {
        return new Response(
          JSON.stringify({ error: "checkFrequency must be between 5 and 1440 minutes" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Convert checkFrequency to cron expression
      const cronExpression = `*/${checkFrequency} * * * *`;
      const functionUrl = `${supabaseUrl}/functions/v1/execute-automation-rule`;
      const authHeader = `Bearer ${supabaseServiceKey}`;

      console.log(`🔧 [manage-rule-cron] Creating/Updating cron job: ${cronJobName}`);
      console.log(`🔧 [manage-rule-cron] Cron expression: ${cronExpression}`);

      // Delete existing cron job if updating
      if (action === 'update') {
        try {
          await supabase.rpc('cron.unschedule', { job_name: cronJobName });
          console.log(`✅ [manage-rule-cron] Deleted existing cron job: ${cronJobName}`);
        } catch (err) {
          console.log(`⚠️ [manage-rule-cron] Could not delete existing cron (may not exist): ${err}`);
        }
      }

      // Create new cron job using dedicated RPC
      console.log(`🔧 [manage-rule-cron] Calling manage_automation_cron RPC`);

      const { data, error } = await supabase.rpc('manage_automation_cron', {
        job_name: cronJobName,
        schedule_expression: cronExpression,
        function_url: functionUrl,
        auth_header: authHeader,
        payload: { ruleId, userId, manualRun: false }
      });

      if (error) {
        console.error(`❌ [manage-rule-cron] Failed to create cron job:`, error);
        return new Response(
          JSON.stringify({
            error: `Failed to create cron job: ${error.message}`,
            details: error
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`✅ [manage-rule-cron] Successfully created cron job: ${cronJobName}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Cron job ${action}d successfully`,
          cronJobName,
          cronExpression,
          checkFrequency
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === 'delete') {
      console.log(`🗑️ [manage-rule-cron] Deleting cron job: ${cronJobName}`);

      const { data, error } = await supabase.rpc('delete_automation_cron', {
        job_name: cronJobName
      });

      if (error) {
        console.error(`❌ [manage-rule-cron] Failed to delete cron job:`, error);

        // Don't fail if cron doesn't exist - treat as success
        const errorMsg = error.message || '';
        if (errorMsg.includes('does not exist') || errorMsg.includes('could not find') || error.code === 'XX000') {
          console.log(`⚠️ [manage-rule-cron] Cron job ${cronJobName} does not exist, treating as success`);
          return new Response(
            JSON.stringify({
              success: true,
              message: "Cron job deleted (or did not exist)",
              cronJobName
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            error: `Failed to delete cron job: ${error.message}`,
            details: error
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`✅ [manage-rule-cron] Successfully deleted cron job: ${cronJobName}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Cron job deleted successfully",
          cronJobName
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: `Invalid action: ${action}. Must be 'create', 'update', or 'delete'` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("❌ [manage-rule-cron] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
