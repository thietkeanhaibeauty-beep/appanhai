import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalize URL to remove trailing slashes
const normalizeUrl = (url: string) => url?.replace(/\/+$/, '') || '';
const NOCODB_API_URL = normalizeUrl('https://db.hpb.edu.vn');
const NOCODB_API_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";

const TABLES = {
  CAMPAIGN_LABELS: "m37ye177g4m98st",
  AUTOMATED_RULES: "mlsshti794grsvf",
  FACEBOOK_AD_ACCOUNTS: "ms3iubpejoynr9a",
  FACEBOOK_INSIGHTS: "m17gyigy8jqlaoz", // ✅ PATCHED: AUTO table
  CAMPAIGN_LABEL_ASSIGNMENTS: "myjgw4ial5s6zrw",
  AUTOMATION_RULE_EXECUTION_LOGS: "masstbinn3h8hkr",
  SALES_REPORTS: "me14lqzoxj5xwar",
  PENDING_REVERTS: "mlh0pm0padym9i1",
};

// ✅ SALES METRICS HELPER (Added 12/12)
// ✅ FIX 16/12: Added campaignId for fallback when adset has no direct sales data
async function fetchSalesMetrics(
  objectId: string,
  objectType: string,
  dateStart: string,
  dateEnd: string,
  campaignId?: string // ✅ NEW: For fallback when adset has no data
): Promise<{ phone_count: number; booking_count: number; total_revenue: number; service_revenue: number; message_count: number }> {
  try {
    // Determine which field to filter by based on object type
    let filterField = 'campaign_id';
    if (objectType === 'adset') filterField = 'adset_id';
    else if (objectType === 'ad') filterField = 'ad_id';

    // ✅ FIX: Only filter by object_id to avoid 422 error on date format
    // Date filtering will be done client-side
    const where = encodeURIComponent(`(${filterField},eq,${objectId})`);

    const url = `${NOCODB_API_URL}/api/v2/tables/${TABLES.SALES_REPORTS}/records?where=${where}&limit=1000`;
    const resp = await fetchWithTimeout(url, {
      method: 'GET',
      headers: getNocoDBHeaders()
    });

    if (!resp.ok) {
      console.warn(`[SALES] Failed to fetch sales data: ${resp.status}`);
      return { phone_count: 0, booking_count: 0, total_revenue: 0, service_revenue: 0, message_count: 0 };
    }

    const data = await resp.json();
    let records = data.list || [];

    // ✅ Helper to extract date only (YYYY-MM-DD) from various formats
    const extractDate = (dateStr: string | null | undefined): string => {
      if (!dateStr) return '';
      // Handle both "2025-12-16T14:23:00" and "2025-12-16 14:23" formats
      return dateStr.split('T')[0].split(' ')[0];
    };

    // ✅ FIX: Filter by date range using CreatedAt FIRST (like AdsReport), then fallback to ad_date
    // This matches the behavior in AdsReportAuto.tsx which uses sale.CreatedAt
    console.log(`[SALES] Filtering by date: ${dateStart} to ${dateEnd}`);
    records = records.filter((r: any) => {
      const recordDate = extractDate(r.CreatedAt || r.ad_date);
      const inRange = recordDate >= dateStart && recordDate <= dateEnd;
      if (!inRange && records.length <= 5) {
        console.log(`[SALES] Excluded: recordDate=${recordDate}, ad_date=${r.ad_date}, CreatedAt=${r.CreatedAt}`);
      }
      return inRange;
    });
    console.log(`[SALES] After date filter: ${records.length} records`);

    // ✅ FALLBACK: If no records found for adset, try with campaign_id
    if (records.length === 0 && objectType === 'adset' && campaignId) {
      console.log(`[SALES] No records for adset ${objectId}, trying campaign ${campaignId}...`);
      const fallbackWhere = encodeURIComponent(`(campaign_id,eq,${campaignId})`);
      const fallbackUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLES.SALES_REPORTS}/records?where=${fallbackWhere}&limit=1000`;
      const fallbackResp = await fetchWithTimeout(fallbackUrl, {
        method: 'GET',
        headers: getNocoDBHeaders()
      });

      if (fallbackResp.ok) {
        const fallbackData = await fallbackResp.json();
        const rawFallback = fallbackData.list || [];
        console.log(`[SALES] Fallback raw records: ${rawFallback.length}`);

        records = rawFallback.filter((r: any) => {
          const recordDate = extractDate(r.CreatedAt || r.ad_date);
          return recordDate >= dateStart && recordDate <= dateEnd;
        });
        console.log(`[SALES] Fallback found ${records.length} records from campaign_id`);
      }
    }

    // Aggregate
    const phone_count = records.filter((r: any) => r.phone_number && r.phone_number.trim() !== '').length;
    const booking_count = records.filter((r: any) =>
      r.appointment_status === 'Đã đặt lịch' || r.appointment_status === 'Đã đến'
    ).length;

    // Split Revenue Calculation
    const service_revenue = records.reduce((sum: number, r: any) => sum + (parseFloat(r.service_revenue) || 0), 0);
    const total_revenue = records.reduce((sum: number, r: any) => sum + (parseFloat(r.total_revenue) || parseFloat(r.service_revenue) || 0), 0);

    const message_count = records.length; // Each record = 1 message/lead

    console.log(`[SALES] ${objectType}=${objectId}: Phone=${phone_count}, Booking=${booking_count}, Rev=${total_revenue}, SvcRev=${service_revenue}`);

    return { phone_count, booking_count, total_revenue, service_revenue, message_count };
  } catch (e) {
    console.error('[SALES] Error fetching sales metrics:', e);
    return { phone_count: 0, booking_count: 0, total_revenue: 0, service_revenue: 0, message_count: 0 };
  }
}

const getNocoDBHeaders = () => ({
  "xc-token": NOCODB_API_TOKEN,
  "Content-Type": "application/json",
});

interface RuleCondition {
  metric: string;
  operator: string;
  value: number;
}

interface RuleAction {
  type: string;
  value?: number | string;
  budgetMode?: "percentage" | "absolute";
  useSchedule?: boolean;
  executeAt?: string;
  autoRevert?: boolean;
  revertAtTime?: string;
  revertAfterHours?: number;
  revertAction?: string;
}

// User-defined timeout helper
async function fetchWithTimeout(resource: string, options: any = {}) {
  const { timeout = 20000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let pendingLogId: string | null = null;

  try {
    const { ruleId, userId, manualRun = false, dryRun = false } = await req.json();

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 [AUTOMATION] Starting execution (RESTORED BACKUP MODE + PATCH)`);
    console.log(`   Rule ID: ${ruleId}`);
    console.log(`   User ID: ${userId}`);
    console.log(`${'='.repeat(80)}\n`);

    // Lock Rule
    await fetchWithTimeout(
      `${NOCODB_API_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records`,
      {
        method: 'PATCH',
        headers: getNocoDBHeaders(),
        body: JSON.stringify({ Id: ruleId, processing_status: 'processing', processing_started_at: new Date().toISOString() }),
      }
    ).catch(e => console.error("Lock failed", e));

    try {
      // Get rule
      const ruleUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?where=${encodeURIComponent(`(Id,eq,${ruleId})`)}`;
      const ruleResponse = await fetchWithTimeout(ruleUrl, { method: "GET", headers: getNocoDBHeaders() });
      if (!ruleResponse.ok) throw new Error("Rule not found");
      const ruleData = await ruleResponse.json();
      const rawRule = ruleData.list?.[0];
      const rule = rawRule ? parseRuleData(rawRule) : null;

      if (!rule) throw new Error("Rule not found");

      // Normalize labels
      if (rule.target_labels) {
        if (typeof rule.target_labels === 'string') rule.target_labels = rule.target_labels.split(',');
        else if (typeof rule.target_labels === 'number') rule.target_labels = [String(rule.target_labels)];
        else if (Array.isArray(rule.target_labels)) rule.target_labels = rule.target_labels.map(String);
      }

      // Check active
      if (!rule.is_active && !manualRun) {
        return new Response(JSON.stringify({ message: "Rule is inactive", matchedCount: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create Pending Log EARLY to capture any setup errors
      const pendingLogResponse = await fetchWithTimeout(
        `${NOCODB_API_URL}/api/v2/tables/${TABLES.AUTOMATION_RULE_EXECUTION_LOGS}/records`,
        {
          method: "POST",
          headers: getNocoDBHeaders(),
          body: JSON.stringify({
            rule_id: ruleId,
            executed_at: new Date().toISOString(),
            status: "pending",
            matched_objects_count: 0,
            executed_actions_count: 0,
            details: JSON.stringify([{ message: "Bắt đầu thực thi quy tắc (Backup Mode)..." }]),
          }),
        }
      );

      if (pendingLogResponse.ok) {
        const d = await pendingLogResponse.json();
        pendingLogId = d.Id;
      }

      // Get All Active Ad Accounts FOR THIS USER
      const accountResponse = await fetchWithTimeout(
        `${NOCODB_API_URL}/api/v2/tables/${TABLES.FACEBOOK_AD_ACCOUNTS}/records?where=(is_active,eq,1)~and(user_id,eq,${userId})&limit=100`,
        { method: "GET", headers: getNocoDBHeaders() }
      );
      const accountData = await accountResponse.json();
      const adAccounts = accountData.list || [];
      console.log(`[DEBUG] Found ${adAccounts.length} active ad accounts.`);
      if (adAccounts.length === 0) throw new Error("No active ad account");

      // Use the first account for timezone context (User-level timezone preference could be better, but this is a safe default)
      const primaryAccount = adAccounts[0];
      const { startDate, endDate } = getDateRange(rule.time_range, primaryAccount.timezone_name || 'Asia/Ho_Chi_Minh');

      // Create Token and Currency Map
      const accountTokenMap: Record<string, string> = {};
      const accountCurrencyMap: Record<string, string> = {};
      adAccounts.forEach((acc: any) => {
        if (acc.account_id) {
          if (acc.access_token) {
            accountTokenMap[acc.account_id] = acc.access_token;
            // Handle potential lack of 'act_' prefix consistency
            const cleanId = acc.account_id.replace('act_', '');
            accountTokenMap[cleanId] = acc.access_token;
            accountTokenMap[`act_${cleanId}`] = acc.access_token;
          }
          if (acc.currency) {
            accountCurrencyMap[acc.account_id] = acc.currency;
            const cleanId = acc.account_id.replace('act_', '');
            accountCurrencyMap[cleanId] = acc.currency;
            accountCurrencyMap[`act_${cleanId}`] = acc.currency;
          }
        }
      });
      console.log(`[DEBUG] Currency Map:`, JSON.stringify(accountCurrencyMap));

      // Fetch IDs if labels are present
      let labeledCampaignIds: any[] = [];
      let labeledAdSetIds: any[] = [];
      let labeledAdIds: any[] = [];
      let hasLabels = false;

      // Robust Label Parsing
      let labelIdsArr: string[] = [];
      if (rule.target_labels) {
        if (Array.isArray(rule.target_labels)) {
          labelIdsArr = rule.target_labels.map(String);
        } else if (typeof rule.target_labels === 'string') {
          try {
            const parsed = JSON.parse(rule.target_labels);
            labelIdsArr = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
          } catch {
            labelIdsArr = [rule.target_labels];
          }
        } else {
          // Handle Numbers etc.
          labelIdsArr = [String(rule.target_labels)];
        }
      }

      if (labelIdsArr.length > 0) {
        hasLabels = true;
        const labelQuery = labelIdsArr.join(",");
        const labelResponse = await fetchWithTimeout(
          `${NOCODB_API_URL}/api/v2/tables/${TABLES.CAMPAIGN_LABEL_ASSIGNMENTS}/records?where=${encodeURIComponent(`(label_id,in,${labelQuery})`)}&limit=1000`,
          { method: "GET", headers: getNocoDBHeaders() }
        );
        const labelData = await labelResponse.json();
        const labeledObjects = (labelData.list || []).filter((obj: any) => obj.user_id === userId);

        console.log(`[DEBUG] Label Query: label_id IN (${labelQuery})`);
        console.log(`[DEBUG] Raw Label Assignments: ${(labelData.list || []).length} total`);
        console.log(`[DEBUG] After user_id filter (${userId}): ${labeledObjects.length} remaining`);
        if (labeledObjects.length > 0) {
          console.log(`[DEBUG] First labeled object: ${JSON.stringify(labeledObjects[0])}`);
        }

        labeledCampaignIds = labeledObjects.map((obj: any) => obj.campaign_id).filter((id: any) => id);
        labeledAdSetIds = labeledObjects.map((obj: any) => obj.adset_id).filter((id: any) => id);
        labeledAdIds = labeledObjects.map((obj: any) => obj.ad_id).filter((id: any) => id);

        console.log(`[DEBUG] Labeled Objects: Campaigns=${labeledCampaignIds.length}, AdSets=${labeledAdSetIds.length}, Ads=${labeledAdIds.length}`);
        if (labeledAdSetIds.length > 0) {
          console.log(`[DEBUG] Labeled AdSet IDs: ${labeledAdSetIds.join(', ')}`);
        }

        if (labeledCampaignIds.length === 0 && labeledAdSetIds.length === 0 && labeledAdIds.length === 0) {
          // Log no matches
          if (pendingLogId) {
            await fetchWithTimeout(`${NOCODB_API_URL}/api/v2/tables/${TABLES.AUTOMATION_RULE_EXECUTION_LOGS}/records/${pendingLogId}`, {
              method: 'PATCH',
              headers: getNocoDBHeaders(),
              body: JSON.stringify({
                status: 'success',
                matched_objects_count: 0,
                details: JSON.stringify([{ message: "Không tìm thấy đối tượng nào có nhãn phù hợp." }])
              })
            });
          }
          return new Response(JSON.stringify({ message: 'No labeled objects found', matchedCount: 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }


      // Build Insights Query - ✅ FIX v2: Smart level detection
      // If labels are only on a different level than scope, query at that level first
      let queryLevel = rule.scope;
      const conditions = [];

      // Detect label level
      const hasOnlyAdSetLabels = labeledAdSetIds.length > 0 && labeledCampaignIds.length === 0;
      const hasOnlyAdLabels = labeledAdIds.length > 0 && labeledCampaignIds.length === 0 && labeledAdSetIds.length === 0;

      if (rule.scope === 'campaign') {
        if (labeledCampaignIds.length > 0) {
          conditions.push(`(campaign_id,in,${labeledCampaignIds.join(',')})`);
        } else if (hasOnlyAdSetLabels) {
          // ✅ FIX: Query at adset level, aggregateByScope() will aggregate to campaign
          queryLevel = 'adset';
          conditions.push(`(adset_id,in,${labeledAdSetIds.join(',')})`);
          console.log(`[INFO] Scope=campaign but labels on adset → querying level=adset then aggregating`);
        } else if (hasOnlyAdLabels) {
          queryLevel = 'ad';
          conditions.push(`(ad_id,in,${labeledAdIds.join(',')})`);
          console.log(`[INFO] Scope=campaign but labels on ad → querying level=ad then aggregating`);
        }
      } else if (rule.scope === 'adset') {
        if (labeledCampaignIds.length > 0) conditions.push(`(campaign_id,in,${labeledCampaignIds.join(',')})`);
        if (labeledAdSetIds.length > 0) conditions.push(`(adset_id,in,${labeledAdSetIds.join(',')})`);
      } else {
        // For ad scope, include all
        if (labeledCampaignIds.length > 0) conditions.push(`(campaign_id,in,${labeledCampaignIds.join(',')})`);
        if (labeledAdSetIds.length > 0) conditions.push(`(adset_id,in,${labeledAdSetIds.join(',')})`);
        if (labeledAdIds.length > 0) conditions.push(`(ad_id,in,${labeledAdIds.join(',')})`);
      }

      let idFilter = "";
      if (conditions.length > 0) {
        idFilter = conditions.length > 1 ? `(${conditions.join('~or')})` : conditions[0];
      }

      let whereClause = `(user_id,eq,${userId})~and(level,eq,${queryLevel})`;
      if (hasLabels && idFilter) {
        whereClause += `~and${idFilter}`;
      } else if (hasLabels && !idFilter) {
        // No matching IDs - skip
        console.log(`[WARN] Labels found but no matching IDs for query. Skipping.`);
        if (pendingLogId) {
          await fetchWithTimeout(`${NOCODB_API_URL}/api/v2/tables/${TABLES.AUTOMATION_RULE_EXECUTION_LOGS}/records/${pendingLogId}`, {
            method: 'PATCH',
            headers: getNocoDBHeaders(),
            body: JSON.stringify({
              status: 'skipped',
              matched_objects_count: 0,
              details: JSON.stringify([{ message: `Không tìm thấy dữ liệu cho nhãn được chọn.` }])
            })
          });
        }
        return new Response(JSON.stringify({ message: 'No matching IDs found', matchedCount: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const insightsWhere = encodeURIComponent(whereClause);
      const insightsUrl = `${NOCODB_API_URL}/api/v2/tables/${TABLES.FACEBOOK_INSIGHTS}/records?where=${insightsWhere}&limit=1000&sort=-date_start`;

      // ✅ DEBUG: Log the full query
      console.log(`[DEBUG] Insights Query: ${whereClause}`);
      console.log(`[DEBUG] Labeled AdSet IDs: ${JSON.stringify(labeledAdSetIds)}`);

      const insightsResponse = await fetchWithTimeout(insightsUrl, { method: "GET", headers: getNocoDBHeaders() });
      const insightsData = await insightsResponse.json();
      const rawRecords = insightsData.list || [];

      // ✅ DEBUG: Log raw records before date filter
      console.log(`[DEBUG] Raw records from DB: ${rawRecords.length}`);
      if (rawRecords.length > 0) {
        console.log(`[DEBUG] Sample record: adset_id=${rawRecords[0].adset_id}, date_start=${rawRecords[0].date_start}, level=${rawRecords[0].level}`);
      }

      const insights = rawRecords.filter((i: any) => i.date_start.split('T')[0] >= startDate && i.date_start.split('T')[0] <= endDate);

      console.log(`[DEBUG] Insights after date filter: ${insights.length} records. Date Range: ${startDate} to ${endDate}`);

      const basicAggregatedData = aggregateByScope(insights, rule.scope, accountCurrencyMap);

      // ✅ ENRICH WITH SALES METRICS (sdt_rate, booking_rate, revenue_rate)
      const aggregatedData = await enrichWithSalesMetrics(basicAggregatedData, rule.scope, startDate, endDate);

      // ✅ REFAC: Multi-step Execution Logic (Added 16/12)
      // Iterate through ALL objects and check Main Rule + Steps
      const executionResults: any[] = [];
      const matchedObjectIds = new Set<string>();

      // Sort steps by order
      const steps = Array.isArray(rule.steps) ? rule.steps.sort((a: any, b: any) => (a.order || 99) - (b.order || 99)) : [];

      for (const obj of aggregatedData) {
        const actionsToExecute: RuleAction[] = [];
        let isRefMatched = false; // Track if previous step/main matched for AND logic

        // ============================================
        // PHASE 1: CHECK FOR OVERRIDE (action = "keep")
        // ============================================
        let isOverrideActive = false;
        let overrideReason = '';
        let overrideStepName = '';

        console.log(`[OVERRIDE-DEBUG] Checking ${steps.length} steps for Override (action=keep) for object ${obj.name}`);

        for (const step of steps) {
          const stepLogic = step.logic || 'OR';

          // Skip AND-logic steps if main rule didn't match (for Override check too)
          // But typically Override steps are OR logic (independent)

          const stepMatch = evaluateConditions(obj, step.conditions, step.condition_logic || 'all');

          console.log(`[OVERRIDE-DEBUG] Step ${step.order} "${step.name || 'unnamed'}": action=${step.action?.type}, match=${stepMatch}`);

          if (stepMatch && step.action?.type === 'keep') {
            isOverrideActive = true;
            overrideStepName = step.name || `Bước ${step.order}`;
            overrideReason = `Điều kiện bảo vệ "${overrideStepName}" khớp - chặn các hành động khác`;
            console.log(`[OVERRIDE] 🛡️ Step "${overrideStepName}" matched for ${obj.name} - blocking other actions`);
            break; // One Override is enough to block
          }
        }

        // If Override is active, skip all other actions and mark as blocked
        if (isOverrideActive) {
          matchedObjectIds.add(obj.id);
          executionResults.push({
            objectId: obj.id,
            objectName: obj.name,
            result: 'blocked',
            reason: overrideReason,
            overrideBy: overrideStepName
          });
          console.log(`[OVERRIDE] ✅ Object ${obj.name} protected by Override - skipping execution`);
          continue; // Skip to next object
        }

        // ============================================
        // PHASE 2: COLLECT AND EXECUTE ACTIONS (no Override)
        // ============================================

        // 1. Check Main Rule (Level 0)
        const mainMatch = evaluateConditions(obj, rule.conditions, rule.condition_logic);
        isRefMatched = mainMatch;

        if (mainMatch) {
          actionsToExecute.push(...rule.actions);
        }

        // 2. Check Steps (Level 1+) - only non-keep actions
        for (const step of steps) {
          const stepLogic = step.logic || 'OR';

          if (stepLogic === 'AND' && !mainMatch) {
            continue;
          }

          const stepMatch = evaluateConditions(obj, step.conditions, step.condition_logic || 'all');

          if (stepMatch) {
            // Only push non-keep actions (keep actions were handled in Phase 1)
            if (step.action && step.action.type !== 'keep') {
              actionsToExecute.push(step.action);
            }
          }
        }

        // 3. Execute Actions if any match found
        if (actionsToExecute.length > 0) {
          matchedObjectIds.add(obj.id);

          for (const action of actionsToExecute) {
            try {
              // ✅ Check history (mocked)
              const historyCheck = await checkExecutionHistory(rule.Id, obj.id, rule.scope, userId, action.type, { ...rule.advanced_settings, manualRun });
              if (!historyCheck.canExecute) {
                executionResults.push({ objectId: obj.id, result: 'skipped', reason: historyCheck.reason });
                continue;
              }

              // Look up token
              const targetAccountId = obj.account_id;
              const token = accountTokenMap[targetAccountId] || primaryAccount.access_token;
              const targetCurrency = accountCurrencyMap[targetAccountId] || primaryAccount.currency || 'VND';
              const timezone = primaryAccount.timezone_name || 'Asia/Ho_Chi_Minh';

              const result = await executeAction(
                action, obj.id, token, rule.advanced_settings || {}, rule, obj, targetCurrency, timezone
              );
              executionResults.push({ objectId: obj.id, result: 'success', details: result });
            } catch (e: any) {
              executionResults.push({ objectId: obj.id, result: 'failed', error: e.message });
            }
          }
        }
      }

      const matchedObjectsCount = matchedObjectIds.size;
      const matchedObjects = aggregatedData.filter(o => matchedObjectIds.has(o.id)); // For stats

      // Update Log
      if (pendingLogId) {
        try {
          const hasMatches = matchedObjects.length > 0;
          const finalStatus = hasMatches ? 'success' : 'skipped';
          const finalDetails = hasMatches
            ? JSON.stringify(executionResults)
            : JSON.stringify([
              { message: "Không có đối tượng nào thỏa mãn điều kiện quy tắc." },
              { message: `[DEBUG INFO] ${aggregatedData[0]?._currency_debug || 'No data generated'}` }
            ]);

          const logUpdateRes = await fetchWithTimeout(`${NOCODB_API_URL}/api/v2/tables/${TABLES.AUTOMATION_RULE_EXECUTION_LOGS}/records`, {
            method: 'PATCH',
            headers: getNocoDBHeaders(),
            body: JSON.stringify({
              Id: pendingLogId,
              status: finalStatus,
              matched_objects_count: matchedObjects.length,
              executed_actions_count: executionResults.length,
              details: finalDetails
            })
          });
          if (!logUpdateRes.ok) throw new Error(await logUpdateRes.text());
        } catch (logErr: any) {
          console.error("Log Full Update Failed, trying minimal:", logErr);
          // Fallback to minimal update
          const hasMatches = matchedObjects.length > 0;
          await fetchWithTimeout(`${NOCODB_API_URL}/api/v2/tables/${TABLES.AUTOMATION_RULE_EXECUTION_LOGS}/records`, {
            method: 'PATCH',
            headers: getNocoDBHeaders(),
            body: JSON.stringify({
              Id: pendingLogId,
              status: hasMatches ? 'success' : 'skipped',
              matched_objects_count: matchedObjects.length,
              executed_actions_count: executionResults.length,
              details: JSON.stringify([{ message: "Log details too large or invalid.", error: logErr.message }])
            })
          }).catch(e => console.error("Minimal Log Update Failed:", e));
        }
      }

      // Update Rule Stats
      await fetchWithTimeout(`${NOCODB_API_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records/${rule.Id}`, {
        method: 'PATCH',
        headers: getNocoDBHeaders(),
        body: JSON.stringify({
          last_run_at: new Date().toISOString(),
          last_execution_status: matchedObjects.length > 0 ? 'success' : 'skipped'
        })
      });

      return new Response(JSON.stringify({ success: true, matchedCount: matchedObjects.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (err: any) {
      console.error(err);
      if (pendingLogId) {
        await fetchWithTimeout(`${NOCODB_API_URL}/api/v2/tables/${TABLES.AUTOMATION_RULE_EXECUTION_LOGS}/records`, {
          method: 'PATCH',
          headers: getNocoDBHeaders(),
          body: JSON.stringify({
            Id: pendingLogId,
            status: 'failed',
            details: JSON.stringify([{ message: err.message }])
          })
        });
      }
      throw err;
    } finally {
      await fetchWithTimeout(
        `${NOCODB_API_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records`,
        {
          method: 'PATCH',
          headers: getNocoDBHeaders(),
          body: JSON.stringify({ Id: ruleId, processing_status: 'idle' }),
        }
      ).catch(e => console.error(e));
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});

// --- HELPER FUNCTIONS ---
function parseRuleData(rule: any) {
  try {
    if (typeof rule.conditions === 'string') rule.conditions = JSON.parse(rule.conditions);
    if (typeof rule.actions === 'string') rule.actions = JSON.parse(rule.actions);
    if (typeof rule.advanced_settings === 'string') rule.advanced_settings = JSON.parse(rule.advanced_settings);
    if (typeof rule.target_labels === 'string') rule.target_labels = JSON.parse(rule.target_labels);
    // ✅ FIX: Also parse steps (multi-step rules)
    if (typeof rule.steps === 'string') rule.steps = JSON.parse(rule.steps);
  } catch (e) {
    console.error('[parseRuleData] Error parsing rule fields:', e);
  }
  return rule;
}

// REST OF HELPERS WILL BE APPENDED via multi_replace_file_content to avoid token limits

function getDateRange(timeRange: string, timezone: string) {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options); // YYYY-MM-DD format

  const getDateString = (date: Date) => formatter.format(date);

  let startDate = new Date(now);
  let endDate = new Date(now);

  switch (timeRange) {
    case 'today': break;
    case 'yesterday': startDate.setDate(now.getDate() - 1); endDate.setDate(now.getDate() - 1); break;
    case 'last_3d': startDate.setDate(now.getDate() - 2); break;
    case 'last_7d': startDate.setDate(now.getDate() - 6); break;
    case 'last_14d': startDate.setDate(now.getDate() - 13); break;
    case 'last_30d': startDate.setDate(now.getDate() - 29); break;
    case 'this_month': startDate.setDate(1); break;
    default: startDate.setDate(now.getDate() - 6);
  }

  return { startDate: getDateString(startDate), endDate: getDateString(endDate) };
}

// ✅ FIX: Database stores spend in cents, must divide by 100
function aggregateByScope(insights: any[], scope: string, currencyMap: Record<string, string>) {
  const grouped: any = {};
  insights.forEach((insight) => {
    let key = scope === "campaign" ? insight.campaign_id : scope === "adset" ? insight.adset_id : insight.ad_id;
    let name = insight.campaign_name || insight.adset_name || insight.ad_name || insight.name;
    if (!key) return;

    if (!grouped[key]) {
      grouped[key] = {
        id: key,
        name,
        level: scope,
        account_id: insight.account_id, // Preserve Account ID
        campaign_id: insight.campaign_id, // ✅ FIX: Store campaign_id for fallback sales lookup
        spend: 0,
        impressions: 0,
        clicks: 0,
        results: 0
      };
    }

    const accountId = insight.account_id;
    const cleanAccountId = accountId?.replace('act_', '');
    const rawCurrency = currencyMap[accountId] || currencyMap[cleanAccountId] || 'VND';
    const currency = String(rawCurrency).toUpperCase().trim();

    // ✅ FIX: Handle Currency Division
    // VND/VNĐ: No division
    // USD/Others: Divide by 100
    let spendValue = parseFloat(insight.spend || 0);
    const isVND = ['VND', 'VNĐ'].includes(currency);

    // Log the FIRST record only to avoid spam
    if (insights.length <= 5) {
      console.log(`[DEBUG] Row Currency Check: Account=${accountId} | RawCurrency=${rawCurrency} | IsVND=${isVND} | OriginalSpend=${spendValue}`);
    }

    if (!isVND) {
      spendValue = spendValue / 100;
    }

    grouped[key].spend += spendValue;
    grouped[key].results += parseInt(insight.results || 0);
  });
  return Object.values(grouped).map((obj: any) => {
    const cpr = obj.results > 0 ? obj.spend / obj.results : 0;
    console.log(`[DEBUG] Calc: ${obj.name} | Spend=${obj.spend} | Results=${obj.results} | CPR=${cpr} | [CURRENCY DEBUG] Raw=${obj._currency_debug}`);
    return { ...obj, cost_per_result: cpr };
  });
}

// ✅ ENRICH WITH SALES METRICS (Added 12/12)
async function enrichWithSalesMetrics(
  aggregatedData: any[],
  scope: string,
  dateStart: string,
  dateEnd: string
): Promise<any[]> {
  const enrichedData = [];

  for (const obj of aggregatedData) {
    // ✅ FIX: Pass campaign_id for fallback when adset has no direct sales data
    const salesMetrics = await fetchSalesMetrics(obj.id, scope, dateStart, dateEnd, obj.campaign_id);

    // Calculate rates
    const sdt_rate = obj.results > 0 ? (salesMetrics.phone_count / obj.results) * 100 : 0;
    // ✅ NEW: Cost per phone (Chi phí/SĐT)
    const cost_per_phone = salesMetrics.phone_count > 0 ? obj.spend / salesMetrics.phone_count : 0;
    // ✅ FIX: booking_rate dựa trên kết quả (FB), không phải phone_count
    const booking_rate = obj.results > 0 ? (salesMetrics.booking_count / obj.results) * 100 : 0;
    const revenue_rate = obj.spend > 0 ? (salesMetrics.total_revenue / obj.spend) * 100 : 0; // % Doanh thu / Chi phí

    // ✅ Advanced Financial Metrics
    // 1. Cost per Appointment (Chi phí/Đặt lịch)
    const cost_per_appointment = salesMetrics.booking_count > 0 ? obj.spend / salesMetrics.booking_count : 0;

    // 2. Cost per Service Revenue (Chi phí/Doanh thu DV) - Ratio not %? Based on UI it might be Ratio. 
    // If user meant "Chi phí MKT / Doanh thu DV (%)", see marketing_service_ratio
    const cost_per_service_revenue = salesMetrics.service_revenue > 0 ? obj.spend / salesMetrics.service_revenue : 0;

    // 3. Marketing Revenue Ratio (Chi phí MKT/Doanh thu %)
    const marketing_revenue_ratio = salesMetrics.total_revenue > 0 ? (obj.spend / salesMetrics.total_revenue) * 100 : 0;

    // 4. Marketing Service Ratio (Chi phí MKT/Doanh thu DV %)
    const marketing_service_ratio = salesMetrics.service_revenue > 0 ? (obj.spend / salesMetrics.service_revenue) * 100 : 0;

    // 5. ROI (%) = (Revenue - Cost) / Cost * 100
    const roi = obj.spend > 0 ? ((salesMetrics.total_revenue - obj.spend) / obj.spend) * 100 : 0;

    // 6. ROAS = Revenue / Cost
    const roas = obj.spend > 0 ? salesMetrics.total_revenue / obj.spend : 0;

    enrichedData.push({
      ...obj,
      // Raw sales data
      phone_count: salesMetrics.phone_count,
      booking_count: salesMetrics.booking_count,
      total_revenue: salesMetrics.total_revenue,
      service_revenue: salesMetrics.service_revenue,
      message_count: salesMetrics.message_count,

      // Metrics
      sdt_rate: Math.round(sdt_rate * 100) / 100,
      cost_per_phone: Math.round(cost_per_phone), // ✅ NEW: Chi phí/SĐT
      booking_rate: Math.round(booking_rate * 100) / 100,
      revenue_rate: Math.round(revenue_rate * 100) / 100,
      cost_per_appointment: Math.round(cost_per_appointment),
      cost_per_service_revenue: Math.round(cost_per_service_revenue * 100) / 100,
      marketing_revenue_ratio: Math.round(marketing_revenue_ratio * 100) / 100,
      marketing_service_ratio: Math.round(marketing_service_ratio * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      roas: Math.round(roas * 100) / 100
    });

    console.log(`[METRICS] ${obj.name}: CPA=${cost_per_appointment}, ROAS=${roas.toFixed(2)}, ROI=${roi.toFixed(1)}%`);
  }

  return enrichedData;
}

function evaluateSingleCondition(actualValue: number, operator: string, threshold: number) {
  const value = actualValue || 0;
  switch (operator) {
    case '>':
    case 'greater_than':
      return value > threshold;
    case '>=':
    case 'greater_than_or_equal':
      return value >= threshold;
    case '<':
    case 'less_than':
      return value < threshold;
    case '<=':
    case 'less_than_or_equal':
      return value <= threshold;
    case '=':
    case 'equals':
      return value == threshold;
    case '!=':
    case 'not_equals':
      return value != threshold;
    default:
      return false;
  }
}

function evaluateConditions(obj: any, conditions: RuleCondition[], logic: string = "all") {
  if (!conditions || conditions.length === 0) return true;

  // Logic can be 'OR'/'any' or 'AND'/'all'
  if (logic === 'OR' || logic === 'any') {
    return conditions.some((c) => evaluateSingleCondition(obj[c.metric], c.operator, c.value));
  } else {
    // AND (default)
    return conditions.every((c) => evaluateSingleCondition(obj[c.metric], c.operator, c.value));
  }
}

// Mocked history check to avoid crashing due to missing Supabase client
async function checkExecutionHistory(ruleId: number, objectId: string, scope: string, userId: string, actionType: string, settings: any) {
  // Return true to allow execution as fallback
  return { canExecute: true };
}

async function executeAction(action: RuleAction, objectId: string, token: string, settings: any, rule: any, obj: any, currency: string, timezone: string = 'Asia/Ho_Chi_Minh') {
  // Ensure token is in URL for robustness
  const url = `https://graph.facebook.com/v18.0/${objectId}?access_token=${token}`;

  if (action.type === 'increase_budget' || action.type === 'decrease_budget') {
    // Fetch current
    // Fetch current budget (Currency passed from account map)
    const resp = await fetchWithTimeout(`${url}&fields=daily_budget,lifetime_budget,name`);
    const data = await resp.json();
    const current = parseFloat(data.daily_budget || data.lifetime_budget || 0);
    const isDaily = !!data.daily_budget;
    const detectedCurrency = currency; // Trust the Account Currency passed in

    let newBudget = current;
    const val = Number(action.value);

    // ✅ FIX: Support both budgetMode (Backend) and valueType (Legacy Frontend)
    const mode = action.budgetMode || action.valueType || 'absolute';

    if (mode === 'percentage') {
      const mult = 1 + (val / 100);
      newBudget = action.type === 'increase_budget' ? current * mult : current / mult;
    } else {
      newBudget = action.type === 'increase_budget' ? current + val : current - val;
    }
    newBudget = Math.round(newBudget);
    if (newBudget < 20000 && detectedCurrency === 'VND') newBudget = 20000;

    console.log(`[ACTION] Budget Update: ID=${objectId} Current=${current} New=${newBudget} Currency=${detectedCurrency} Mode=${mode} Val=${action.value}`);

    if (settings.maxBudget && newBudget > settings.maxBudget) newBudget = settings.maxBudget;

    const payload: any = { access_token: token };
    if (isDaily) payload.daily_budget = newBudget; else payload.lifetime_budget = newBudget;

    const updateResp = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseData = await updateResp.json();
    if (!updateResp.ok) {
      throw new Error(`Facebook API Error: ${JSON.stringify(responseData)}`);
    }
    return {
      success: true,
      fb_response: responseData,
      debug_info: `Budget updated: ${current} -> ${newBudget} (Mode=${action.budgetMode}, Val=${action.value})`
    };
  } else if (action.type === 'turn_off' || action.type === 'turn_on') {
    const payload = {
      status: action.type === 'turn_on' ? 'ACTIVE' : 'PAUSED',
      access_token: token
    };

    // ✅ LOOP PREVENTION: Check Status First
    if (action.type === 'turn_off') {
      try {
        const statusResp = await fetchWithTimeout(`${url}?fields=status&access_token=${token}`);
        if (statusResp.ok) {
          const statusData = await statusResp.json();
          const currentStatus = statusData.status;
          if (currentStatus === 'PAUSED' || currentStatus === 'ARCHIVED') {
            console.log(`[ACTION] Skipping Turn Off for ${objectId} because it is already ${currentStatus}`);
            return { skipped: true, reason: `Already ${currentStatus}` };
          }
        }
      } catch (e) {
        console.warn(`[ACTION] Could not check status for ${objectId}, proceeding anyway.`, e);
      }
    }

    const resp = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const responseData = await resp.json();
    if (!resp.ok) {
      throw new Error(`Facebook API Error: ${JSON.stringify(responseData)}`);
    }

    // ✅ AUTO-REVERT LOGIC
    if (action.type === 'turn_off' && action.autoRevert) {
      // Only schedule revert if Turn Off was successful
      const revertRes = await createPendingRevert(rule.Id, objectId, action, timezone, rule.user_id);
      responseData.revert_scheduled = revertRes;
    }

    return responseData;
  }
  return { success: true };
}

// -----------------------------------------------------------------------------
// ✅ AUTO-REVERT HELPERS (Added 12/12)
// -----------------------------------------------------------------------------

function calculateRevertTime(action: RuleAction, timezone: string): string | null {
  if (!action.autoRevert) return null;

  const now = new Date();
  // Get time in target timezone
  const nowInTzStr = now.toLocaleString('en-US', { timeZone: timezone });
  const nowInTz = new Date(nowInTzStr);

  let revertDate = new Date(nowInTz);

  if (action.revertAction === 'turn_on' && action.revertAtTime) {
    // Fixed Time (e.g., "09:00")
    const [h, m] = action.revertAtTime.split(':').map(Number);
    revertDate.setHours(h, m, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (revertDate <= nowInTz) {
      revertDate.setDate(revertDate.getDate() + 1);
    }
  } else if (action.revertAfterHours) {
    // Duration (e.g., after 24 hours)
    revertDate.setHours(revertDate.getHours() + Number(action.revertAfterHours));
  } else {
    return null;
  }

  // Convert back to UTC ISO String for Database
  // NocoDB/DB usually expects ISO. We need to be careful with timezone conversion.
  // Easiest is to handle "diff" from nowInTz to now.
  const diff = revertDate.getTime() - nowInTz.getTime();
  const finalRevertTime = new Date(now.getTime() + diff);

  return finalRevertTime.toISOString();
}

async function createPendingRevert(ruleId: number, objectId: string, action: RuleAction, timezone: string, userId: string) {
  const revertAt = calculateRevertTime(action, timezone);
  if (!revertAt) return { success: false, reason: "Could not calculate revert time" };

  console.log(`[AUTO-REVERT] Scheduling Revert for ${objectId} at ${revertAt} (TZ: ${timezone})`);

  try {
    const url = `${NOCODB_API_URL}/api/v2/tables/${TABLES.PENDING_REVERTS}/records`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: getNocoDBHeaders(),
      body: JSON.stringify({
        rule_id: ruleId,
        object_id: objectId,
        user_id: userId,
        revert_action: 'turn_on', // Currently only supports turning back on
        revert_at: revertAt,
        status: 'pending'
      })
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error(`[AUTO-REVERT] Failed to create record: ${err}`);
      return { success: false, error: err };
    }
    return { success: true, revert_at: revertAt };
  } catch (e: any) {
    console.error(`[AUTO-REVERT] Exception:`, e);
    return { success: false, error: e.message };
  }
}
