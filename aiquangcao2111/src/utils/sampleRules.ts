import { AutomationRule } from '@/types/automationRules';
import { createRule } from '@/services/nocodb/automatedRulesService';
import { createLabel, CampaignLabel } from '@/services/nocodb/campaignLabelsService';
import { assignLabel as assignLabelToEntity } from '@/services/nocodb/campaignLabelAssignmentsService';

export interface SampleRuleConfig {
  name: string;
  description: string;
  labelName: string;
  labelColor: string;
  campaignIds: string[]; // IDs of campaigns to assign this label to
}

/**
 * Create 5 sample automation rules for testing
 */
export const createSampleRules = async (
  userId: string,
  campaignIds: string[] // Pass real campaign IDs from the UI
): Promise<{ success: number; failed: number; errors: string[] }> => {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  // Sample rule configs
  const sampleConfigs: SampleRuleConfig[] = [
    {
      name: '🛑 Test 1: Tắt chiến dịch - Chi phí cao',
      description: 'Tắt campaign khi: Spend ≥ 75k AND Cost/Result ≥ 75k AND Results ≤ 2',
      labelName: 'Test-HighCost',
      labelColor: '#ef4444',
      campaignIds: campaignIds.slice(0, 2), // Assign to first 2 campaigns
    },
    {
      name: '💰 Test 2: Tăng budget - Hiệu suất tốt',
      description: 'Tăng 20% budget khi: Cost/Result < 80k AND Results ≥ 2',
      labelName: 'Test-GoodPerf',
      labelColor: '#22c55e',
      campaignIds: campaignIds.slice(2, 4), // Assign to campaigns 3-4
    },
    {
      name: '🔗 Test 3: AND Logic - Nhiều điều kiện',
      description: 'Test AND: Spend > 50k AND CTR > 1% AND Results > 1',
      labelName: 'Test-AND',
      labelColor: '#3b82f6',
      campaignIds: campaignIds.slice(4, 6), // Assign to campaigns 5-6
    },
    {
      name: '🔀 Test 4: OR Logic - Bất kỳ điều kiện',
      description: 'Test OR: Spend > 100k OR Cost/Result > 100k OR Results < 1',
      labelName: 'Test-OR',
      labelColor: '#f59e0b',
      campaignIds: campaignIds.slice(0, 3), // Assign to first 3 campaigns
    },
    {
      name: '⏰ Test 5: Time Range - Today',
      description: 'Test time range: Today only',
      labelName: 'Test-Today',
      labelColor: '#8b5cf6',
      campaignIds: campaignIds.slice(0, 2), // Assign to first 2 campaigns
    },
  ];

  for (const config of sampleConfigs) {
    try {


      // 1. Create label
      const labelData: Partial<CampaignLabel> = {
        user_id: userId,
        label_name: config.labelName,
        label_color: config.labelColor,
      };
      const label = await createLabel(labelData);



      // 2. Assign label to campaigns
      for (const campaignId of config.campaignIds) {
        try {
          await assignLabelToEntity(campaignId, 'campaign', label.Id!, userId);

        } catch (err) {
          console.warn(`  ⚠️ Failed to assign label to campaign ${campaignId}:`, err);
        }
      }

      // 3. Create rule with specific conditions based on config
      let ruleData: Partial<AutomationRule>;

      if (config.name.includes('Test 1')) {
        // Test 1: Turn off - High cost
        ruleData = {
          user_id: userId,
          rule_name: config.name,
          scope: 'campaign',
          time_range: 'today',
          is_active: true,
          condition_logic: 'all', // AND
          conditions: [
            { id: '1', metric: 'spend', operator: 'greater_than_or_equal', value: 75000 },
            { id: '2', metric: 'cost_per_result', operator: 'greater_than_or_equal', value: 75000 },
            { id: '3', metric: 'results', operator: 'less_than_or_equal', value: 2 },
          ],
          actions: [
            { id: '1', type: 'turn_off' },
          ],
          target_labels: [label.Id!.toString()],
          labels: [label.Id!.toString()],
          advanced_settings: {
            maxExecutionsPerObject: 1,
            cooldownHours: 24,
          },
        };
      } else if (config.name.includes('Test 2')) {
        // Test 2: Increase budget - Good performance
        ruleData = {
          user_id: userId,
          rule_name: config.name,
          scope: 'campaign',
          time_range: 'today',
          is_active: true,
          condition_logic: 'all', // AND
          conditions: [
            { id: '1', metric: 'cost_per_result', operator: 'less_than', value: 80000 },
            { id: '2', metric: 'results', operator: 'greater_than_or_equal', value: 2 },
          ],
          actions: [
            { id: '1', type: 'increase_budget', value: 20, valueType: 'percentage' },
          ],
          target_labels: [label.Id!.toString()],
          labels: [label.Id!.toString()],
          advanced_settings: {
            maxExecutionsPerObject: 1,
            cooldownHours: 24,
          },
        };
      } else if (config.name.includes('Test 3')) {
        // Test 3: AND logic
        ruleData = {
          user_id: userId,
          rule_name: config.name,
          scope: 'campaign',
          time_range: 'today',
          is_active: true,
          condition_logic: 'all', // AND
          conditions: [
            { id: '1', metric: 'spend', operator: 'greater_than', value: 50000 },
            { id: '2', metric: 'ctr', operator: 'greater_than', value: 1 },
            { id: '3', metric: 'results', operator: 'greater_than', value: 1 },
          ],
          actions: [
            { id: '1', type: 'send_notification' },
          ],
          target_labels: [label.Id!.toString()],
          labels: [label.Id!.toString()],
          advanced_settings: {},
        };
      } else if (config.name.includes('Test 4')) {
        // Test 4: OR logic
        ruleData = {
          user_id: userId,
          rule_name: config.name,
          scope: 'campaign',
          time_range: 'today',
          is_active: true,
          condition_logic: 'any', // OR
          conditions: [
            { id: '1', metric: 'spend', operator: 'greater_than', value: 100000 },
            { id: '2', metric: 'cost_per_result', operator: 'greater_than', value: 100000 },
            { id: '3', metric: 'results', operator: 'less_than', value: 1 },
          ],
          actions: [
            { id: '1', type: 'turn_off' },
          ],
          target_labels: [label.Id!.toString()],
          labels: [label.Id!.toString()],
          advanced_settings: {
            maxExecutionsPerObject: 1,
          },
        };
      } else {
        // Test 5: Time range
        ruleData = {
          user_id: userId,
          rule_name: config.name,
          scope: 'campaign',
          time_range: 'today',
          is_active: true,
          condition_logic: 'all',
          conditions: [
            { id: '1', metric: 'spend', operator: 'greater_than', value: 0 },
          ],
          actions: [
            { id: '1', type: 'send_notification' },
          ],
          target_labels: [label.Id!.toString()],
          labels: [label.Id!.toString()],
          advanced_settings: {},
        };
      }

      const rule = await createRule(ruleData);


      results.success++;
    } catch (error) {
      console.error(`  ❌ Failed to create rule: ${config.name}`, error);
      results.failed++;
      results.errors.push(`${config.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return results;
};
