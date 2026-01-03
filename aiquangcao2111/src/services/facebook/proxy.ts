/**
 * Facebook Graph API Proxy Helper
 * Calls Facebook API through Supabase Edge Function to hide access token from browser
 */

import { supabase } from '@/integrations/supabase/client';

export interface FacebookAPIParams {
    accessToken: string;
    endpoint: string;
    method?: 'GET' | 'POST' | 'DELETE';
    params?: Record<string, any>;
    body?: Record<string, any>;
    useFormData?: boolean;
}

export interface FacebookAPIResponse<T = any> {
    data?: T;
    error?: {
        message: string;
        code?: number;
        type?: string;
    };
    paging?: {
        cursors?: { before?: string; after?: string };
        next?: string;
    };
}

/**
 * Call Facebook Graph API through proxy
 * Token is sent to Edge Function, not exposed in browser Network tab
 */
export async function callFacebookAPI<T = any>(
    params: FacebookAPIParams
): Promise<FacebookAPIResponse<T>> {
    try {
        const { data, error } = await supabase.functions.invoke('facebook-graph-proxy', {
            body: {
                accessToken: params.accessToken,
                endpoint: params.endpoint,
                method: params.method || 'GET',
                params: params.params || {},
                body: params.body || null,
                useFormData: params.useFormData || false,
            }
        });

        if (error) {
            console.error('[callFacebookAPI] Supabase error:', error);
            return { error: { message: error.message } };
        }

        // Check if Facebook returned an error
        if (data?.error) {
            return {
                error: {
                    message: data.fb_error_message || data.error.message || 'Facebook API error',
                    code: data.fb_error_code || data.error.code,
                    type: data.fb_error_type || data.error.type,
                }
            };
        }

        return data as FacebookAPIResponse<T>;
    } catch (err) {
        console.error('[callFacebookAPI] Exception:', err);
        return {
            error: {
                message: err instanceof Error ? err.message : 'Unknown error'
            }
        };
    }
}

/**
 * Helper to get data array from Facebook API response
 */
export function getFacebookData<T>(response: FacebookAPIResponse<T[]>): T[] {
    if (response.error) {
        console.warn('[getFacebookData] API returned error:', response.error);
        return [];
    }
    return (response as any).data || (response as any) || [];
}
