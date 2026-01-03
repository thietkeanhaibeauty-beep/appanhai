/**
 * Admin Zalo Section - Secure flow using link
 * 1. User enters group link
 * 2. Fetch group name from link (scrape public page)
 * 3. Show group name for confirmation (NOT all Admin's groups)
 * 4. Internally search Admin's groups to find matching group
 * 5. Send verification code
 */

import { useState, useEffect } from 'react';
import { MessageSquare, Info, Phone, Loader2, Copy, Check, Send, Link2, AlertCircle, Search, Users, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminZalo } from '../hooks/useAdminZalo';
import { toast } from 'sonner';
import { saveUserAdminGroup } from '../services/groupVerification';
import { zaloAuthService } from '@/services/zaloAuthService';
import { zaloApiClient } from '@/services/zaloApiClient';

interface AdminZaloSectionProps {
    userPhone?: string;
}

interface FoundGroup {
    groupId: string;
    name: string;
    shortCode: string;
}

export const AdminZaloSection = ({ userPhone = '' }: AdminZaloSectionProps) => {
    const { user } = useAuth();
    const { adminAccount, adminPhone, adminOwnId, loading: adminLoading } = useAdminZalo();

    // Form states
    const [phoneNumber, setPhoneNumber] = useState(userPhone || user?.phone || '');
    const [groupLink, setGroupLink] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState(''); // Selected group ID from dropdown
    const [verificationCode, setVerificationCode] = useState('');

    // Groups list for dropdown
    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);

    // Flow states
    const [step, setStep] = useState<'input' | 'confirm' | 'verify' | 'success'>('input');
    const [searching, setSearching] = useState(false);
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [copied, setCopied] = useState(false);
    const [sentCode, setSentCode] = useState<string | null>(null);
    const [foundGroup, setFoundGroup] = useState<FoundGroup | null>(null);

    // Load groups on mount
    useEffect(() => {
        const loadGroups = async () => {
            if (!adminOwnId) return;
            setLoadingGroups(true);
            try {
                const result = await zaloAuthService.getGroups(adminOwnId);
                if (result.success && Array.isArray(result.data)) {
                    setAvailableGroups(result.data);
                    console.log('[AdminZalo] Loaded', result.data.length, 'groups');
                }
            } catch (error) {
                console.error('[AdminZalo] Error loading groups:', error);
            } finally {
                setLoadingGroups(false);
            }
        };
        loadGroups();
    }, [adminOwnId]);

    // Extract short code from link (e.g., yhpjnj031 from https://zalo.me/g/yhpjnj031)
    const extractShortCode = (link: string): string | null => {
        const match = link.match(/zalo\.me\/g\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    };

    // Copy phone number
    const handleCopyPhone = async () => {
        if (!adminPhone) return;
        try {
            await navigator.clipboard.writeText(adminPhone);
            setCopied(true);
            toast.success('Đã copy SĐT!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Không thể copy');
        }
    };

    // Validate
    const validateInputs = () => {
        if (!phoneNumber.trim()) {
            toast.error('Vui lòng nhập SĐT của bạn');
            return false;
        }
        if (!selectedGroupId) {
            toast.error('Vui lòng chọn nhóm Zalo');
            return false;
        }
        return true;
    };

    // Step 1: Select group from dropdown
    const handleFindGroup = async () => {
        if (!validateInputs()) return;
        if (!adminOwnId) {
            toast.error('Chưa cấu hình Admin Zalo');
            return;
        }

        // Find the selected group from availableGroups
        const selectedGroup = availableGroups.find((g: any) => String(g.groupId) === selectedGroupId);

        if (selectedGroup) {
            console.log('[AdminZalo] Selected group:', selectedGroup);
            setFoundGroup({
                groupId: String(selectedGroup.groupId),
                name: selectedGroup.name || 'Nhóm Zalo',
                shortCode: groupLink || ''
            });
            setStep('confirm');
            toast.success(`Đã chọn nhóm: ${selectedGroup.name}`);
        } else {
            toast.error('Không tìm thấy nhóm đã chọn. Vui lòng thử lại.');
        }
    };

    // Step 2: Send verification code
    const handleSendCode = async () => {
        if (!foundGroup) {
            toast.error('Chưa tìm thấy nhóm');
            return;
        }

        setSending(true);
        try {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const message = `🔐 Mã xác nhận AIadsfb: ${code}\n📱 SĐT đăng ký: ${phoneNumber}\n\nNhập mã này vào ứng dụng để hoàn tất kết nối.`;

            console.log('[AdminZalo] Sending verification to group:', foundGroup.groupId);
            toast.info('Đang gửi mã xác nhận...');

            const sendResult = await zaloApiClient.sendMessageByAccount(
                message,
                foundGroup.groupId,
                'group',
                adminPhone || adminOwnId || ''
            );
            console.log('[AdminZalo] Send result:', sendResult);

            if (!sendResult || (!sendResult.success && !sendResult.msgId)) {
                toast.error('Không thể gửi tin nhắn: ' + (sendResult?.error || 'Lỗi không xác định'));
                return;
            }

            setSentCode(code);
            setStep('verify');
            toast.success(`Đã gửi mã xác nhận vào nhóm "${foundGroup.name}"!`);

        } catch (error: any) {
            console.error('[AdminZalo] Error:', error);
            toast.error(error.message || 'Lỗi xử lý');
        } finally {
            setSending(false);
        }
    };

    // Step 3: Verify code
    const handleVerifyCode = async () => {
        if (!verificationCode.trim()) {
            toast.error('Vui lòng nhập mã xác nhận');
            return;
        }

        if (verificationCode !== sentCode) {
            toast.error('Mã xác nhận không đúng');
            return;
        }

        setVerifying(true);
        try {
            await saveUserAdminGroup({
                user_id: user?.id || '',
                group_id: foundGroup?.groupId || '',
                group_name: foundGroup?.name || 'Nhóm Zalo',
                verified: true,
                admin_own_id: adminOwnId,
            });

            setStep('success');
            toast.success('Xác nhận thành công!');
        } catch (error: any) {
            console.error('Error verifying:', error);
            toast.error('Lỗi xác nhận');
        } finally {
            setVerifying(false);
        }
    };

    // Don't show if no admin account
    if (!adminLoading && !adminAccount) {
        return null;
    }

    // Success state
    if (step === 'success') {
        return (
            <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-3 text-green-700">
                        <div className="p-2 bg-green-100 rounded-full">
                            <Check className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-medium">Đã kết nối thành công!</p>
                            <p className="text-sm text-green-600">
                                Thông báo sẽ được gửi qua nhóm "{foundGroup?.name}".
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    Nhận thông báo qua Zalo (Không cần đăng nhập)
                </CardTitle>
                <CardDescription>
                    Thêm Admin vào nhóm Zalo để nhận báo cáo tự động
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

                {step === 'input' && (
                    <>
                        {/* Instructions */}
                        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
                            <Info className="w-4 h-4 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-medium">Hướng dẫn:</p>
                                <ol className="list-decimal list-inside mt-1 space-y-1">
                                    <li>Copy SĐT Admin → Thêm vào nhóm Zalo của bạn</li>
                                    <li>Lấy link nhóm: Mở nhóm → Cài đặt → Chia sẻ link</li>
                                    <li>Dán link nhóm và nhấn "Tìm nhóm"</li>
                                </ol>
                            </div>
                        </div>

                        {/* Admin phone */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Bước 1: Thêm SĐT Admin vào nhóm</Label>
                            {adminLoading ? (
                                <div className="h-10 bg-muted rounded-lg animate-pulse" />
                            ) : (
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
                            )}
                        </div>

                        {/* Group select dropdown */}
                        <div className="space-y-2">
                            <Label htmlFor="group-select">Bước 2: Chọn nhóm Zalo</Label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                                {loadingGroups ? (
                                    <div className="flex items-center justify-center h-10 bg-muted rounded-lg">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="ml-2 text-sm">Đang tải nhóm...</span>
                                    </div>
                                ) : (
                                    <select
                                        id="group-select"
                                        value={selectedGroupId}
                                        onChange={(e) => setSelectedGroupId(e.target.value)}
                                        className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="">-- Chọn nhóm ({availableGroups.length} nhóm) --</option>
                                        {availableGroups.map((group: any) => (
                                            <option key={group.groupId} value={String(group.groupId)}>
                                                {group.name} ({group.totalMember || '?'} thành viên)
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">Chọn nhóm mà bạn muốn nhận thông báo</p>
                        </div>

                        {/* Group link input - optional */}
                        <div className="space-y-2">
                            <Label htmlFor="group-link">Link nhóm (tùy chọn - để lưu trữ)</Label>
                            <div className="relative">
                                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="group-link"
                                    placeholder="https://zalo.me/g/yhpjnj031"
                                    value={groupLink}
                                    onChange={(e) => setGroupLink(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Phone input */}
                        <div className="space-y-2">
                            <Label htmlFor="phone-number">Bước 3: SĐT của bạn (để xác minh)</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="phone-number"
                                    placeholder="0912345678"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Find button */}
                        <Button onClick={handleFindGroup} disabled={searching} className="w-full">
                            {searching ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang tìm nhóm...
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4 mr-2" />
                                    Tìm nhóm
                                </>
                            )}
                        </Button>

                        {/* Warning */}
                        <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>Đảm bảo đã thêm SĐT Admin vào nhóm trước khi tìm!</span>
                        </div>
                    </>
                )}

                {step === 'confirm' && foundGroup && (
                    <>
                        {/* Found group confirmation */}
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-medium text-green-800">Đã tìm thấy nhóm:</p>
                                    <p className="text-lg font-bold text-green-700 mt-1">{foundGroup.name}</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-sm text-muted-foreground text-center">
                            SĐT đăng ký: <strong>{phoneNumber}</strong>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep('input')} className="flex-1">
                                Quay lại
                            </Button>
                            <Button onClick={handleSendCode} disabled={sending} className="flex-1">
                                {sending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4 mr-2" />
                                )}
                                Gửi mã xác nhận
                            </Button>
                        </div>
                    </>
                )}

                {step === 'verify' && (
                    <>
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-medium text-green-800">Đã gửi mã vào: {foundGroup?.name}</p>
                                    <p className="text-sm text-green-700 mt-1">
                                        Kiểm tra Zalo để lấy mã 6 số.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="verification-code">Mã xác nhận (6 số):</Label>
                            <Input
                                id="verification-code"
                                placeholder="123456"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="text-center text-2xl tracking-widest font-mono"
                                maxLength={6}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep('confirm')} className="flex-1">
                                Quay lại
                            </Button>
                            <Button
                                onClick={handleVerifyCode}
                                disabled={verifying || verificationCode.length !== 6}
                                className="flex-1"
                            >
                                {verifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                Xác nhận
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};
