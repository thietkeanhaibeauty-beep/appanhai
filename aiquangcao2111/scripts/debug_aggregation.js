
const insights = [
    { spend: 17008, date_start: '2025-12-12', adset_id: '120237152213480772' },
    { spend: 17298, date_start: '2025-12-12', adset_id: '120237152213480772' },
    { spend: 18248, date_start: '2025-12-12', adset_id: '120237152213480772' },
    { spend: 9497, date_start: '2025-12-12', adset_id: '120237152213480772' },
    { spend: 0, date_start: '2025-12-12', adset_id: '120237152213480772' }
];

function aggregateByScope(insights, scope) {
    const grouped = {};
    insights.forEach((insight) => {
        let key = insight.adset_id;
        if (!grouped[key]) {
            grouped[key] = { id: key, spend: 0 };
        }
        grouped[key].spend += parseFloat(insight.spend || 0) / 100;
    });
    return Object.values(grouped);
}

const result = aggregateByScope(insights, 'adset');
console.log('Result:', result);
