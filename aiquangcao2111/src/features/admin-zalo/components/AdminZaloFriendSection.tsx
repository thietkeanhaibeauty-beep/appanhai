/**
 * Admin Zalo Friend Section - Kết nối qua kết bạn trực tiếp
 * Flow:
 * 1. User nhập SĐT Zalo của họ
 * 2. App tìm user → kiểm tra trạng thái bạn bè
 * 3. Nếu chưa bạn → gửi lời mời kết bạn
 * 4. Sau khi đã bạn → lưu thông tin
 */

import { useState, useEffect } from 'react';
import { Phone, Loader2, Copy, Check, UserPlus, MessageCircle, CheckCircle2, AlertCircle, Trash2, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminZalo } from '../hooks/useAdminZalo';
import { toast } from 'sonner';
import { zaloApiClient } from '@/services/zaloApiClient';
import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from '@/services/nocodb/config';

interface AdminZaloFriendSectionProps {
    userPhone?: string;
}

type FlowStep = 'input' | 'searching' | 'found' | 'sending_request' | 'request_sent' | 'waiting_for_user' | 'already_friend' | 'success' | 'error';

interface FoundUser {
    userId: string;
    displayName: string;
    avatar?: string;
    isFriend?: boolean;
}

interface SavedConnection {
    Id: number;
    user_id: string;
    zalo_user_id: string;
    zalo_phone: string;
    zalo_name: string;
    zalo_avatar?: string;
    is_active: boolean;
}

export const AdminZaloFriendSection = ({ userPhone = '' }: AdminZaloFriendSectionProps) => {
    const { user } = useAuth();
    const { adminPhone, adminOwnId, loading: adminLoading } = useAdminZalo();

    // Form state
    const [phoneNumber, setPhoneNumber] = useState(userPhone || user?.phone || '');
    const [copied, setCopied] = useState(false);

    // Flow state
    const [step, setStep] = useState<FlowStep>('input');
    const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [activeAdminId, setActiveAdminId] = useState('');

    // Saved connections state
    const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
    const [loadingConnections, setLoadingConnections] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Fetch saved connections on mount
    useEffect(() => {
        fetchSavedConnections();
    }, [user?.id]);

    const fetchSavedConnections = async () => {
        if (!user?.id) {
            setLoadingConnections(false);
            return;
        }
        try {
            const headers = await getNocoDBHeaders();
            const tableUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_USER_CONNECTIONS);
            const url = `${tableUrl}?where=${encodeURIComponent(`(user_id,eq,${user.id})`)}`;
            const res = await fetch(url, { headers });
            const data = await res.json();
            if (data.list) {
                setSavedConnections(data.list);
            }
        } catch (error) {
            console.error('[AdminZaloFriend] Failed to fetch connections:', error);
        } finally {
            setLoadingConnections(false);
        }
    };

    // Delete a saved connection
    const handleDeleteConnection = async (connectionId: number) => {
        if (!confirm('Bạn có chắc muốn xóa liên kết này?')) return;

        try {
            const headers = await getNocoDBHeaders();
            const tableId = NOCODB_CONFIG.TABLES.ZALO_USER_CONNECTIONS;

            // NocoDB v2 delete requires: DELETE /api/v2/tables/{tableId}/records with body { Id: recordId }
            // Since proxy only handles POST/PUT/PATCH, use POST with method override in body
            const proxyUrl = `https://jtaekxrkubhwtqgodvtx.supabase.co/functions/v1/nocodb-proxy`;
            await fetch(proxyUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    path: `/api/v2/tables/${tableId}/records`,
                    method: 'DELETE',
                    data: { Id: connectionId }
                }),
            });
            toast.success('Đã xóa liên kết');
            // Refresh list
            setSavedConnections(prev => prev.filter(c => c.Id !== connectionId));
        } catch (error) {
            console.error('[AdminZaloFriend] Failed to delete connection:', error);
            toast.error('Lỗi xóa liên kết');
        }
    };

    // Copy Admin phone
    const handleCopyPhone = async () => {
        if (!adminPhone) return;
        try {
            await navigator.clipboard.writeText(adminPhone);
            setCopied(true);
            toast.success('Đã copy SĐT Admin!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Không thể copy');
        }
    };

    // Save user Zalo connection to NocoDB
    const saveUserZaloConnection = async (
        zaloUserId: string,
        zaloPhone: string,
        zaloName: string,
        zaloAvatar?: string
    ) => {
        if (!user?.id) {
            console.warn('[AdminZaloFriend] No user ID, cannot save connection');
            return;
        }

        try {
            const headers = await getNocoDBHeaders();
            const tableUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_USER_CONNECTIONS);

            // Check if connection already exists
            const checkUrl = `${tableUrl}?where=${encodeURIComponent(`(user_id,eq,${user.id})~and(zalo_user_id,eq,${zaloUserId})`)}`;
            const checkRes = await fetch(checkUrl, { headers });
            const checkData = await checkRes.json();

            const payload = {
                user_id: user.id,
                zalo_user_id: zaloUserId,
                zalo_phone: zaloPhone,
                zalo_name: zaloName,
                zalo_avatar: zaloAvatar || '',
                is_active: true,
            };

            if (checkData.list && checkData.list.length > 0) {
                // Update existing record
                const recordId = checkData.list[0].Id;
                await fetch(`${tableUrl}/${recordId}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify(payload),
                });
                console.log('[AdminZaloFriend] Updated existing connection:', recordId);
            } else {
                // Create new record
                await fetch(tableUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                });
                console.log('[AdminZaloFriend] Created new connection for user:', user.id);
            }
        } catch (error) {
            console.error('[AdminZaloFriend] Failed to save connection:', error);
            // Don't throw - connection is already successful
        }
    };

    // Main action: Find user by phone and send friend request using OLD APIs
    const handleCheckConnection = async () => {
        const inputPhone = phoneNumber.trim();
        if (!inputPhone) {
            toast.error('Vui lòng nhập SĐT Zalo');
            return;
        }
        let currentAdminId = adminOwnId;

        // Check connected accounts to ensure we use a valid ID
        try {
            const connectedRes = await zaloApiClient.getConnectedAccounts();
            if (connectedRes?.success && Array.isArray(connectedRes.data)) {
                const connectedAccounts = connectedRes.data;
                const isConnected = connectedAccounts.some((acc: any) => acc.ownId === currentAdminId);

                if (!isConnected && connectedAccounts.length > 0) {
                    // Fallback to the first available account (silent - no toast)
                    const fallback = connectedAccounts[0];
                    currentAdminId = fallback.ownId;
                } else if (!isConnected && connectedAccounts.length === 0) {
                    toast.error('Chưa có tài khoản Zalo nào được kết nối với server!');
                    return;
                }
            }
        } catch (err) {
            // Silent error handling for connected accounts check
        }

        if (!currentAdminId) {
            toast.error('Chưa xác định được Admin Zalo để xử lý.');
            return;
        }

        setActiveAdminId(currentAdminId);

        setStep('searching');
        setErrorMessage('');

        try {
            // Step 1: Find user by phone using OLD API (works on VPS!)
            const findResult = await zaloApiClient.findUser(inputPhone, currentAdminId);

            // Check if success (may have different response formats)
            if (!findResult) {
                throw new Error('Không có response từ API');
            }

            // Extract user data - API may return different formats
            let userData = findResult.data || findResult;
            let userId = userData.uid || userData.userId || userData.id;
            let displayName = userData.display_name || userData.displayName || userData.zaloName || userData.name || 'Người dùng Zalo';
            let avatar = userData.avatar || '';
            let isFriend = userData.isFriend || false;

            // If no userId found, check if error
            if (!userId) {
                setStep('error');
                setErrorMessage('Không tìm thấy người dùng với SĐT này trên Zalo. Kiểm tra lại SĐT!');
                return;
            }



            setFoundUser({
                userId,
                displayName,
                avatar,
                isFriend
            });

            // Double-check friend status using getAllFriendsByAccount (more reliable than isFriend field)
            if (!isFriend) {
                try {
                    toast.info('Đang kiểm tra trạng thái bạn bè...');
                    const friendsResult = await zaloApiClient.getAllFriendsByAccount(currentAdminId);
                    if (friendsResult?.success && Array.isArray(friendsResult.data)) {
                        const isInFriendsList = friendsResult.data.some((friend: any) =>
                            String(friend.userId || friend.uid || friend.id) === String(userId)
                        );
                        if (isInFriendsList) {
                            isFriend = true;
                        }
                    }
                } catch (friendsError) {
                    // Ignore error, continue with original isFriend value
                }
            }

            // Check if already friend
            if (isFriend) {
                // Save connection to NocoDB
                await saveUserZaloConnection(userId, inputPhone, displayName, avatar);
                setStep('success');
                toast.success(`Đã là bạn bè với ${displayName}!`);
                return;
            }

            // Step 2: Try to ACCEPT friend request (if user already sent to Admin)
            toast.info('Đang kiểm tra lời mời kết bạn...');

            // Normalize phone to local format (remove +84, use 0xxx)
            let accountSelectionValue = currentAdminId; // Default to ownId
            if (adminPhone) {
                let normalizedPhone = adminPhone.replace(/[^\d]/g, ''); // Remove non-digits
                if (normalizedPhone.startsWith('84')) {
                    normalizedPhone = '0' + normalizedPhone.substring(2); // 84xxx -> 0xxx
                }
                accountSelectionValue = normalizedPhone;
            }
            const acceptResult = await zaloApiClient.acceptFriendRequest(userId, accountSelectionValue);

            // Check accept result
            if (acceptResult?.success) {
                // Save connection to NocoDB
                await saveUserZaloConnection(userId, inputPhone, displayName, avatar);
                setStep('success');
                toast.success('Đã đồng ý kết bạn thành công! ✅');
                return;
            }

            // Analyze error message
            const errorMsg = String(acceptResult?.error || acceptResult?.message || '').toLowerCase();

            // Check if already friend
            if (errorMsg.includes('đã là bạn') || errorMsg.includes('already friend') || errorMsg.includes('tự động kết bạn')) {
                // Save connection to NocoDB
                await saveUserZaloConnection(userId, inputPhone, displayName, avatar);
                setStep('success');
                toast.success('Đã là bạn bè! ✅');
                return;
            }

            // Check if no friend request found - user needs to send request first
            if (errorMsg.includes('không có lời mời') || errorMsg.includes('not found') || errorMsg.includes('no request')) {
                setStep('waiting_for_user');
                toast.warning('Chưa nhận được lời mời kết bạn từ bạn. Vui lòng mở Zalo và gửi lời mời đến SĐT Admin!');
                return;
            }

            // Other errors (including 500 server errors) - re-check friend status
            // The accept API may fail but user might already be a friend
            try {
                const recheckResult = await zaloApiClient.findUser(inputPhone, currentAdminId);
                const recheckData = recheckResult?.data || recheckResult;
                const isNowFriend = recheckData?.isFriend || false;

                if (isNowFriend) {
                    // User is actually a friend now!
                    await saveUserZaloConnection(userId, inputPhone, displayName, avatar);
                    setStep('success');
                    toast.success('Đã là bạn bè! ✅');
                    return;
                }
            } catch (recheckError) {
                // Ignore recheck error, continue
            }

            // Could not verify friend status - show waiting_for_user step with instructions
            // This is a better UX than showing error
            setStep('waiting_for_user');
            toast.warning('Không thể xác nhận trạng thái kết bạn. Vui lòng kiểm tra Zalo và gửi lời mời nếu chưa kết bạn.');

        } catch (error: any) {
            setStep('error');
            setErrorMessage(error.message || 'Lỗi kết nối');
        }
    };

    // Step 2: Send friend request
    const handleSendFriendRequest = async () => {
        const adminIdToSend = activeAdminId || adminOwnId;
        if (!foundUser || !adminIdToSend) return;

        setStep('sending_request');

        try {
            console.log('[AdminZaloFriend] Sending friend request to:', foundUser.userId, 'from:', adminIdToSend);

            const message = `Xin chào! Tôi là Admin từ AIadsfb. Hãy kết bạn để nhận thông báo tự động về chiến dịch quảng cáo của bạn.`;

            const result = await zaloApiClient.sendFriendRequestByAccount(
                foundUser.userId,
                message,
                adminIdToSend
            );

            console.log('[AdminZaloFriend] Friend request result:', result);

            if (result.success) {
                setStep('request_sent');
                toast.success('Đã gửi lời mời kết bạn!');
            } else {
                throw new Error(result.error || 'Không thể gửi lời mời');
            }

        } catch (error: any) {
            console.error('[AdminZaloFriend] Error sending request:', error);
            setStep('error');
            setErrorMessage(error.message || 'Lỗi gửi lời mời kết bạn');
        }
    };

    // Step 3: Confirm connection (after user accepted)
    const handleConfirmConnection = async () => {
        if (!foundUser || !user) return;

        try {
            // TODO: Save to database
            // await saveUserFriendConnection(user.id, foundUser.userId, foundUser.displayName, adminOwnId);

            setStep('success');
            toast.success('Kết nối thành công!');
        } catch (error: any) {
            toast.error(error.message || 'Lỗi lưu thông tin');
        }
    };

    // Reset flow
    const handleReset = () => {
        setStep('input');
        setFoundUser(null);
        setErrorMessage('');
    };

    if (adminLoading) {
        return (
            <Card>
                <CardContent className="py-8 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-4">
            {/* Left: Settings Form */}
            <Card>
                {/* Collapsible Header */}
                <button
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-t-lg"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-blue-600" />
                        <div className="text-left">
                            <h3 className="font-semibold">Cài đặt nhận thông báo Zalo cá nhân</h3>
                            {savedConnections.length > 0 && (
                                <p className="text-xs text-muted-foreground">Đã liên kết {savedConnections.length} tài khoản</p>
                            )}
                        </div>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                </button>

                {isExpanded && (
                    <CardContent className="space-y-6 pt-0">
                        {/* Step: Input */}
                        {step === 'input' && (
                            <div className="space-y-4">
                                {/* Admin phone */}
                                <div className="space-y-2">
                                    <Label>Bước 1: Kết bạn Zalo với SĐT Admin</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-blue-100 rounded-lg font-mono text-lg text-blue-700">
                                            <Phone className="w-4 h-4" />
                                            {adminPhone || 'Chưa cấu hình'}
                                        </div>
                                        <Button variant="default" size="sm" onClick={handleCopyPhone}>
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            <span className="ml-1">{copied ? 'Đã copy' : 'Copy'}</span>
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Mở Zalo → Tìm SĐT này → Gửi lời mời kết bạn
                                    </p>
                                </div>

                                {/* User phone input */}
                                <div className="space-y-2">
                                    <Label htmlFor="user-phone">Bước 2: Nhập SĐT Zalo của bạn</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="user-phone"
                                            placeholder="0912345678"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                <Button
                                    className="w-full"
                                    onClick={handleCheckConnection}
                                    disabled={!phoneNumber.trim()}
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Kiểm tra kết nối
                                </Button>
                            </div>
                        )}

                        {/* Step: Searching */}
                        {step === 'searching' && (
                            <div className="flex flex-col items-center py-8 gap-4">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                <p className="text-muted-foreground">Đang tìm người dùng...</p>
                            </div>
                        )}

                        {/* Step: Found - Need to send friend request */}
                        {step === 'found' && foundUser && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                                    {foundUser.avatar ? (
                                        <img src={foundUser.avatar} className="w-12 h-12 rounded-full" alt="" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                            <Phone className="w-6 h-6 text-blue-600" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium">{foundUser.displayName}</p>
                                        <p className="text-sm text-muted-foreground">SĐT: {phoneNumber}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium">Chưa là bạn bè</p>
                                        <p>Nhấn nút bên dưới để Admin gửi lời mời kết bạn đến bạn.</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={handleReset}>
                                        Quay lại
                                    </Button>
                                    <Button className="flex-1" onClick={handleSendFriendRequest}>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Gửi lời mời kết bạn
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step: Sending request */}
                        {step === 'sending_request' && (
                            <div className="flex flex-col items-center py-8 gap-4">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                <p className="text-muted-foreground">Đang gửi lời mời kết bạn...</p>
                            </div>
                        )}

                        {/* Step: Request sent - waiting for user to accept */}
                        {step === 'request_sent' && foundUser && (
                            <div className="space-y-4">
                                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
                                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium">Đã gửi lời mời kết bạn!</p>
                                        <p>Vui lòng mở Zalo và chấp nhận lời mời từ Admin ({adminPhone}).</p>
                                        <p className="mt-2">Sau khi chấp nhận, nhấn nút bên dưới.</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={handleReset}>
                                        Quay lại
                                    </Button>
                                    <Button className="flex-1" onClick={handleConfirmConnection}>
                                        <Check className="w-4 h-4 mr-2" />
                                        Tôi đã chấp nhận
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step: Waiting for user to send friend request */}
                        {step === 'waiting_for_user' && foundUser && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                                    {foundUser.avatar ? (
                                        <img src={foundUser.avatar} className="w-12 h-12 rounded-full" alt="" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                            <Phone className="w-6 h-6 text-blue-600" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium">{foundUser.displayName}</p>
                                        <p className="text-sm text-muted-foreground">SĐT: {phoneNumber}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium">Chưa nhận được lời mời kết bạn</p>
                                        <p>Vui lòng mở Zalo, tìm SĐT <strong>{adminPhone}</strong> và gửi lời mời kết bạn đến Admin.</p>
                                        <p className="mt-2">Sau khi gửi lời mời, nhấn "Kiểm tra lại" để Admin đồng ý.</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={handleReset}>
                                        Quay lại
                                    </Button>
                                    <Button className="flex-1" onClick={handleCheckConnection}>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Kiểm tra lại
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step: Already friend */}
                        {step === 'already_friend' && foundUser && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                                    <div>
                                        <p className="font-medium text-green-800">Đã là bạn bè!</p>
                                        <p className="text-sm text-green-700">{foundUser.displayName}</p>
                                    </div>
                                </div>

                                <Button className="w-full" onClick={handleConfirmConnection}>
                                    <Check className="w-4 h-4 mr-2" />
                                    Xác nhận kết nối
                                </Button>
                            </div>
                        )}

                        {/* Step: Success */}
                        {step === 'success' && (
                            <div className="flex flex-col items-center py-8 gap-4">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                                </div>
                                <div className="text-center">
                                    <p className="font-medium text-lg">Đã là bạn bè!</p>
                                    <p className="text-muted-foreground">Bạn sẽ nhận thông báo qua Zalo.</p>
                                </div>
                            </div>
                        )}

                        {/* Step: Error */}
                        {step === 'error' && (
                            <div className="space-y-4">
                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium">Có lỗi xảy ra</p>
                                        <p>{errorMessage}</p>
                                    </div>
                                </div>

                                <Button variant="outline" className="w-full" onClick={handleReset}>
                                    Thử lại
                                </Button>
                            </div>
                        )}

                    </CardContent>
                )}
            </Card>

            {/* Right: Connected Accounts List */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Phone className="w-5 h-5 text-green-600" />
                        Tài khoản Zalo đã liên kết ({savedConnections.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingConnections ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : savedConnections.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Phone className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p>Chưa có tài khoản nào</p>
                            <p className="text-xs">Thêm tài khoản ở bên trái</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {savedConnections.map((conn) => (
                                <div key={conn.Id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        {conn.zalo_avatar ? (
                                            <img src={conn.zalo_avatar} className="w-10 h-10 rounded-full" alt="" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                <Phone className="w-5 h-5 text-blue-600" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-sm">{conn.zalo_name || 'Zalo User'}</p>
                                            <p className="text-xs text-muted-foreground">{conn.zalo_phone}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDeleteConnection(conn.Id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
