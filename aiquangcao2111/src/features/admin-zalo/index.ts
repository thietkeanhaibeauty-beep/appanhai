/**
 * Admin Zalo Feature - Public exports
 * Located: src/features/admin-zalo/index.ts
 */

// Main components
export { AdminZaloSection } from './components/AdminZaloSection';
export { AdminZaloFriendSection } from './components/AdminZaloFriendSection';

// Sub-components (for custom usage)
export { AdminPhoneDisplay } from './components/AdminPhoneDisplay';
export { GroupLinkInput } from './components/GroupLinkInput';
export { VerificationStatus } from './components/VerificationStatus';

// Hooks
export { useAdminZalo } from './hooks/useAdminZalo';
export { useGroupJoin } from './hooks/useGroupJoin';

// Services
export {
    getAdminZaloAccount,
    setAdminZaloAccount,
    joinGroupByLink,
    sendTestMessage,
} from './services/adminZaloService';

export {
    saveUserAdminGroup,
    getUserAdminGroups,
    verifyGroup,
} from './services/groupVerification';

// Types
export type { AdminZaloAccount } from './services/adminZaloService';
export type { UserAdminGroup } from './services/groupVerification';
