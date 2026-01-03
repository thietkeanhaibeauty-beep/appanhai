
/**
 * Service to handle sending notifications to Zalo via n8n Webhook
 */

// Default to localhost for development if env var is not set
const DEFAULT_WEBHOOK_URL = 'http://localhost:5678/webhook-test/zalo-notify';

export const zaloNotificationService = {
    /**
     * Send a notification message to a Zalo group via n8n
     * @param message The message content to send
     * @param groupId Optional group ID (if not provided, n8n workflow should have a default)
     */
    sendGroupNotification: async (message: string, groupId?: string) => {
        try {
            // Get webhook URL from env or use default
            const webhookUrl = import.meta.env.VITE_N8N_ZALO_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    groupId,
                    timestamp: new Date().toISOString(),
                    source: 'ai-ads-app'
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to send notification: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            return { success: true, data: result };
        } catch (error) {
            console.error('[Zalo Service] Error sending notification:', error);
            return { success: false, error };
        }
    }
};
