import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';
import { AutomationRule } from '@/types/automationRules';

interface NocoDBListResponse {
  list: AutomationRule[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

/**
 * Safe JSON parse with fallback
 */
const safeJSONParse = (value: any, fallback: any) => {
  if (!value) return fallback;

  // If already correct type, return it
  if (typeof value !== 'string') {
    // If it's an object but we expect array, convert empty object to empty array
    if (Array.isArray(fallback) && typeof value === 'object' && !Array.isArray(value)) {
      // Empty object should become empty array
      if (Object.keys(value).length === 0) {
        return [];
      }
      // Single object should become array with one item
      if (value.id || value.type || value.metric) {
        return [value];
      }
    }
    return value;
  }

  try {
    // Try to parse once
    let parsed = JSON.parse(value);

    // If result is still a string, try parsing again (double-stringified)
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }

    // If we expect an array but got an object
    if (Array.isArray(fallback)) {
      // Empty object should become empty array
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (Object.keys(parsed).length === 0) {
          return [];
        }
        // Single object should become array with one item
        if (parsed.id || parsed.type || parsed.metric) {
          return [parsed];
        }
      }
    }

    return parsed || fallback;
  } catch (e) {
    console.error('JSON parse error:', e, value);
    return fallback;
  }
};

/**
 * Parse JSON fields from NocoDB
 * ✅ Normalize target_labels to number[]
 */
const parseRuleData = (rule: any): AutomationRule => {
  const parsed = {
    ...rule,
    conditions: safeJSONParse(rule.conditions, []),
    actions: safeJSONParse(rule.actions, []),
    steps: safeJSONParse(rule.steps, []),
    advanced_settings: safeJSONParse(rule.advanced_settings, {}),
    labels: safeJSONParse(rule.labels, []),
    target_labels: safeJSONParse(rule.target_labels, []),
    condition_logic: rule.condition_logic || 'all',
    id: rule.id || (rule.Id ? String(rule.Id) : undefined)
  };

  // ✅ Ensure labels is an array
  if (!Array.isArray(parsed.labels)) {
    parsed.labels = parsed.labels ? [parsed.labels] : [];
  }

  // ✅ Ensure target_labels is an array
  if (!Array.isArray(parsed.target_labels)) {
    parsed.target_labels = parsed.target_labels ? [parsed.target_labels] : [];
  }

  // ✅ Normalize target_labels: ensure all are numbers
  parsed.target_labels = parsed.target_labels.map((id: any) => {
    const num = typeof id === 'string' ? parseInt(id, 10) : Number(id);
    return isNaN(num) ? id : num; // Keep original if not a number
  });

  return parsed;
};

/**
 * Get all automation rules
 */
export const getAllRules = async (): Promise<AutomationRule[]> => {
  try {
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.AUTOMATED_RULES)}?sort=-CreatedAt&limit=100`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    const data: NocoDBListResponse = await response.json();
    return (data.list || []).map(parseRuleData);
  } catch (error) {
    console.error('Error fetching rules from NocoDB:', error);
    throw error;
  }
};

/**
 * Get rules by user ID
 */
export const getRulesByUserId = async (userId: string): Promise<AutomationRule[]> => {
  try {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.AUTOMATED_RULES)}?where=${whereClause}&sort=-CreatedAt&limit=100`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔴 [Rules Service] API Error Details:', errorText);
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    const data: NocoDBListResponse = await response.json();
    const parsed = (data.list || []).map(parseRuleData);

    return parsed;
  } catch (error) {
    console.error('Error fetching rules by user_id:', error);
    throw error;
  }
};

/**
 * Get single rule by ID
 */
export const getRuleById = async (ruleId: string): Promise<AutomationRule | null> => {
  try {
    // NocoDB uses numeric IDs in records endpoint, but we search by the id field
    const whereClause = encodeURIComponent(`(Id,eq,${ruleId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.AUTOMATED_RULES)}?where=${whereClause}&limit=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    const data: NocoDBListResponse = await response.json();
    return data.list.length > 0 ? parseRuleData(data.list[0]) : null;
  } catch (error) {
    console.error('Error fetching rule by ID:', error);
    throw error;
  }
};

/**
 * Create new rule
 */
export const createRule = async (ruleData: Partial<AutomationRule>): Promise<AutomationRule> => {


  // ✅ Validate user_id is provided
  if (!ruleData.user_id) {
    throw new Error('user_id is required. User must be authenticated to create automation rules.');
  }

  try {
    const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.AUTOMATED_RULES);


    const headers = await getNocoDBHeaders();



    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...ruleData,
        conditions: typeof ruleData.conditions === 'object' ? JSON.stringify(ruleData.conditions) : ruleData.conditions,
        actions: typeof ruleData.actions === 'object' ? JSON.stringify(ruleData.actions) : ruleData.actions,
        steps: typeof ruleData.steps === 'object' ? JSON.stringify(ruleData.steps) : ruleData.steps,
        advanced_settings: typeof ruleData.advanced_settings === 'object' ? JSON.stringify(ruleData.advanced_settings) : ruleData.advanced_settings,
      }),
    });




    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔵 [NocoDB] Error response:', errorText);
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();


    // 🚀 NEW: Auto-create cron job if enableAutoSchedule is true
    if (result.enableAutoSchedule && result.checkFrequency) {

      try {
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase.functions.invoke('manage-rule-cron', {
          body: {
            action: 'create',
            ruleId: result.id,
            userId: result.user_id,
            checkFrequency: result.checkFrequency
          }
        });

      } catch (cronError) {
        console.error('⚠️ [NocoDB] Failed to create cron job:', cronError);
        // Don't throw - rule was created successfully, cron can be retried
      }
    }

    return result;
  } catch (error) {
    console.error('🔵 [NocoDB] Error creating rule:', error);
    console.error('🔵 [NocoDB] Error type:', typeof error);
    console.error('🔵 [NocoDB] Error message:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * Update rule by ID
 */
export const updateRule = async (recordId: number, ruleData: Partial<AutomationRule>): Promise<AutomationRule> => {
  try {
    const fullUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.AUTOMATED_RULES);
    const proxyBaseUrl = fullUrl.split('/api/v2')[0];
    const path = `/api/v2/tables/${NOCODB_CONFIG.TABLES.AUTOMATED_RULES}/records`;

    const payload = [{
      Id: recordId,
      ...ruleData,
      conditions: typeof ruleData.conditions === 'object' ? JSON.stringify(ruleData.conditions) : ruleData.conditions,
      actions: typeof ruleData.actions === 'object' ? JSON.stringify(ruleData.actions) : ruleData.actions,
      steps: typeof ruleData.steps === 'object' ? JSON.stringify(ruleData.steps) : ruleData.steps,
      advanced_settings: typeof ruleData.advanced_settings === 'object' ? JSON.stringify(ruleData.advanced_settings) : ruleData.advanced_settings,
    }];

    // Standardized Proxy Command
    const response = await fetch(proxyBaseUrl, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({
        path: path,
        method: 'PATCH',
        data: payload
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    const updatedRule = Array.isArray(result) ? result[0] : result;

    // 🚀 NEW: Update cron job if schedule settings changed
    if (ruleData.checkFrequency !== undefined || ruleData.enableAutoSchedule !== undefined) {

      try {
        const { supabase } = await import('@/integrations/supabase/client');

        if (updatedRule.enableAutoSchedule && updatedRule.checkFrequency) {
          // Update cron job
          await supabase.functions.invoke('manage-rule-cron', {
            body: {
              action: 'update',
              ruleId: recordId,
              userId: updatedRule.user_id,
              checkFrequency: updatedRule.checkFrequency
            }
          });
        } else {
          // Delete cron job if auto-schedule is disabled
          await supabase.functions.invoke('manage-rule-cron', {
            body: {
              action: 'delete',
              ruleId: recordId
            }
          });
        }
      } catch (cronError) {
        console.error('⚠️ [NocoDB] Failed to update cron job:', cronError);
        // Don't throw - rule was updated successfully, cron can be retried
      }
    }

    return updatedRule;
  } catch (error) {
    console.error('Error updating rule:', error);
    throw error;
  }
};

/**
 * Delete rule by ID (cascade deletes labels and assignments)
 */
export const deleteRule = async (recordId: number): Promise<void> => {
  try {

    // 1. Delete cron job first
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.functions.invoke('manage-rule-cron', {
        body: {
          action: 'delete',
          ruleId: recordId
        }
      });
    } catch (cronError) {
      console.warn('⚠️ [NocoDB] Failed to delete cron job:', cronError);
      // Continue with rule deletion even if cron deletion fails
    }

    // 2. Get rule info to find associated labels
    const whereClause = encodeURIComponent(`(Id,eq,${recordId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.AUTOMATED_RULES)}?where=${whereClause}&limit=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      console.error('🗑️ [NocoDB] Failed to fetch rule:', response.status, response.statusText);
      throw new Error(`Failed to fetch rule: ${response.statusText}`);
    }

    const data: NocoDBListResponse = await response.json();

    if (data.list.length === 0) {
      console.error('🗑️ [NocoDB] Rule not found with Id:', recordId);
      throw new Error(`Rule not found with Id: ${recordId}`);
    }

    const rule = parseRuleData(data.list[0]);

    // 3. Collect all unique label IDs from rule
    const allLabelIds = [
      ...(rule.labels || []),
      ...(rule.target_labels || [])
    ]
      .map(id => parseInt(String(id)))
      .filter((id, index, self) => !isNaN(id) && self.indexOf(id) === index); // Deduplicate

    // 4. Delete label assignments ONLY (Keep the labels themselves)
    if (allLabelIds.length > 0) {
      const { deleteLabelAssignmentsByLabelId } = await import('./campaignLabelAssignmentsService');

      for (const labelId of allLabelIds) {
        try {
          // Delete assignments
          await deleteLabelAssignmentsByLabelId(labelId);

        } catch (err) {
          console.warn(`⚠️ Failed to delete assignments for label ${labelId}:`, err);
        }
      }
    }

    // 5. Delete execution logs
    try {
      const logsUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.AUTOMATION_RULE_EXECUTION_LOGS)}/bulk`;
      // Find logs first
      const logsWhere = encodeURIComponent(`(rule_id,eq,${recordId})`);
      const findLogsUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.AUTOMATION_RULE_EXECUTION_LOGS)}?where=${logsWhere}&limit=1000`;
      const logsRes = await fetch(findLogsUrl, { headers: await getNocoDBHeaders() });
      const logsData = await logsRes.json();

      if (logsData.list && logsData.list.length > 0) {
        const logIds = logsData.list.map((l: any) => ({ Id: l.Id }));
        await fetch(logsUrl, {
          method: 'POST',
          headers: {
            ...(await getNocoDBHeaders()),
            'X-Method-Override': 'DELETE'
          },
          body: JSON.stringify(logIds)
        });
      }
    } catch (logError) {
      console.warn('⚠️ Failed to delete execution logs:', logError);
    }

    // 6. Finally delete the rule
    const fullUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.AUTOMATED_RULES);
    const proxyBaseUrl = fullUrl.split('/api/v2')[0];
    const path = `/api/v2/tables/${NOCODB_CONFIG.TABLES.AUTOMATED_RULES}/records`;

    const deleteResponse = await fetch(proxyBaseUrl, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({
        path: path,
        method: 'DELETE',
        data: [{ Id: recordId }]
      }),
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(`NocoDB API error: ${deleteResponse.status} ${deleteResponse.statusText} - ${errorText}`);
    }


  } catch (error) {
    console.error('Error deleting rule:', error);
    throw error;
  }
};

/**
 * Toggle rule active status
 */
export const toggleRuleActive = async (recordId: number, isActive: boolean): Promise<AutomationRule> => {
  const updatedRule = await updateRule(recordId, { is_active: isActive });

  // 🚀 Manage cron job in BACKGROUND (fire-and-forget) - don't block UI
  // We don't await here to make toggle feel instant
  (async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');

      if (isActive && updatedRule.enableAutoSchedule && updatedRule.checkFrequency) {
        // Activate rule → create cron job
        supabase.functions.invoke('manage-rule-cron', {
          body: {
            action: 'create',
            ruleId: recordId,
            userId: updatedRule.user_id,
            checkFrequency: updatedRule.checkFrequency
          }
        }).catch(err => console.warn('⚠️ Cron create failed (non-blocking):', err));

      } else if (!isActive) {
        // Deactivate rule → delete cron job
        supabase.functions.invoke('manage-rule-cron', {
          body: {
            action: 'delete',
            ruleId: recordId
          }
        }).catch(err => console.warn('⚠️ Cron delete failed (non-blocking):', err));
      }
    } catch (cronError) {
      console.error('⚠️ [NocoDB] Failed to manage cron job on toggle:', cronError);
    }
  })();

  return updatedRule;
};

/**
 * Update execution status
 */
export const updateExecutionStatus = async (
  recordId: number,
  status: 'pending' | 'success' | 'failed',
  results?: any
): Promise<void> => {
  try {
    const updateData: any = {
      last_execution_status: status,
      last_run_at: new Date().toISOString()
    };

    if (results) {
      updateData.last_execution_log = JSON.stringify(results);
    }

    await updateRule(recordId, updateData);
  } catch (error) {
    console.error('Error updating execution status:', error);
    throw error;
  }
};
