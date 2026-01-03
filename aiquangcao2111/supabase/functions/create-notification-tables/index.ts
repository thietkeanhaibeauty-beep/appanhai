import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
        const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
        const BASE_ID = 'p0lvt22fuj3opkl';

        console.log('🚀 Starting Notification tables creation...');

        // Table definitions
        const tables = [
            {
                name: 'notification_configs',
                title: 'Notification Configs',
                columns: [
                    { column_name: 'Id', title: 'Id', uidt: 'ID', pk: true, ai: true },
                    { column_name: 'CreatedAt', title: 'CreatedAt', uidt: 'DateTime', default: 'now()' },
                    { column_name: 'UpdatedAt', title: 'UpdatedAt', uidt: 'DateTime', default: 'now()' },
                    { column_name: 'user_id', title: 'user_id', uidt: 'SingleLineText', rqd: true },
                    { column_name: 'name', title: 'name', uidt: 'SingleLineText', rqd: true },
                    { column_name: 'schedule_type', title: 'schedule_type', uidt: 'SingleLineText' }, // 'interval' | 'daily'
                    { column_name: 'schedule_value', title: 'schedule_value', uidt: 'SingleLineText' }, // '60' or '07:00'
                    { column_name: 'selected_metrics', title: 'selected_metrics', uidt: 'LongText' }, // JSON string
                    { column_name: 'is_active', title: 'is_active', uidt: 'Checkbox' },
                    { column_name: 'last_run_at', title: 'last_run_at', uidt: 'DateTime' }
                ]
            },
            {
                name: 'notifications',
                title: 'Notifications',
                columns: [
                    { column_name: 'Id', title: 'Id', uidt: 'ID', pk: true, ai: true },
                    { column_name: 'CreatedAt', title: 'CreatedAt', uidt: 'DateTime', default: 'now()' },
                    { column_name: 'UpdatedAt', title: 'UpdatedAt', uidt: 'DateTime', default: 'now()' },
                    { column_name: 'user_id', title: 'user_id', uidt: 'SingleLineText', rqd: true },
                    { column_name: 'config_id', title: 'config_id', uidt: 'SingleLineText' },
                    { column_name: 'title', title: 'title', uidt: 'SingleLineText' },
                    { column_name: 'content', title: 'content', uidt: 'LongText' },
                    { column_name: 'type', title: 'type', uidt: 'SingleLineText' }, // 'report' | 'system'
                    { column_name: 'is_read', title: 'is_read', uidt: 'Checkbox' }
                ]
            }
        ];

        const results = [];

        // Create each table
        for (const tableConfig of tables) {
            console.log(`📋 Creating table: ${tableConfig.name}...`);

            try {
                const response = await fetch(
                    `${NOCODB_BASE_URL}/api/v2/meta/bases/${BASE_ID}/tables`,
                    {
                        method: 'POST',
                        headers: {
                            'xc-token': NOCODB_API_TOKEN,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            table_name: tableConfig.name,
                            title: tableConfig.title,
                            columns: tableConfig.columns
                        })
                    }
                );

                const responseText = await response.text();
                console.log(`Response status for ${tableConfig.name}:`, response.status);

                if (!response.ok) {
                    // Check if error is because table already exists
                    if (responseText.includes('already exists')) {
                        results.push({
                            table: tableConfig.name,
                            success: true,
                            message: `⚠️ Table ${tableConfig.name} already exists (Skipped)`
                        });
                        continue;
                    }
                    throw new Error(`Failed to create ${tableConfig.name}: ${response.status} ${responseText}`);
                }

                const result = JSON.parse(responseText);
                results.push({
                    table: tableConfig.name,
                    success: true,
                    table_id: result.id,
                    message: `✅ Created ${tableConfig.name} with ID: ${result.id}`
                });

                console.log(`✅ Successfully created ${tableConfig.name} (ID: ${result.id})`);
            } catch (error) {
                console.error(`❌ Error creating ${tableConfig.name}:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                results.push({
                    table: tableConfig.name,
                    success: false,
                    error: errorMessage
                });
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Table creation process completed',
                results: results
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        );

    } catch (error) {
        console.error('❌ Error in create-notification-tables function:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(
            JSON.stringify({
                error: errorMessage
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        );
    }
});
