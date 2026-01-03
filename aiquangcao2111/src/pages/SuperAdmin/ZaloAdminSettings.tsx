/**
 * Super Admin - Zalo Admin Settings
 * Manages Admin Zalo account for sending notifications to users
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, QrCode, RefreshCw, Phone, User, Trash2, Copy, Check, MessageSquare } from 'lucide-react';
import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from '@/services/nocodb/config';
import { zaloApiClient } from '@/services/zaloApiClient';
import { zaloAuthService } from '@/services/zaloAuthService';
import { supabase } from '@/integrations/supabase/client';

interface AdminZaloAccount {
    Id: number;
    own_id: string;
    display_name: string;
    phone_number: string;
    avatar_url?: string;
    is_active?: boolean;
    CreatedAt?: string;
}

const ZaloAdminSettings = () => {
    const [loading, setLoading] = useState(true);
    const [adminAccount, setAdminAccount] = useState<AdminZaloAccount | null>(null);
    const [showQR, setShowQR] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    // Load admin account
    const loadAdminAccount = async () => {
        try {
            setLoading(true);
            const headers = await getNocoDBHeaders();
            const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_ACCOUNTS_ADMIN)}?limit=1`;

            const res = await fetch(url, { headers });
            const data = await res.json();

            if (data.list && data.list.length > 0) {
                setAdminAccount(data.list[0]);
            } else {
                setAdminAccount(null);
            }
        } catch (error) {
            console.error('Error loading admin account:', error);
            toast.error('Không thể tải thông tin tài khoản Admin');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAdminAccount();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    // Get QR Code for login
    const handleGetQrCode = async () => {
        try {
            setQrLoading(true);
            setShowQR(true);
            setQrCode(null);

            // Use zaloAuthService like ZaloLoginButton does
            const { data: { user } } = await supabase.auth.getUser();
            const result = await zaloAuthService.getQrCode(undefined, user?.id);

            console.log('[ZaloAdmin] QR result:', result);

            if (result.success && result.qrCodeImage) {
                setQrCode(result.qrCodeImage);
                // Connect WebSocket to listen for login success
                connectWebSocket();
            } else {
                toast.error(result.error || 'Không thể lấy mã QR');
                setShowQR(false);
            }
        } catch (error) {
            console.error('Error getting QR code:', error);
            toast.error('Lỗi khi lấy mã QR');
            setShowQR(false);
        } finally {
            setQrLoading(false);
        }
    };

    // Connect WebSocket for login events
    const connectWebSocket = () => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        const ws = new WebSocket('wss://zaloapi.hpb.edu.vn');
        wsRef.current = ws;

        ws.onmessage = async (event) => {
            try {
                const rawData = event.data;
                console.log('[Zalo WS Admin] Raw message:', rawData);

                // Handle plain text "login_success" message
                if (typeof rawData === 'string' && rawData.includes('login_success')) {
                    console.log('[Zalo WS Admin] Login success detected (plain text)');
                    toast.success('Đăng nhập Zalo thành công!');
                    setShowQR(false);
                    setQrCode(null);

                    // Wait for VPS to finish saving account with displayName
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Fetch accounts to get the new account info
                    const accountsRes = await zaloApiClient.getAccounts();
                    console.log('[Zalo WS Admin] Accounts after login:', accountsRes);

                    if (accountsRes.success && Array.isArray(accountsRes.data) && accountsRes.data.length > 0) {
                        // Get the most recently logged in account
                        const newAccount = accountsRes.data[0];
                        await saveAdminAccount({ ownId: newAccount.ownId });
                    }
                    ws.close();
                    return;
                }

                // Try to parse as JSON
                const data = JSON.parse(rawData);
                console.log('[Zalo WS Admin] Parsed message:', data);

                // Check both success types like ZaloLoginButton
                if (data.success || data.type === 'login_success') {
                    const ownId = data.ownId || data.data?.ownId;
                    if (ownId) {
                        toast.success('Đăng nhập Zalo thành công!');
                        setShowQR(false);
                        setQrCode(null);

                        // Save to admin table
                        await saveAdminAccount({ ...data, ownId });
                        ws.close();
                    }
                }
            } catch (e) {
                console.error('WS parse error:', e);
            }
        };

        ws.onerror = (error) => {
            console.error('[Zalo WS] Error:', error);
        };

        ws.onclose = () => {
            console.log('[Zalo WS] Disconnected');
        };
    };

    // Save admin account to NocoDB
    const saveAdminAccount = async (accountData: any) => {
        try {
            const headers = await getNocoDBHeaders();

            // Get account details using accountDetails API (returns profile.displayName)
            console.log('[Zalo Admin] Fetching account details for:', accountData.ownId);
            const detailsRes = await zaloApiClient.getAccountDetails(accountData.ownId);
            console.log('[Zalo Admin] Account details response:', detailsRes);

            let accountInfo: any = {};
            let profileData: any = {};

            if (detailsRes.success && detailsRes.data) {
                accountInfo = detailsRes.data;
                profileData = accountInfo.profile || {};
            }

            console.log('[Zalo Admin] Account info:', accountInfo);
            console.log('[Zalo Admin] Profile data:', profileData);

            // Get displayName from profile (this is the correct Zalo name)
            const displayName = profileData.displayName
                || profileData.name
                || accountInfo.displayName
                || accountInfo.zaloName
                || accountData.ownId;

            console.log('[Zalo Admin] Using displayName:', displayName);

            const payload = {
                own_id: accountData.ownId,
                display_name: displayName,
                phone_number: accountInfo.phoneNumber || '',
                avatar_url: profileData.avatar || accountInfo.avatar || '',
                is_active: true,
            };
            console.log('[Zalo Admin] Payload to save:', payload);

            // Check if exists
            const checkUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_ACCOUNTS_ADMIN)}?where=${encodeURIComponent(`(own_id,eq,${payload.own_id})`)}`;
            const checkRes = await fetch(checkUrl, { headers });
            const checkData = await checkRes.json();

            if (checkData.list && checkData.list.length > 0) {
                // Update
                const recordId = checkData.list[0].Id;
                await fetch(`${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_ACCOUNTS_ADMIN)}/${recordId}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify(payload),
                });
            } else {
                // Create
                await fetch(getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_ACCOUNTS_ADMIN), {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                });
            }

            loadAdminAccount();
        } catch (error) {
            console.error('Error saving admin account:', error);
            toast.error('Không thể lưu tài khoản Admin');
        }
    };

    // Delete admin account
    const handleDeleteAccount = async () => {
        if (!adminAccount) return;

        if (!confirm(`Xóa tài khoản Admin "${adminAccount.display_name}"?`)) {
            return;
        }

        try {
            const { error } = await supabase.functions.invoke('nocodb-proxy', {
                body: {
                    path: `/api/v2/tables/${NOCODB_CONFIG.TABLES.ZALO_ACCOUNTS_ADMIN}/records`,
                    method: 'DELETE',
                    data: [{ Id: adminAccount.Id }],
                },
            });

            if (error) {
                throw error;
            }

            toast.success('Đã xóa tài khoản Admin');
            setAdminAccount(null);
        } catch (error) {
            console.error('Error deleting account:', error);
            toast.error('Không thể xóa tài khoản');
        }
    };

    // Copy phone number
    const handleCopyPhone = async () => {
        if (!adminAccount?.phone_number) return;

        try {
            await navigator.clipboard.writeText(adminAccount.phone_number);
            setCopied(true);
            toast.success('Đã copy SĐT!');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error('Không thể copy');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-blue-500" />
                    Zalo Admin Settings
                </h1>
                <p className="text-muted-foreground">
                    Quản lý tài khoản Zalo dùng để gửi thông báo cho users
                </p>
            </div>

            {/* Current Admin Account */}
            {adminAccount ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Tài khoản Admin hiện tại</span>
                            <Badge variant="default" className="bg-green-500">Đang hoạt động</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border">
                                <AvatarImage src={adminAccount.avatar_url} />
                                <AvatarFallback>{(adminAccount.display_name || '?').charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-semibold text-lg">{adminAccount.display_name}</p>
                                <p className="text-sm text-muted-foreground">ID: {adminAccount.own_id}</p>
                            </div>
                        </div>

                        {/* Phone number display */}
                        <div className="space-y-2">
                            <Label>Số điện thoại (Users sẽ thêm SĐT này vào nhóm)</Label>
                            <div className="flex gap-2">
                                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-muted rounded-lg font-mono text-lg">
                                    <Phone className="w-4 h-4 text-blue-500" />
                                    {adminAccount.phone_number || 'Chưa có SĐT'}
                                </div>
                                <Button variant="outline" onClick={handleCopyPhone} disabled={!adminAccount.phone_number}>
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={handleGetQrCode}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Đăng nhập lại
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteAccount}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Xóa tài khoản
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Chưa có tài khoản Admin</CardTitle>
                        <CardDescription>
                            Đăng nhập Zalo để sử dụng làm tài khoản gửi thông báo cho users
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleGetQrCode} disabled={qrLoading}>
                            {qrLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <QrCode className="w-4 h-4 mr-2" />
                            )}
                            Đăng nhập Zalo Admin
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* QR Code Dialog */}
            {showQR && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="text-blue-700">Quét mã QR để đăng nhập Zalo</CardTitle>
                        <CardDescription>
                            Mở Zalo trên điện thoại → Quét QR → Xác nhận đăng nhập
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        {qrLoading ? (
                            <div className="w-64 h-64 flex items-center justify-center bg-white rounded-lg">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        ) : qrCode ? (
                            <img src={qrCode} alt="Zalo QR Code" className="w-64 h-64 rounded-lg border" />
                        ) : (
                            <div className="w-64 h-64 flex items-center justify-center bg-white rounded-lg text-muted-foreground">
                                Không thể tải QR
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowQR(false)}>Hủy</Button>
                            <Button variant="outline" onClick={handleGetQrCode}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Làm mới QR
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle>Hướng dẫn sử dụng</CardTitle>
                </CardHeader>
                <CardContent>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li>Đăng nhập tài khoản Zalo Admin ở trên</li>
                        <li>Users vào <strong>Cài đặt thông báo</strong> → Thấy SĐT Admin</li>
                        <li>Users thêm SĐT Admin vào nhóm Zalo của họ hoặc dán link nhóm</li>
                        <li>Admin Zalo sẽ tự động join và gửi test message</li>
                        <li>Báo cáo định kỳ sẽ gửi qua Zalo Admin vào nhóm của user</li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    );
};

export default ZaloAdminSettings;
