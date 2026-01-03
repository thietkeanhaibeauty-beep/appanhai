
import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './nocodb-config.ts';

interface CatalogItem {
    id: string;
    name: string;
    status: string;
    effective_status: string;
    account_id: string;
    user_id: string;
    [key: string]: any;
}

export async function batchUpsertCatalog(
    items: CatalogItem[],
    tableId: string,
    idField: string = 'id' // Field name in NocoDB that stores the FB ID (e.g., 'id', 'campaign_id', etc.)
) {
    if (!items.length) return { created: 0, updated: 0, failed: 0 };

    const headers = getNocoDBHeaders();
    let created = 0;
    let updated = 0;
    let failed = 0;

    // Deduplicate items by ID
    const uniqueItems = new Map<string, CatalogItem>();
    items.forEach(item => uniqueItems.set(item.id, item));
    const processItems = Array.from(uniqueItems.values());

    // Process in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < processItems.length; i += chunkSize) {
        const chunk = processItems.slice(i, i + chunkSize);

        try {
            // 1. Check existing records
            // Construct filter: (id,eq,val1)~or(id,eq,val2)...
            // Note: NocoDB filter length limit might be an issue, so we check individually or in smaller batches if needed.
            // But for 50 items, a single filter string might be too long.
            // Strategy: Fetch all records matching the IDs? Or just try to update and if fail, insert?
            // NocoDB doesn't support "upsert" natively in one call usually.

            // Better strategy: Check existence by ID for the chunk
            // Since we can't easily query "IN" with many IDs efficiently without hitting URL length limits,
            // we might have to do it one by one or use a different approach.

            // However, for catalog, we can try to fetch by account_id and filter in memory if the table isn't huge?
            // No, table can be huge.

            // Let's try to check existence for each item in parallel (with concurrency limit)
            // or just iterate.

            const results = await Promise.all(chunk.map(async (item) => {
                try {
                    // Check if exists
                    const checkUrl = `${getNocoDBUrl(tableId)}?where=(${idField},eq,${item.id})&limit=1`;
                    const checkRes = await fetch(checkUrl, { headers });
                    const checkData = await checkRes.json();

                    const existing = checkData.list && checkData.list.length > 0 ? checkData.list[0] : null;

                    if (existing) {
                        // Update
                        const updateUrl = getNocoDBUrl(tableId, existing.Id);
                        const updateRes = await fetch(updateUrl, {
                            method: 'PATCH',
                            headers,
                            body: JSON.stringify(item)
                        });
                        if (updateRes.ok) return 'updated';
                        else throw new Error(`Update failed: ${updateRes.statusText}`);
                    } else {
                        // Insert
                        const insertUrl = getNocoDBUrl(tableId);
                        const insertRes = await fetch(insertUrl, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify(item)
                        });
                        if (insertRes.ok) return 'created';
                        else throw new Error(`Insert failed: ${insertRes.statusText}`);
                    }
                } catch (e) {
                    console.error(`Error processing item ${item.id}:`, e);
                    return 'failed';
                }
            }));

            created += results.filter(r => r === 'created').length;
            updated += results.filter(r => r === 'updated').length;
            failed += results.filter(r => r === 'failed').length;

        } catch (error) {
            console.error('Batch processing error:', error);
            failed += chunk.length;
        }
    }

    return { created, updated, failed };
}
