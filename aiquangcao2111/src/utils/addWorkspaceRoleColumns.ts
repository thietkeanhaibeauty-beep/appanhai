/**
 * Script để thêm workspace role columns vào ROLE_FEATURE_FLAGS table
 * Chạy 1 lần để migrate database
 * 
 * Usage: Mở file này và chạy hàm addWorkspaceRoleColumns() từ browser console
 */

import { NOCODB_CONFIG, getNocoDBHeaders } from '@/services/nocodb/config';

const TABLE_ID = NOCODB_CONFIG.TABLES.ROLE_FEATURE_FLAGS;
const BASE_URL = NOCODB_CONFIG.BASE_URL;

// Columns cần thêm
const WORKSPACE_ROLE_COLUMNS = [
    { column_name: 'ws_owner', title: 'Owner', uidt: 'Checkbox', default: true },
    { column_name: 'ws_admin', title: 'Admin (WS)', uidt: 'Checkbox', default: true },
    { column_name: 'ws_marketing', title: 'Marketing', uidt: 'Checkbox', default: false },
    { column_name: 'ws_sales', title: 'Sales', uidt: 'Checkbox', default: false },
];

/**
 * Thêm column vào table
 */
async function addColumn(columnConfig: typeof WORKSPACE_ROLE_COLUMNS[0]) {
    const url = `${BASE_URL}/api/v2/meta/tables/${TABLE_ID}/columns`;

    const response = await fetch(url, {
        method: 'POST',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify({
            column_name: columnConfig.column_name,
            title: columnConfig.title,
            uidt: columnConfig.uidt,
            dt: 'boolean',
            default: columnConfig.default ? 1 : 0,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        // Ignore if column already exists
        if (error.includes('already exists') || error.includes('duplicate')) {
            console.log(`ℹ️ Column ${columnConfig.column_name} already exists`);
            return true;
        }
        console.error(`❌ Failed to add column ${columnConfig.column_name}:`, error);
        return false;
    }

    console.log(`✅ Added column ${columnConfig.column_name}`);
    return true;
}

/**
 * Main function - thêm tất cả workspace role columns
 */
export async function addWorkspaceRoleColumns() {
    console.log('🚀 Adding workspace role columns to ROLE_FEATURE_FLAGS table...');

    for (const column of WORKSPACE_ROLE_COLUMNS) {
        await addColumn(column);
    }

    console.log('✅ Done! Refresh NocoDB to see new columns.');
}

/**
 * Set default values cho existing records
 * owner và admin mặc định là true (có tất cả)
 * marketing và sales mặc định là false (cần tick thủ công)
 */
export async function setDefaultWorkspaceRoles() {
    console.log('🔧 Setting default values for workspace roles...');

    // Get all records
    const url = `${BASE_URL}/api/v2/tables/${TABLE_ID}/records?limit=1000`;
    const response = await fetch(url, { headers: await getNocoDBHeaders() });
    const data = await response.json();
    const records = data.list || [];

    // Update each record
    for (const record of records) {
        const updateUrl = `${BASE_URL}/api/v2/tables/${TABLE_ID}/records`;
        await fetch(updateUrl, {
            method: 'PATCH',
            headers: await getNocoDBHeaders(),
            body: JSON.stringify({
                Id: record.Id,
                ws_owner: true,
                ws_admin: true,
                ws_marketing: false,  // Cần tick thủ công
                ws_sales: false,      // Cần tick thủ công
            }),
        });
    }

    console.log(`✅ Updated ${records.length} records with default workspace roles`);
}

// Export để có thể gọi từ console
if (typeof window !== 'undefined') {
    (window as any).addWorkspaceRoleColumns = addWorkspaceRoleColumns;
    (window as any).setDefaultWorkspaceRoles = setDefaultWorkspaceRoles;
}
