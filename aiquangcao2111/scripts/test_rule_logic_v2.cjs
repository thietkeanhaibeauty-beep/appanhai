const rule = {
    conditions: [
        { metric: 'spend', operator: 'greater_than_or_equal', value: 80000 },
        { metric: 'results', operator: 'equals', value: 1 }
    ]
};

const insights = [
    {
        id: '120240709129460334',
        name: 'Em sáng 6/12',
        spend: 100023, // Data from user screenshot
        results: 1
    }
];

function evaluateSingleCondition(value, operator, conditionValue) {
    const numValue = Number(value);
    if (isNaN(numValue)) return false;

    console.log(`   Checking: ${numValue} ${operator} ${conditionValue}`);

    switch (operator) {
        case "greater_than": return numValue > conditionValue;
        case "less_than": return numValue < conditionValue;
        case "equals": return numValue === conditionValue;
        case "greater_than_or_equal": return numValue >= conditionValue;
        case "less_than_or_equal": return numValue <= conditionValue;
        default: return false;
    }
}

function evaluateConditions(obj, conditions) {
    return conditions.every((condition) => {
        const value = obj[condition.metric];
        const result = evaluateSingleCondition(value, condition.operator, condition.value);
        console.log(`   Result: ${result}`);
        return result;
    });
}

console.log("--- START AUTOMATED TEST ---");
console.time("Test Duration");

insights.forEach(obj => {
    console.log(`\nTesting Object: ${obj.name} (Spend: ${obj.spend}, Results: ${obj.results})`);
    const isMatch = evaluateConditions(obj, rule.conditions);

    if (isMatch) {
        console.log("✅ MATCH! Rule would execute 'TURN_OFF'.");
    } else {
        console.log("❌ NO MATCH.");
    }
});

console.timeEnd("Test Duration");
console.log("--- END TEST ---");
