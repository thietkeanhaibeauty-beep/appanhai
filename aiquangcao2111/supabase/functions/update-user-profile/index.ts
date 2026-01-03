import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateProfileRequest {
    full_name?: string;
    avatar_url?: string;
    // AI Assistant personalization - using actual NocoDB column names
    ai_nickname?: string;
    ai_avatar_url?: any; // Changed from ai_avatar
    ai_pronoun_style?: string; // Changed from ai_self_pronoun
    ai_pronoun_custom?: string; // Changed from ai_user_pronoun
}

/**
 * Get profile by user_id
 */
async function getProfile(userId: string): Promise<any | null> {
    try {
        const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
        const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.PROFILES}/records?where=${whereClause}&limit=1`;

        const response = await fetch(url, {
            method: 'GET',
            headers: getNocoDBHeaders(),
        });

        if (!response.ok) {
            console.error('❌ Get profile failed:', response.status, await response.text());
            return null;
        }

        const data = await response.json();
        return data.list?.[0] || null;
    } catch (error) {
        console.error('❌ getProfile error:', error);
        return null;
    }
}

/**
 * Create profile
 */
async function createProfile(profileData: any): Promise<any | null> {
    try {
        const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.PROFILES}/records`;

        const response = await fetch(url, {
            method: 'POST',
            headers: getNocoDBHeaders(),
            body: JSON.stringify(profileData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Create profile failed:', response.status, errorText);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('❌ createProfile error:', error);
        return null;
    }
}

/**
 * Update profile by record Id
 */
async function updateProfile(recordId: number, updates: UpdateProfileRequest): Promise<any | null> {
    try {
        const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.PROFILES}/records`;

        const response = await fetch(url, {
            method: 'PATCH',
            headers: getNocoDBHeaders(),
            body: JSON.stringify({
                Id: recordId,
                ...updates,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Update profile failed:', response.status, errorText);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('❌ updateProfile error:', error);
        return null;
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        );

        // Get authenticated user
        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            console.error('❌ Auth error:', userError);
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { action, full_name, avatar_url, ai_nickname, ai_avatar_url, ai_pronoun_style, ai_pronoun_custom } = await req.json();

        // GET: Return current profile
        if (action === 'get' || req.method === 'GET') {
            const profile = await getProfile(user.id);
            return new Response(
                JSON.stringify({
                    success: true,
                    profile: profile || null,
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // UPDATE: Update or create profile
        if (action === 'update') {
            console.log(`📝 Updating profile for user: ${user.id}`);

            // Check if profile exists
            let profile = await getProfile(user.id);

            if (!profile) {
                // Create new profile
                console.log('📝 Profile not found, creating new one...');
                profile = await createProfile({
                    user_id: user.id,
                    email: user.email,
                    full_name: full_name || '',
                    avatar_url: avatar_url || '',
                });

                if (!profile) {
                    throw new Error('Failed to create profile');
                }

                console.log('✅ Profile created successfully');
                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Profile created successfully',
                        profile: profile,
                    }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Update existing profile
            const updates: UpdateProfileRequest = {};
            if (full_name !== undefined) updates.full_name = full_name;
            if (avatar_url !== undefined) updates.avatar_url = avatar_url;
            // AI Assistant personalization fields - using actual NocoDB column names
            if (ai_nickname !== undefined) updates.ai_nickname = ai_nickname;
            if (ai_avatar_url !== undefined) updates.ai_avatar_url = ai_avatar_url;
            if (ai_pronoun_style !== undefined) updates.ai_pronoun_style = ai_pronoun_style;
            if (ai_pronoun_custom !== undefined) updates.ai_pronoun_custom = ai_pronoun_custom;

            const updated = await updateProfile(profile.Id, updates);

            if (!updated) {
                throw new Error('Failed to update profile');
            }

            // Fetch updated profile
            const refreshedProfile = await getProfile(user.id);

            console.log('✅ Profile updated successfully');
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Profile updated successfully',
                    profile: refreshedProfile,
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ error: 'Invalid action. Use "get" or "update"' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('❌ Update profile error:', error);
        const err = error as Error;
        return new Response(
            JSON.stringify({
                error: err.message || 'Internal server error',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
