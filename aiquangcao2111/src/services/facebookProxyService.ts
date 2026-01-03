
import { supabase } from "@/integrations/supabase/client";

interface ProxyRequestOptions {
    accessToken: string;
    endpoint: string; // e.g. 'me/adaccounts' or 'act_123/campaigns'
    method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
    params?: Record<string, any>; // Query parameters
    body?: any; // Request body for POST/PUT
}

export const fbProxy = {
    request: async <T = any>({ accessToken, endpoint, method = 'GET', params = {}, body = null }: ProxyRequestOptions): Promise<T> => {
        const { data, error } = await supabase.functions.invoke('facebook-graph-proxy', {
            body: {
                accessToken,
                endpoint,
                method,
                params,
                body
            }
        });

        if (error) {
            console.error('[fbProxy] Edge Function Invocation Error:', error);
            console.error('[fbProxy] Request context:', { endpoint, method });
            // Check if it's a non-2xx response which might contain body
            // Supabase functions.invoke returns error if status is not 2xx, but details might be in error context depending on SDK version
            // But usually error is an Error object.
            // If the Edge function returned 400 with a JSON body, supabase client might treat it as error.

            throw new Error(`Proxy connection failed: ${error.message || 'Edge Function returned a non-2xx status code'}`);
        }

        // Handle error returned by Edge Function (which proxies Facebook error)
        if (data && data.error) {
            const fbError = data.error;
            // Include subcode in error message for downstream detection
            const errorMsg = `Facebook API Error via Proxy: [${fbError.type}] ${fbError.message} (Code: ${fbError.code}${fbError.error_subcode ? `, Subcode: ${fbError.error_subcode}` : ''})`;
            const error = new Error(errorMsg);
            // Attach subcode for easy detection
            (error as any).error_subcode = fbError.error_subcode;
            (error as any).error_user_msg = fbError.error_user_msg;
            throw error;
        }

        return data as T;
    }
};
