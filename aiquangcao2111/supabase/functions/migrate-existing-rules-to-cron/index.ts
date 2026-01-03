import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getUserFromRequest } from '../_shared/auth.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOCODB_API_URL = Deno.env.get("NOCODB_API_URL") || '';
const NOCODB_API_TOKEN = "u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij";
const AUTOMATED_RULES_TABLE = "mhmhfd4m16a1hln";

const getNocoDBHeaders = () => ({
  "xc-token": NOCODB_API_TOKEN,
  "Content-Type": "application/json",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user (Super Admin only for migration)
    const user = await getUserFromRequest(req);
    
    console.log(`🔄 [migrate-existing-rules-to-cron] Starting migration for user: ${user.id}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Fetch all rules with enableAutoSchedule = true from NocoDB
    const whereClause = encodeURIComponent('(enableAutoSchedule,eq,true)');
    const rulesUrl = `${NOCODB_API_URL}/api/v2/tables/${AUTOMATED_RULES_TABLE}/records?where=${whereClause}&limit=1000`;
    
    console.log(`🔄 [migrate-existing-rules-to-cron] Fetching rules from: ${rulesUrl}`);
    
    const rulesResponse = await fetch(rulesUrl, {
      method: "GET",
      headers: getNocoDBHeaders(),
    });
    
    if (!rulesResponse.ok) {
      throw new Error(`Failed to fetch rules: ${rulesResponse.status}`);
    }
    
    const rulesData = await rulesResponse.json();
    const rules = rulesData.list || [];
    
    console.log(`🔄 [migrate-existing-rules-to-cron] Found ${rules.length} rules with auto-schedule enabled`);
    
    const results = {
      total: rules.length,
      success: 0,
      failed: 0,
      errors: [] as any[]
    };
    
    // Process each rule
    for (const rule of rules) {
      try {
        console.log(`🔄 [migrate-existing-rules-to-cron] Processing rule ${rule.Id}: ${rule.rule_name}`);
        
        if (!rule.checkFrequency || rule.checkFrequency < 5) {
          console.log(`⚠️ [migrate-existing-rules-to-cron] Skipping rule ${rule.Id}: invalid checkFrequency (${rule.checkFrequency})`);
          results.failed++;
          results.errors.push({
            ruleId: rule.Id,
            ruleName: rule.rule_name,
            error: `Invalid checkFrequency: ${rule.checkFrequency}`
          });
          continue;
        }
        
        // Call manage-rule-cron to create the cron job
        const { data, error } = await supabase.functions.invoke('manage-rule-cron', {
          body: {
            action: 'create',
            ruleId: rule.Id,
            userId: rule.user_id,
            checkFrequency: rule.checkFrequency
          }
        });
        
        if (error) {
          console.error(`❌ [migrate-existing-rules-to-cron] Failed to create cron for rule ${rule.Id}:`, error);
          results.failed++;
          results.errors.push({
            ruleId: rule.Id,
            ruleName: rule.rule_name,
            error: error.message
          });
        } else {
          console.log(`✅ [migrate-existing-rules-to-cron] Successfully created cron for rule ${rule.Id}`);
          results.success++;
        }
        
      } catch (err) {
        console.error(`❌ [migrate-existing-rules-to-cron] Error processing rule ${rule.Id}:`, err);
        results.failed++;
        results.errors.push({
          ruleId: rule.Id,
          ruleName: rule.rule_name,
          error: err instanceof Error ? err.message : "Unknown error"
        });
      }
    }
    
    console.log(`🔄 [migrate-existing-rules-to-cron] Migration complete:`, results);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Migration completed",
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("❌ [migrate-existing-rules-to-cron] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
