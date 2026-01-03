/**
 * ReportErrorCard - Display errors when report loading fails
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';

export interface ReportError {
    type: 'no_data' | 'sync_needed' | 'api_error' | 'unknown';
    message: string;
    suggestion?: string;
}

interface ReportErrorCardProps {
    error: ReportError;
    onRetry?: () => void;
    onSync?: () => void;
}

export const ReportErrorCard: React.FC<ReportErrorCardProps> = ({
    error,
    onRetry,
    onSync,
}) => {
    const getErrorIcon = () => {
        switch (error.type) {
            case 'no_data':
            case 'sync_needed':
                return <HelpCircle className="h-10 w-10 text-amber-500" />;
            case 'api_error':
            case 'unknown':
            default:
                return <AlertCircle className="h-10 w-10 text-red-500" />;
        }
    };

    const getErrorColor = () => {
        switch (error.type) {
            case 'no_data':
            case 'sync_needed':
                return 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200';
            default:
                return 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200';
        }
    };

    return (
        <Card className={`w-full max-w-lg overflow-hidden bg-gradient-to-br ${getErrorColor()} dark:border-slate-700 shadow-lg`}>
            <CardContent className="flex flex-col items-center justify-center py-8 px-6 text-center space-y-4">
                {/* Icon */}
                <div className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-sm">
                    {getErrorIcon()}
                </div>

                {/* Message */}
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">
                        {error.type === 'no_data' || error.type === 'sync_needed'
                            ? '📭 Chưa có dữ liệu'
                            : '❌ Có lỗi xảy ra'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {error.message}
                    </p>
                    {error.suggestion && (
                        <p className="text-xs text-muted-foreground italic">
                            💡 {error.suggestion}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    {error.type === 'sync_needed' && onSync && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={onSync}
                            className="bg-amber-500 hover:bg-amber-600"
                        >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Đồng bộ ngay
                        </Button>
                    )}
                    {onRetry && error.type !== 'sync_needed' && (
                        <Button variant="outline" size="sm" onClick={onRetry}>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Thử lại
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default ReportErrorCard;
