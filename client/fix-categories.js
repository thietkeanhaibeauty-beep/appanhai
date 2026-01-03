/**
 * Script to fix template category IDs
 * Run this in browser console while on NocoDB dashboard
 */

const NOCODB_URL = 'https://db.hpb.edu.vn';
const TOKEN = '1wrsHNcz_FNeptaeMvP7jqrcVpm0GtD_8JScOLGo';
const PROJECT_ID = 'pj5m5qf1ys9lzff';
const TEMPLATES_TABLE = 'mrt1k1l9ohfwhvo'; // Templates table ID
const CATEGORIES_TABLE = 'msu9huqgovcqfrh'; // Categories table ID

async function apiCall(endpoint) {
    const res = await fetch(`${NOCODB_URL}/api/v1${endpoint}`, {
        headers: { 'xc-token': TOKEN }
    });
    return res.json();
}

async function updateTemplate(rowId, categoryRecordId) {
    const res = await fetch(`${NOCODB_URL}/api/v1/db/data/noco/${PROJECT_ID}/${TEMPLATES_TABLE}/${rowId}`, {
        method: 'PATCH',
        headers: {
            'xc-token': TOKEN,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ Category: categoryRecordId })
    });
    return res.json();
}

async function fixCategories() {
    console.log('Fetching categories...');
    const cats = await apiCall(`/db/data/noco/${PROJECT_ID}/${CATEGORIES_TABLE}`);
    console.log('Categories:', cats.list.map(c => ({ RecordId: c.RecordId, Name: c.Name })));

    // Create mapping: category Name -> RecordId
    const catMap = {};
    cats.list.forEach(c => {
        catMap[c.Name?.toLowerCase()] = c.RecordId;
        catMap[c.RecordId] = c.RecordId; // Also map RecordId to itself
    });
    console.log('Category Map:', catMap);

    console.log('Fetching templates...');
    const templates = await apiCall(`/db/data/noco/${PROJECT_ID}/${TEMPLATES_TABLE}?limit=1000`);
    console.log(`Found ${templates.list.length} templates`);

    let fixed = 0;
    for (const t of templates.list) {
        const currentCat = t.Category;

        // Check if category is a number (wrong)
        if (/^\d+$/.test(currentCat)) {
            console.log(`Template ${t.RecordId}: Category "${currentCat}" is a number, needs fixing`);
            // Skip for now - need manual mapping
            continue;
        }

        // Check if category matches a RecordId
        const correctId = catMap[currentCat?.toLowerCase()] || catMap[currentCat];

        if (correctId && correctId !== currentCat) {
            console.log(`Updating ${t.RecordId}: "${currentCat}" -> "${correctId}"`);
            await updateTemplate(t.Id, correctId);
            fixed++;
        }
    }

    console.log(`Fixed ${fixed} templates`);
}

// Run it
fixCategories();
