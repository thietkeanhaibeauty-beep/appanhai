import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ItemSelectorCardProps {
    items: any[];
    type: 'campaign' | 'adset' | 'ad';
    onConfirm: (selectedIds: string[]) => void;
    onCancel: () => void;
}

export const ItemSelectorCard: React.FC<ItemSelectorCardProps> = ({ items, type, onConfirm, onCancel }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggle = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredItems.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredItems.map(i => i.id));
        }
    };

    return (
        <Card className="w-full max-w-md p-3 space-y-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 animate-in fade-in-50 slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-sm font-medium">
                    Chọn {type === 'campaign' ? 'chiến dịch' : type === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo'}
                </span>
                <Badge variant="secondary">
                    Đã chọn {selectedIds.length}
                </Badge>
            </div>

            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9 text-xs"
                />
            </div>

            <div className="flex items-center space-x-2 px-1">
                <Checkbox
                    id="select-all"
                    checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                    onCheckedChange={handleSelectAll}
                />
                <label
                    htmlFor="select-all"
                    className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                    Chọn tất cả
                </label>
            </div>

            <div className="max-h-[250px] overflow-y-auto space-y-1 pr-1">
                {filteredItems.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center space-x-3 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => handleToggle(item.id)}
                    >
                        <Checkbox
                            checked={selectedIds.includes(item.id)}
                            onCheckedChange={() => handleToggle(item.id)}
                        />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate" title={item.name}>
                                {item.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[10px] px-1 h-4">
                                    {item.effective_status || item.status}
                                </Badge>
                                {item.id && <span className="text-[10px] text-muted-foreground font-mono">{item.id}</span>}
                            </div>
                        </div>
                    </div>
                ))}
                {filteredItems.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                        Không tìm thấy kết quả
                    </div>
                )}
            </div>

            <div className="flex gap-2 pt-2 border-t">
                <Button
                    className="flex-1"
                    size="sm"
                    onClick={() => onConfirm(selectedIds)}
                    disabled={selectedIds.length === 0}
                >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Áp dụng ({selectedIds.length})
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                >
                    Hủy
                </Button>
            </div>
        </Card>
    );
};
