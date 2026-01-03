import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { zaloAuthService } from '@/services/zaloAuthService';
import { zaloApiClient } from '@/services/zaloApiClient';
import { Loader2, QrCode, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ZaloLoginButtonProps {
    onSuccess?: (data: any) => void;
}

export function ZaloLoginButton({ onSuccess }: ZaloLoginButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleOpen = async () => {
        setIsOpen(true);
        setIsLoading(true);
        setQrCode(null);
        setWsStatus('connecting');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const result = await zaloAuthService.getQrCode(undefined, user?.id);

            if (result.success && result.qrCodeImage) {
                setQrCode(result.qrCodeImage);
            } else {
                toast({
                    title: "Lỗi",
                    description: result.error || "Không thể lấy mã QR",
                    variant: "destructive"
                });
                setIsOpen(false);
            }
        } catch (error) {

            toast({
                title: "Lỗi kết nối",
                description: "Không thể kết nối đến server Zalo",
                variant: "destructive"
            });
            setIsOpen(false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let ws: WebSocket | null = null;

        if (isOpen && qrCode) {

            setWsStatus('connecting');

            try {
                ws = new WebSocket('wss://zaloapi.hpb.edu.vn');

                ws.onopen = () => {

                    setWsStatus('connected');
                };

                ws.onmessage = async (event) => {
                    try {
                        const rawData = event.data;

                        // Get current user
                        const { data: { user } } = await supabase.auth.getUser();

                        // Handle plain text "login_success" message (like SuperAdmin does)
                        if (typeof rawData === 'string' && rawData.includes('login_success')) {

                            // Wait for VPS to finish processing
                            await new Promise(resolve => setTimeout(resolve, 2000));

                            // Fetch accounts from VPS (not NocoDB) to get the new account info
                            const accountsRes = await zaloApiClient.getAccounts();

                            if (accountsRes.success && Array.isArray(accountsRes.data) && accountsRes.data.length > 0) {
                                const newAccount = accountsRes.data[0];

                                // Get account details to fetch correct displayName from profile
                                const detailsRes = await zaloApiClient.getAccountDetails(newAccount.ownId);

                                let profileData: any = {};
                                if (detailsRes.success && detailsRes.data) {
                                    profileData = detailsRes.data.profile || {};
                                }

                                const displayName = profileData.displayName
                                    || profileData.name
                                    || detailsRes.data?.displayName
                                    || newAccount.displayName
                                    || newAccount.ownId;

                                // Save account to NocoDB
                                if (user?.id) {
                                    await zaloAuthService.saveZaloAccount({
                                        ownId: newAccount.ownId,
                                        displayName: displayName,
                                        phoneNumber: newAccount.phoneNumber,
                                        avatar: profileData.avatar
                                    }, user.id);
                                }

                                toast({
                                    title: "Đăng nhập thành công",
                                    description: `Chào mừng ${newAccount.displayName || newAccount.ownId || 'bạn'}!`,
                                });
                                setIsOpen(false);
                                if (onSuccess) {
                                    onSuccess(newAccount);
                                }
                            } else {
                                toast({
                                    title: "Đăng nhập thành công",
                                    description: "Chào mừng bạn!",
                                });
                                setIsOpen(false);
                                if (onSuccess) {
                                    onSuccess({});
                                }
                            }
                            return;
                        }

                        // Try to parse as JSON
                        const data = JSON.parse(rawData);

                        if (data.success || data.type === 'login_success') {
                            // Save account to NocoDB
                            if (user?.id) {
                                await zaloAuthService.saveZaloAccount(data, user.id);
                            }

                            toast({
                                title: "Đăng nhập thành công",
                                description: `Chào mừng ${data.displayName || data.name || data.ownId || 'bạn'}!`,
                            });
                            setIsOpen(false);
                            if (onSuccess) {
                                onSuccess(data);
                            } else {
                                navigate('/home');
                            }
                        }
                    } catch (e) {
                        // Silent parse error
                    }
                };

                ws.onerror = (error) => {

                    setWsStatus('error');
                };

                ws.onclose = (event) => {

                    setWsStatus('closed');
                };
            } catch (error) {

                setWsStatus('error');
            }
        }

        return () => {
            if (ws) {

                ws.close();
            }
        };
    }, [isOpen, qrCode, navigate, toast, onSuccess]);

    return (
        <>
            <Button
                variant="outline"
                className="flex gap-2 items-center justify-center border-blue-500 text-blue-600 hover:bg-blue-50"
                onClick={handleOpen}
            >
                <QrCode className="w-4 h-4" />
                Đăng nhập Zalo
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center">Đăng nhập Zalo</DialogTitle>
                        <DialogDescription className="text-center">
                            Mở ứng dụng Zalo trên điện thoại và quét mã QR bên dưới
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-6 min-h-[300px]">
                        {isLoading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Đang tạo mã QR...</p>
                            </div>
                        ) : qrCode ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="border-4 border-white shadow-lg rounded-lg overflow-hidden">
                                    <img src={qrCode} alt="Zalo QR Code" className="w-64 h-64 object-contain" />
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    {wsStatus === 'connected' ? (
                                        <>
                                            <Wifi className="w-3 h-3 text-green-500" />
                                            <span className="text-green-600">Đang chờ quét...</span>
                                        </>
                                    ) : wsStatus === 'connecting' ? (
                                        <>
                                            <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
                                            <span className="text-yellow-600">Đang kết nối...</span>
                                        </>
                                    ) : wsStatus === 'error' ? (
                                        <>
                                            <WifiOff className="w-3 h-3 text-red-500" />
                                            <span className="text-red-600">Lỗi kết nối WebSocket</span>
                                        </>
                                    ) : (
                                        <>
                                            <WifiOff className="w-3 h-3 text-gray-500" />
                                            <span className="text-gray-600">Đã ngắt kết nối</span>
                                        </>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">Mã QR sẽ hết hạn sau vài phút</p>
                            </div>
                        ) : (
                            <div className="text-center text-red-500">
                                Không thể tải mã QR. Vui lòng thử lại.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
