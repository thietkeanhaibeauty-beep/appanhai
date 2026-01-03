
// Inline config to avoid import issues
const NOCODB_CONFIG = {
    BASE_URL: 'https://db.hpb.edu.vn',
    API_TOKEN: '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
    TABLES: {
        CAMPAIGN_LABEL_ASSIGNMENTS: 'myjgw4ial5s6zrw',
    }
};

const getNocoDBHeaders = () => ({
    'xc-token': NOCODB_CONFIG.API_TOKEN,
    'Content-Type': 'application/json',
});

async function debugTableColumns() {
    console.log('🔍 Inspecting Table Columns...');

    try {
        // Fetch table metadata to see column definitions
        const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/meta/tables/${NOCODB_CONFIG.TABLES.CAMPAIGN_LABEL_ASSIGNMENTS}`;
        console.log('Meta URL:', url);

        const response = await fetch(url, {
            headers: getNocoDBHeaders()
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch meta: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Table Name:', data.title);

        console.log('\n--- Columns ---');
        data.columns.forEach((col: any) => {
            console.log(`- ${col.title} (${col.uidt}): required=${col.rqd}, default=${col.cdf}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

debugTableColumns();
