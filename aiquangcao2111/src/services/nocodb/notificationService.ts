import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from "./config";

export interface NotificationConfig {
    id: string;
    Id?: number; // Exists in DB
    user_id: string;
    name: string;
    schedule_type: 'interval' | 'daily';
    schedule_value: string; // '60' or '07:00'
    selected_metrics: string[]; // Array of metric keys
    is_active: boolean;
    zalo_own_id?: string;
    zalo_group_id?: string;
    zalo_group_name?: string;
    last_run_at?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Notification {
    id: string; // Added back
    Id?: number;
    user_id: string;
    config_id?: string;
    title: string;
    content: string;
    type: 'report' | 'system' | 'alert';
    is_read: boolean;
    created_at: string;
}

export const getNotificationConfigs = async (userId: string): Promise<NotificationConfig[]> => {
    try {

        const response = await fetch(
            `${getNocoDBUrl(NOCODB_CONFIG.TABLES.NOTIFICATION_CONFIGS)}?where=(user_id,eq,${userId})`,
            {
                headers: await getNocoDBHeaders(),
            }
        );

        if (!response.ok) {
            console.error('❌ API Error:', response.status, response.statusText);
            throw new Error('Failed to fetch configs');
        }
        const data = await response.json();


        return (data.list || []).map((item: any) => {
            return {
                ...item,
                id: item.Id ? String(item.Id) : item.CreatedAt, // Prefer Id, fallback to CreatedAt
                selected_metrics: typeof item.selected_metrics === 'string'
                    ? (() => {
                        try {
                            const parsed = JSON.parse(item.selected_metrics);
                            return Array.isArray(parsed) ? parsed : [];
                        } catch (e) {
                            // If not JSON, assume comma-separated string
                            return item.selected_metrics.split(',').map((s: string) => s.trim()).filter(Boolean);
                        }
                    })()
                    : item.selected_metrics
            };
        });
    } catch (error) {
        console.error('Error fetching notification configs:', error);
        return [];
    }
};

export const createNotificationConfig = async (configData: Omit<NotificationConfig, 'id'>) => {
    try {
        const payload = {
            ...configData,
            // selected_metrics is already an array, NocoDB handles JSON column automatically
        };

        const response = await fetch(
            getNocoDBUrl(NOCODB_CONFIG.TABLES.NOTIFICATION_CONFIGS),
            {
                method: 'POST',
                headers: await getNocoDBHeaders(),
                body: JSON.stringify(payload),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Failed to create config. Status:', response.status);
            console.error('❌ Error Body:', errorText);
            throw new Error(`Failed to create config: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error creating notification config:', error);
        throw error;
    }
};

export const updateNotificationConfig = async (id: string, data: Partial<NotificationConfig>) => {
    try {
        const updateData = { ...data };

        // Handle ID: Try number, if NaN use string
        const numId = Number(id);
        const finalId = isNaN(numId) ? id : numId;

        const payload = {
            Id: finalId,
            ...updateData
        };

        // Construct Proxy Command
        const fullUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.NOTIFICATION_CONFIGS);
        const proxyBaseUrl = fullUrl.split('/api/v2')[0];
        const path = `/api/v2/tables/${NOCODB_CONFIG.TABLES.NOTIFICATION_CONFIGS}/records`;

        console.log('🔄 Update via Proxy:', { proxyBaseUrl, path, payload });

        const response = await fetch(proxyBaseUrl, {
            method: 'POST',
            headers: await getNocoDBHeaders(),
            body: JSON.stringify({
                path: path,
                method: 'PATCH',
                data: payload
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Failed to update config:', response.status, errorText);
            throw new Error(`Failed to update config: ${response.status} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error updating notification config:', error);
        throw error;
    }
};

export const deleteNotificationConfig = async (id: string) => {
    try {
        // Handle ID: Try number, if NaN use string
        const numId = Number(id);
        const finalId = isNaN(numId) ? id : numId;

        // Construct Proxy Command
        const fullUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.NOTIFICATION_CONFIGS);
        const proxyBaseUrl = fullUrl.split('/api/v2')[0];
        const path = `/api/v2/tables/${NOCODB_CONFIG.TABLES.NOTIFICATION_CONFIGS}/records`;

        console.log('🗑️ Delete via Proxy:', { proxyBaseUrl, path, id: finalId });

        const response = await fetch(proxyBaseUrl, {
            method: 'POST',
            headers: await getNocoDBHeaders(),
            body: JSON.stringify({
                path: path,
                method: 'DELETE',
                data: [{ Id: finalId }] // ✅ NocoDB expects Array for DELETE
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Failed to delete config:', response.status, errorText);
            throw new Error('Failed to delete config');
        }
        return await response.json();
    } catch (error) {
        console.error('Error deleting notification config:', error);
        throw error;
    }
};

// Notifications
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
    try {
        // Sort by -Id to get newest first. Fetch ALL notifications (read and unread)
        const response = await fetch(
            `${getNocoDBUrl(NOCODB_CONFIG.TABLES.NOTIFICATIONS)}?where=(user_id,eq,${userId})&sort=-Id&limit=50`,
            {
                headers: await getNocoDBHeaders(),
            }
        );

        if (!response.ok) throw new Error('Failed to fetch notifications');
        const data = await response.json();

        return (data.list || []).map((item: any) => {
            return {
                ...item,
                id: String(item.Id), // Use Id as the unique string id
                // Handle is_read being a string "false"/"true" in DB
                is_read: item.is_read === 'true' || item.is_read === true,
                created_at: item.CreatedAt1 || item.created_at || new Date().toISOString()
            };
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
};

export const markNotificationAsRead = async (id: number) => {
    try {
        // Construct Proxy Command
        const fullUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.NOTIFICATIONS);
        const proxyBaseUrl = fullUrl.split('/api/v2')[0];
        const path = `/api/v2/tables/${NOCODB_CONFIG.TABLES.NOTIFICATIONS}/records`;

        const response = await fetch(proxyBaseUrl, {
            method: 'POST',
            headers: await getNocoDBHeaders(),
            body: JSON.stringify({
                path: path,
                method: 'PATCH',
                data: {
                    Id: id,
                    is_read: 'true'
                }
            })
        });

        if (!response.ok) throw new Error('Failed to mark as read');
        return await response.json();
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
};
