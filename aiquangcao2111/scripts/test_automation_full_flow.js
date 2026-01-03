
import https from 'https';
import http from 'http';

// Configuration
const CONFIG = {
    NOCODB: {
        HOST: '180.93.3.41',
        PORT: 8080,
        TOKEN: '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
        TABLES: {
            CAMPAIGN_LABELS: 'm37ye177g4m98st', // Updated 2025-11-26
            CAMPAIGN_LABEL_ASSIGNMENTS: 'myjgw4ial5s6zrw', // Corrected ID
            AUTOMATED_RULES: 'mp8nib5rn4l0mb4', // Corrected ID
            FACEBOOK_CAMPAIGNS: 'm3nfpbas7lky3gk',
            FACEBOOK_INSIGHTS: 'm17gyigy8jqlaoz'
        }
    },
    SUPABASE: {
        URL: 'https://jtaekxrkubhwtqgodvtx.supabase.co',
        KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDcxMTYsImV4cCI6MjA3OTI4MzExNn0.iRHg-xMZ1i_qb0xnQ6vDivcFEEdrpYb0Z6cSkgOLLyU',
        FUNCTION: 'execute-automation-rule'
    },
    USER_ID: 'b05b7725-4da0-4f81-b869-5ddfd374fb59'
};

// Helper: NocoDB Request (using fetch)
const nocoRequest = async (tableId, method, body = null, query = '') => {
    const url = `http://${CONFIG.NOCODB.HOST}:${CONFIG.NOCODB.PORT}/api/v2/tables/${tableId}/records${query}`;
    const headers = {
        'xc-token': CONFIG.NOCODB.TOKEN,
        'Content-Type': 'application/json'
    };

    const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    };

    const response = await fetch(url, options);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`NocoDB Error ${response.status}: ${text}`);
    }
    return response.json();
};

// Helper: Supabase Function Request (using fetch)
const supabaseFunctionRequest = async (functionName, body) => {
    const url = `${CONFIG.SUPABASE.URL}/functions/v1/${functionName}`;
    const headers = {
        'Authorization': `Bearer ${CONFIG.SUPABASE.KEY}`,
        'Content-Type': 'application/json'
    };

    const options = {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    };

    const response = await fetch(url, options);
    // Note: Edge function might return 400/500 but still have JSON body with error details
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        return { error: text, status: response.status };
    }
};

// Main Test Flow
const runTest = async () => {
    console.log('🚀 Starting Automation Feature Test (ESM Mode)...');
    let labelId = null;
    let ruleId = null;
    let campaignId = null;

    try {
        // 1. Fetch a valid campaign to test with
        console.log('\n🔍 Step 1: Finding a valid campaign...');
        // Fetch ANY campaign to get a valid user_id and campaign_id
        const campaigns = await nocoRequest(CONFIG.NOCODB.TABLES.FACEBOOK_CAMPAIGNS, 'GET', null, '?limit=1');

        if (!campaigns.list || campaigns.list.length === 0) {
            // Try fetching from insights if campaigns table is empty
            console.log('   No campaigns in main table, trying insights...');
            const insights = await nocoRequest(CONFIG.NOCODB.TABLES.FACEBOOK_INSIGHTS, 'GET', null, '?limit=1');
            if (!insights.list || insights.list.length === 0) {
                throw new Error('No campaigns or insights found in the ENTIRE database. Cannot proceed.');
            }
            campaignId = insights.list[0].campaign_id;
            CONFIG.USER_ID = insights.list[0].user_id; // Override User ID
            console.log(`✅ Found Campaign ID from Insights: ${campaignId}`);
            console.log(`✅ Using User ID: ${CONFIG.USER_ID}`);
        } else {
            campaignId = campaigns.list[0].campaign_id;
            CONFIG.USER_ID = campaigns.list[0].user_id; // Override User ID
            console.log(`✅ Found Campaign ID: ${campaignId} (${campaigns.list[0].name})`);
            console.log(`✅ Using User ID: ${CONFIG.USER_ID}`);
        }

        // 2. Create Label
        console.log('\n🏷️ Step 2: Creating Test Label...');
        const label = await nocoRequest(CONFIG.NOCODB.TABLES.CAMPAIGN_LABELS, 'POST', {
            label_name: 'TEST_AUTO_LABEL_' + Date.now(),
            label_color: '#FF0000',
            user_id: CONFIG.USER_ID
        });
        console.log('   Label Creation Response:', JSON.stringify(label, null, 2));
        labelId = label.Id;
        console.log(`✅ Created Label ID: ${labelId}`);

        // 3. Assign Label to Campaign
        console.log('\n🔗 Step 3: Assigning Label to Campaign...');
        await nocoRequest(CONFIG.NOCODB.TABLES.CAMPAIGN_LABEL_ASSIGNMENTS, 'POST', {
            user_id: CONFIG.USER_ID,
            campaign_id: campaignId,
            label_id: labelId,
            assigned_at: new Date().toISOString(),
            assigned_by: 'test_script'
        });
        console.log(`✅ Assigned Label ${labelId} to Campaign ${campaignId}`);

        // --- TEST CASE 1: AUTO TURN OFF ---
        console.log('\n🧪 TEST CASE 1: Auto Turn Off');
        console.log('   Creating Rule: Turn OFF if Spend > 0');
        const ruleOff = await nocoRequest(CONFIG.NOCODB.TABLES.AUTOMATED_RULES, 'POST', {
            rule_name: 'TEST_RULE_OFF',
            user_id: CONFIG.USER_ID,
            scope: 'campaign',
            target_labels: [labelId],
            conditions: JSON.stringify([{ metric: 'spend', operator: 'gte', value: 0 }]), // gte 0 to ensure match
            actions: JSON.stringify([{ type: 'turn_off' }]),
            is_active: true,
            condition_logic: 'all',
            time_range: 'today'
        });
        ruleId = ruleOff.Id;
        console.log(`   ✅ Created Rule ID: ${ruleId}`);

        // DEBUG: Fetch the rule back to check target_labels
        const fetchedRule = await nocoRequest(CONFIG.NOCODB.TABLES.AUTOMATED_RULES, 'GET', null, `/${ruleId}`);
        console.log('   🔍 Fetched Rule target_labels:', JSON.stringify(fetchedRule.target_labels));
        console.log('   🔍 Fetched Rule full:', JSON.stringify(fetchedRule, null, 2));

        console.log('   Triggering Execution (Dry Run)...');
        const resultOff = await supabaseFunctionRequest(CONFIG.SUPABASE.FUNCTION, {
            ruleId: ruleId,
            userId: CONFIG.USER_ID,
            manualRun: true,
            dryRun: true
        });

        console.log('   Execution Result:', JSON.stringify(resultOff, null, 2));
        if (resultOff.matchedCount > 0) {
            console.log('   ✅ Rule matched and attempted execution (Dry Run)');
        } else {
            console.warn('   ⚠️ Rule did not match any objects. Check if campaign has spend today.');
        }

        // --- TEST CASE 2: AUTO TURN ON ---
        console.log('\n🧪 TEST CASE 2: Auto Turn On');
        console.log('   Updating Rule to Turn ON');
        await nocoRequest(CONFIG.NOCODB.TABLES.AUTOMATED_RULES, 'PATCH', [{
            Id: ruleId,
            actions: JSON.stringify([{ type: 'turn_on' }])
        }]);

        console.log('   Triggering Execution...');
        const resultOn = await supabaseFunctionRequest(CONFIG.SUPABASE.FUNCTION, {
            ruleId: ruleId,
            userId: CONFIG.USER_ID,
            manualRun: true,
            dryRun: true
        });
        console.log('   Execution Result:', JSON.stringify(resultOn, null, 2));

        // --- TEST CASE 3: INCREASE BUDGET ---
        console.log('\n🧪 TEST CASE 3: Increase Budget 10%');
        console.log('   Updating Rule to Increase Budget');
        await nocoRequest(CONFIG.NOCODB.TABLES.AUTOMATED_RULES, 'PATCH', [{
            Id: ruleId,
            actions: JSON.stringify([{ type: 'increase_budget', value: 10, budgetMode: 'percentage' }])
        }]);

        console.log('   Triggering Execution...');
        const resultInc = await supabaseFunctionRequest(CONFIG.SUPABASE.FUNCTION, {
            ruleId: ruleId,
            userId: CONFIG.USER_ID,
            manualRun: true,
            dryRun: true
        });
        console.log('   Execution Result:', JSON.stringify(resultInc, null, 2));

        // --- TEST CASE 4: DECREASE BUDGET ---
        console.log('\n🧪 TEST CASE 4: Decrease Budget 10%');
        console.log('   Updating Rule to Decrease Budget');
        await nocoRequest(CONFIG.NOCODB.TABLES.AUTOMATED_RULES, 'PATCH', [{
            Id: ruleId,
            actions: JSON.stringify([{ type: 'decrease_budget', value: 10, budgetMode: 'percentage' }])
        }]);

        console.log('   Triggering Execution...');
        const resultDec = await supabaseFunctionRequest(CONFIG.SUPABASE.FUNCTION, {
            ruleId: ruleId,
            userId: CONFIG.USER_ID,
            manualRun: true,
            dryRun: true
        });
        console.log('   Execution Result:', JSON.stringify(resultDec, null, 2));

    } catch (error) {
        console.error('\n❌ Test Failed:', error);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleanup...');
        if (ruleId) {
            try {
                await nocoRequest(CONFIG.NOCODB.TABLES.AUTOMATED_RULES, 'DELETE', [{ Id: ruleId }]);
                console.log(`✅ Deleted Rule ${ruleId}`);
            } catch (e) { console.error('Failed to delete rule:', e); }
        }
        if (labelId) {
            try {
                await nocoRequest(CONFIG.NOCODB.TABLES.CAMPAIGN_LABELS, 'DELETE', [{ Id: labelId }]);
                console.log(`✅ Deleted Label ${labelId}`);
            } catch (e) { console.error('Failed to delete label:', e); }
        }
    }
};

runTest();
