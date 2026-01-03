import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Loader2, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { CustomAudience } from '@/hooks/useCustomAudienceFlow';

interface CustomAudienceSelectorProps {
    audiences: CustomAudience[];
    selectedIds: string[];
    onConfirm: (selectedIds: string[]) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const CustomAudienceSelector: React.FC<CustomAudienceSelectorProps> = ({
    audiences,
    selectedIds: initialSelectedIds,
    onConfirm,
    onCancel,
    isLoading = false,
}) => {
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
    const [searchQuery, setSearchQuery] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    const filteredAudiences = audiences.filter(aud =>
        aud.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleAudience = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    const selectAll = () => {
        setSelectedIds(filteredAudiences.map(a => a.id));
    };

    const clearAll = () => {
        setSelectedIds([]);
    };

    const formatCount = (count?: number) => {
        if (!count) return 'N/A';
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
        return count.toString();
    };

    const getSubtypeLabel = (subtype?: string) => {
        const labels: Record<string, string> = {
            'LOOKALIKE': '🎯 Lookalike',
            'WEBSITE': '🌐 Website',
            'CUSTOM': '📋 Custom',
            'ENGAGEMENT': '💬 Engagement',
            'VIDEO': '🎬 Video',
            'IG_BUSINESS': '📸 Instagram',
            'FB_EVENT': '🎉 Event',
            'OFFLINE_CONVERSION': '🛒 Offline',
            'DATA_SET': '📊 Data Set',
        };
        return labels[subtype || ''] || subtype || 'Custom';
    };

    // Get selected audience names for display
    const getSelectedNames = () => {
        const selected = audiences.filter(a => selectedIds.includes(a.id));
        if (selected.length === 0) return 'Chọn tệp đối tượng...';
        if (selected.length === 1) return selected[0].name;
        if (selected.length === 2) return selected.map(a => a.name).join(', ');
        return `${selected.slice(0, 2).map(a => a.name).join(', ')} +${selected.length - 2}`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="ml-2 text-sm">Đang tải...</span>
            </div>
        );
    }

    if (audiences.length === 0) {
        return (
            <div className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                    Không tìm thấy tệp đối tượng nào.
                </p>
                <Button variant="outline" size="sm" onClick={onCancel}>
                    Hủy
                </Button>
            </div>
        );
    }

    return (
        <div className="bg-card border rounded-lg shadow-sm overflow-hidden w-full max-w-[256px]">
            {/* Compact Header - Click to expand */}
            <div
                className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Users className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                            {getSelectedNames()}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            {selectedIds.length}/{audiences.length}
                        </span>
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                    </div>
                </div>
            </div>

            {/* Expandable Content */}
            {isExpanded && (
                <>
                    {/* Search & Actions */}
                    <div className="px-3 pb-2 border-t">
                        <div className="flex items-center gap-2 mt-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm kiếm..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 h-8 text-sm"
                                />
                            </div>
                            <Button variant="ghost" size="sm" onClick={selectAll} className="h-8 px-2 text-xs">
                                Tất cả
                            </Button>
                            <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 px-2 text-xs">
                                Xóa
                            </Button>
                        </div>
                    </div>

                    {/* Audience List */}
                    <ScrollArea className="h-48 border-t">
                        <div className="p-2 space-y-0.5">
                            {filteredAudiences.map((audience) => (
                                <label
                                    key={audience.id}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors text-sm
                                        ${selectedIds.includes(audience.id)
                                            ? 'bg-primary/10 text-primary'
                                            : 'hover:bg-muted'
                                        }`}
                                >
                                    <Checkbox
                                        checked={selectedIds.includes(audience.id)}
                                        onCheckedChange={() => toggleAudience(audience.id)}
                                        className="h-3.5 w-3.5"
                                    />
                                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                                        <span className="truncate">{audience.name}</span>
                                        <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded flex-shrink-0">
                                            ~{formatCount(audience.approximate_count)}
                                        </span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="p-2 border-t flex gap-2">
                        <Button variant="outline" size="sm" onClick={onCancel} className="flex-1 h-8">
                            Hủy
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => onConfirm(selectedIds)}
                            disabled={selectedIds.length === 0}
                            className="flex-1 h-8"
                        >
                            Xác nhận ({selectedIds.length})
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
};

export default CustomAudienceSelector;
