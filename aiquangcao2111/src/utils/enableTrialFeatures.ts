/**
 * Utility to enable all features for Trial tier
 * Run this from browser console: enableTrialFeatures()
 */

import { getAllRoleFeatureFlags, updatePackageTierFeature } from '@/services/nocodb/featureFlagsService';

export const enableTrialFeatures = async () => {
    console.log('🔄 Enabling all features for Trial tier...');

    try {
        // Get all role features
        const roleFeatures = await getAllRoleFeatureFlags();
        console.log(`📋 Found ${roleFeatures.length} features`);

        let enabled = 0;
        let skipped = 0;

        // Enable each feature for Trial
        for (const rf of roleFeatures) {
            // Skip if already enabled
            if (rf.Trial === true) {
                console.log(`⏭️ ${rf.feature_key}: already enabled`);
                skipped++;
                continue;
            }

            try {
                await updatePackageTierFeature(rf.feature_key, 'Trial', true);
                console.log(`✅ ${rf.feature_key}: enabled`);
                enabled++;
            } catch (err) {
                console.error(`❌ ${rf.feature_key}: failed`, err);
            }
        }

        console.log(`\n🎉 Done! Enabled: ${enabled}, Skipped: ${skipped}`);
        return { enabled, skipped };
    } catch (error) {
        console.error('❌ Error enabling Trial features:', error);
        throw error;
    }
};

// Make available globally for console access
if (typeof window !== 'undefined') {
    (window as any).enableTrialFeatures = enableTrialFeatures;
}
