const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDcxMTYsImV4cCI6MjA3OTI4MzExNn0.iRHg-xMZ1i_qb0xnQ6vDivcFEEdrpYb0Z6cSkgOLLyU';
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLE_ID = 'mlz2jkivq3dus4x'; // ROLE_FEATURE_FLAGS

async function checkRoleFeatures() {
    console.log('🔍 Checking ROLE_FEATURE_FLAGS...');

    try {
        const url = `${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?limit=100`;
        const response = await fetch(url, {
            headers: {
                'xc-token': NOCODB_TOKEN
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const list = data.list || [];

        console.log(`✅ Found ${list.length} feature flags.`);

        console.log('📋 Feature Flags for USER role:');
        list.forEach(item => {
            console.log(`- [${item.feature_key}] (${item.feature_name}): User=${item.User}, Admin=${item.admin}, Superadmin=${item.Superadmin}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkRoleFeatures();
