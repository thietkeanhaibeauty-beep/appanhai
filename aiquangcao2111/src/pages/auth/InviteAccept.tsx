import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';
import { getPendingInviteByEmail, acceptInvite } from '@/services/nocodb/workspaceMembersService';
import { toast } from 'sonner';

export default function InviteAccept() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'not_logged_in' | 'accepting' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const processInvite = async () => {
            // Wait for auth to load
            if (authLoading) return;

            // If not logged in, show login/signup options
            if (!user) {
                setStatus('not_logged_in');
                // Store invite token for after login
                if (inviteToken) {
                    sessionStorage.setItem('pending_invite_token', inviteToken);
                }
                return;
            }

            // User is logged in, try to accept invite
            setStatus('accepting');
            try {
                const pendingInvite = await getPendingInviteByEmail(user.email!);

                if (!pendingInvite) {
                    setErrorMessage('Không tìm thấy lời mời. Có thể lời mời đã hết hạn hoặc đã được chấp nhận.');
                    setStatus('error');
                    return;
                }

                const success = await acceptInvite(pendingInvite.Id!, user.id);
                if (success) {
                    setStatus('success');
                    toast.success('Đã chấp nhận lời mời!');
                    // Redirect to dashboard after 3 seconds
                    setTimeout(() => {
                        navigate('/dashboard');
                    }, 3000);
                } else {
                    setErrorMessage('Không thể chấp nhận lời mời. Vui lòng thử lại.');
                    setStatus('error');
                }
            } catch (error) {
                console.error('Error accepting invite:', error);
                setErrorMessage('Đã xảy ra lỗi. Vui lòng thử lại.');
                setStatus('error');
            }
        };

        processInvite();
    }, [user, authLoading, inviteToken, navigate]);

    const handleLoginRedirect = () => {
        // Save current URL to redirect back after login
        sessionStorage.setItem('invite_redirect', window.location.href);
        navigate('/auth/login');
    };

    const handleSignupRedirect = () => {
        sessionStorage.setItem('invite_redirect', window.location.href);
        navigate('/auth/signup');
    };

    if (status === 'loading' || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">Đang xử lý lời mời...</p>
                </div>
            </div>
        );
    }

    if (status === 'not_logged_in') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UserPlus className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle>Bạn được mời tham gia nhóm</CardTitle>
                        <CardDescription>
                            Để chấp nhận lời mời, vui lòng đăng nhập hoặc đăng ký tài khoản.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button onClick={handleLoginRedirect} className="w-full" size="lg">
                            <LogIn className="mr-2 h-4 w-4" />
                            Đăng nhập
                        </Button>
                        <Button onClick={handleSignupRedirect} variant="outline" className="w-full" size="lg">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Đăng ký tài khoản mới
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (status === 'accepting') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">Đang chấp nhận lời mời...</p>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md border-green-200 bg-green-50">
                    <CardHeader className="text-center">
                        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <CardTitle className="text-green-700">Đã tham gia nhóm!</CardTitle>
                        <CardDescription>
                            Bạn đã chấp nhận lời mời thành công. Đang chuyển đến bảng điều khiển...
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button onClick={() => navigate('/dashboard')} className="w-full">
                            Đến bảng điều khiển
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md border-red-200 bg-red-50">
                <CardHeader className="text-center">
                    <CardTitle className="text-red-700">Không thể chấp nhận lời mời</CardTitle>
                    <CardDescription className="text-red-600">
                        {errorMessage}
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-3">
                    <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
                        Về bảng điều khiển
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
