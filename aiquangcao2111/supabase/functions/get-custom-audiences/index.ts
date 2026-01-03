import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CustomAudience {
    id: string;
    name: string;
    subtype: string;
    approximate_count: number;
    description?: string;
    time_created?: string;
    time_updated?: string;
    delivery_status?: any;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // ✅ Authenticate user
        const user = await getUserFromRequest(req);
        console.log('[Get Custom Audiences] User:', user.id);

        const { adsToken, adAccountId } = await req.json();

        if (!adsToken || !adAccountId) {
            // ✅ Try to get from NocoDB if not provided
            const accountUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS}/records?where=(user_id,eq,${user.id})~and(is_active,eq,1)&limit=1`;

            const accountRes = await fetch(accountUrl, {
                headers: getNocoDBHeaders(),
            });

            if (!accountRes.ok) {
                throw new Error('Failed to fetch ad account settings');
            }

            const accountData = await accountRes.json();
            const account = accountData.list?.[0];

            if (!account) {
                throw new Error('No active ad account found. Please configure in Settings.');
            }

            const fetchToken = adsToken || account.access_token;
            const fetchAccountId = adAccountId || account.account_id;

            return await fetchCustomAudiences(fetchToken, fetchAccountId, user.id);
        }

        return await fetchCustomAudiences(adsToken, adAccountId, user.id);

    } catch (error) {
        console.error('[Get Custom Audiences] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

async function fetchCustomAudiences(
    accessToken: string,
    adAccountId: string,
    userId: string
): Promise<Response> {
    // Ensure act_ prefix for Facebook API
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    console.log(`[Get Custom Audiences] Fetching for account: ${formattedAccountId}, user: ${userId}`);

    // Facebook Graph API call
    const fields = 'id,name,subtype,approximate_count,description,time_created,time_updated,delivery_status';
    const url = `https://graph.facebook.com/v24.0/${formattedAccountId}/customaudiences?fields=${fields}&limit=100&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        console.error('[Get Custom Audiences] Facebook API error:', data);
        throw new Error(data.error?.message || 'Failed to fetch custom audiences');
    }

    console.log(`[Get Custom Audiences] Found ${data.data?.length || 0} audiences`);

    // Filter and format audiences
    const audiences: CustomAudience[] = (data.data || []).map((aud: any) => ({
        id: aud.id,
        name: aud.name,
        subtype: aud.subtype,
        approximate_count: aud.approximate_count || 0,
        description: aud.description,
        time_created: aud.time_created,
        time_updated: aud.time_updated,
        delivery_status: aud.delivery_status
    }));

    // Sort by approximate_count (largest first)
    audiences.sort((a, b) => (b.approximate_count || 0) - (a.approximate_count || 0));

    return new Response(
        JSON.stringify({
            success: true,
            audiences,
            count: audiences.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}
