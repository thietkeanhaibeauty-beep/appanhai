import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const BASE_ID = 'p0lvt22fuj3opkl';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log('🚀 Creating ai_keywords_config table in NocoDB...');

        const results = [];

        // Create ai_keywords_config table
        const tableSchema = {
            table_name: 'ai_keywords_config',
            title: 'ai_keywords_config',
            columns: [
                {
                    column_name: 'id',
                    title: 'id',
                    uidt: 'ID',
                    pk: true,
                    ai: true,
                },
                {
                    column_name: 'intent_type',
                    title: 'intent_type',
                    uidt: 'SingleLineText',
                    rqd: true,
                },
                {
                    column_name: 'category',
                    title: 'category',
                    uidt: 'SingleLineText',
                    rqd: false,
                },
                {
                    column_name: 'metric_name',
                    title: 'metric_name',
                    uidt: 'SingleLineText',
                    rqd: true,
                },
                {
                    column_name: 'keywords',
                    title: 'keywords',
                    uidt: 'LongText', // JSON array stored as text
                    rqd: true,
                },
                {
                    column_name: 'description',
                    title: 'description',
                    uidt: 'LongText',
                    rqd: false,
                },
                {
                    column_name: 'is_active',
                    title: 'is_active',
                    uidt: 'Checkbox',
                    rqd: false,
                },
                {
                    column_name: 'created_at',
                    title: 'created_at',
                    uidt: 'DateTime',
                    rqd: false,
                },
                {
                    column_name: 'updated_at',
                    title: 'updated_at',
                    uidt: 'DateTime',
                    rqd: false,
                },
            ],
        };

        try {
            const response = await fetch(
                `${NOCODB_BASE_URL}/api/v2/meta/bases/${BASE_ID}/tables`,
                {
                    method: 'POST',
                    headers: {
                        'xc-token': NOCODB_API_TOKEN,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(tableSchema),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(`NocoDB error: ${JSON.stringify(data)}`);
            }

            results.push({
                table: 'ai_keywords_config',
                success: true,
                message: '✅ Đã tạo bảng ai_keywords_config',
                table_id: data.id,
            });

            console.log('✅ Created ai_keywords_config table:', data.id);
        } catch (error: any) {
            console.error('❌ Error creating ai_keywords_config table:', error);
            results.push({
                table: 'ai_keywords_config',
                success: false,
                error: error?.message || 'Unknown error',
            });
        }

        return new Response(
            JSON.stringify({
                success: results.some(r => r.success),
                results,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    } catch (error: any) {
        console.error('❌ Unexpected error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error?.message || 'Unknown error',
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});
