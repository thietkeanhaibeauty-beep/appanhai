/**
 * Script to add new feature: Zalo Personal Notification
 * Run this once via browser console or import in a component
 */
import { createNewFeature } from '@/services/nocodb/featureFlagsService';

export const addZaloNotificationFeature = async () => {
    try {
        const result = await createNewFeature({
            key: 'notification_zalo_personal',
            name: 'Thông báo Zalo cá nhân',
            description: 'Gửi thông báo về Zalo cá nhân của người dùng',
            category: 'system', // Will show as ⚙️ Hệ thống
            tiers: {
                Trial: false,
                Starter: false,
                Pro: true,         // Pro trở lên có tính năng này
                Enterprise: true,
                Team: true,
            },
        });

        console.log('✅ Created Zalo notification feature:', result);
        return result;
    } catch (error) {
        console.error('❌ Error creating feature:', error);
        throw error;
    }
};

// Export for use
export default addZaloNotificationFeature;
