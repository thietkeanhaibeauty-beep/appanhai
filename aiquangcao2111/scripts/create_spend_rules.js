const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    CAMPAIGN_LABELS: 'm37ye177g4m98st',
    CAMPAIGN_LABEL_ASSIGNMENTS: 'myjgw4ial5s6zrw',
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4'
};

const USER_ID = 'fc1be8c2-3052-4fc1-9371-8627db5a4f8a'; // From previous context

const RULES_TO_CREATE = [
    {
        campaignId: '120237992160040439',
        campaignName: 'Hifu 18/11',
        currentSpend: 162901,
        targetSpend: 163901,
        labelName: 'Auto Stop Hifu 18/11'
    },
    {
        campaignId: '120238030891030439',
        campaignName: 'Hifu 19',
        currentSpend: 171465,
        targetSpend: 172465,
        labelName: 'Auto Stop Hifu 19'
    }
];

async function createLabel(name) {
    const url = `${NOCODB_API_URL}/api/v2/tables/${TABLES.CAMPAIGN_LABELS}/records`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ label_name: name, user_id: USER_ID, color: '#ff0000' })
    });
    const data = await response.json();
    return data.Id;
}

async function assignLabel(campaignId, labelId) {
    const url = `${NOCODB_API_URL}/api/v2/tables/${TABLES.CAMPAIGN_LABEL_ASSIGNMENTS}/records`;
    await fetch(url, {
        method: 'POST',
        headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, label_id: labelId, user_id: USER_ID })
    });
}

async function createRule(name, labelId, targetSpend) {
    const url = `${NOCODB_API_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records`;
    const ruleData = {
        rule_name: name,
        user_id: USER_ID,
        is_active: true,
        scope: 'campaign',
        target_labels: [String(labelId)], // Store as array of strings
        conditions: JSON.stringify([
            { metric: 'spend', operator: 'GREATER_THAN', value: targetSpend },
            { metric: 'results', operator: 'LESS_THAN', value: 1 }
        ]),
        actions: JSON.stringify([
            { type: 'turn_off', value: null } // Turn off action
        ]),
        condition_logic: 'all',
        checkFrequency: '15_minutes',
        enableAutoSchedule: true,
        time_range: 'today' // Assuming "spend adds 1k more" refers to today's spend
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to create rule: ${text}`);
    }

    const data = await response.json();
    return data.Id;
}

async function main() {
    try {
        for (const item of RULES_TO_CREATE) {
            console.log(`Processing ${item.campaignName}...`);

            // 1. Create Label
            console.log(`Creating label: ${item.labelName}`);
            const labelId = await createLabel(item.labelName);
            console.log(`Label created with ID: ${labelId}`);

            // 2. Assign Label
            console.log(`Assigning label to campaign ${item.campaignId}`);
            await assignLabel(item.campaignId, labelId);

            // 3. Create Rule
            const ruleName = `Tắt ${item.campaignName} nếu tiêu > ${item.targetSpend.toLocaleString('vi-VN')}đ`;
            console.log(`Creating rule: ${ruleName}`);
            const ruleId = await createRule(ruleName, labelId, item.targetSpend);
            console.log(`Rule created with ID: ${ruleId}`);
            console.log('-----------------------------------');
        }
        console.log('All rules created successfully.');
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
