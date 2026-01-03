import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignMatch, ControlScope } from '../services/campaignControl.service';
import { Layers, Megaphone, Target, Loader2, Plus, X } from "lucide-react";
import { QuickAssignLabelsPopover } from '@/components/QuickAssignLabelsPopover';
import type { CampaignLabel } from '@/services/nocodb/campaignLabelsService';
import type { CampaignLabelAssignment } from '@/services/nocodb/campaignLabelAssignmentsService';


interface CampaignListCardProps {
    campaigns: CampaignMatch[];
    onToggle: (id: string, action: 'PAUSE' | 'ACTIVATE') => void;
    isLoadingAdSets?: boolean;
    isLoadingAds?: boolean;
    onTabChange?: (value: string) => void;
    // Label assignment props
    labels?: CampaignLabel[];
    labelAssignments?: CampaignLabelAssignment[];
    onAssignLabel?: (entityId: string, entityType: 'campaign' | 'adset' | 'ad', labelIds: number[]) => Promise<void>;
    onRemoveLabel?: (entityId: string, entityType: 'campaign' | 'adset' | 'ad', labelId: number) => Promise<void>;
}


export const CampaignListCard: React.FC<CampaignListCardProps> = ({
    campaigns,
    onToggle,
    isLoadingAdSets = false,
    isLoadingAds = false,
    onTabChange,
    labels = [],
    labelAssignments = [],
    onAssignLabel,
    onRemoveLabel
}) => {

    // Group items by scope
    const campaignsList = campaigns.filter(c => c.scope === 'CAMPAIGN' || !c.scope);
    const adSetsList = campaigns.filter(c => c.scope === 'ADSET');
    const adsList = campaigns.filter(c => c.scope === 'AD');

    // Determine default tab: if we have mixed content, maybe stick to what was asked?
    // Or just default to Campaign.
    // If only AdSets are present (e.g. user asked for AdSets specifically), default to AdSets.
    const getDefaultTab = () => {
        if (adSetsList.length > 0 && campaignsList.length === 0) return 'adsets';
        if (adsList.length > 0 && campaignsList.length === 0 && adSetsList.length === 0) return 'ads';
        return 'campaigns';
    };

    const renderList = (items: CampaignMatch[], typeLabel: string, isLoading: boolean = false, entityType: 'campaign' | 'adset' | 'ad' = 'campaign') => {

        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs">Đang tải {typeLabel}...</span>
                </div>
            );
        }

        if (items.length === 0) {
            return <div className="p-4 text-center text-sm text-muted-foreground">Không tìm thấy {typeLabel} nào.</div>;
        }

        // Sort items: ACTIVE first, then others
        const sortedItems = [...items].sort((a, b) => {
            const aActive = a.effective_status === 'ACTIVE' ? 1 : 0;
            const bActive = b.effective_status === 'ACTIVE' ? 1 : 0;
            return bActive - aActive; // 1 (Active) comes before 0
        });

        return (
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 pt-2">
                {sortedItems.map((item) => {
                    const isActive = item.effective_status === 'ACTIVE';

                    // Get labels assigned to this item based on entityType
                    const getEntityIdField = () => {
                        if (entityType === 'campaign') return 'campaign_id';
                        if (entityType === 'adset') return 'adset_id';
                        return 'ad_id';
                    };
                    const entityIdField = getEntityIdField() as keyof typeof labelAssignments[0];

                    const itemLabelAssignments = labelAssignments.filter(
                        a => String(a[entityIdField]) === String(item.id)
                    );
                    const currentLabelIds = itemLabelAssignments.map(a => Number(a.label_id));
                    const assignedLabels = itemLabelAssignments.map(a => {
                        const labelInfo = labels.find(l => String(l.Id) === String(a.label_id));
                        return {
                            ...a,
                            label_name: labelInfo?.label_name || 'Unknown',
                            label_color: labelInfo?.label_color || '#6b7280'
                        };
                    });


                    return (
                        <div
                            key={item.id}
                            className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                        >
                            <div className="flex-1 min-w-0 mr-3">
                                <div className="text-sm font-medium truncate" title={item.name}>
                                    {item.name}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                    <Badge
                                        variant={isActive ? "default" : "secondary"}
                                        className={`text-[8px] px-1 h-4 shrink-0 ${isActive
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                            }`}
                                    >
                                        {isActive ? 'Chạy' : 'Dừng'}
                                    </Badge>

                                    {/* Assigned Label Badges - Compact scrollable container */}
                                    {assignedLabels.length > 0 && (
                                        <div className="flex items-center gap-0.5 overflow-x-auto max-w-[120px] scrollbar-thin scrollbar-thumb-gray-300">
                                            {assignedLabels.slice(0, 3).map(assignment => (
                                                <Badge
                                                    key={`label-${assignment.label_id}`}
                                                    style={{ backgroundColor: assignment.label_color }}
                                                    className="text-white text-[7px] h-3.5 px-1 flex items-center gap-0.5 shrink-0"
                                                    title={assignment.label_name}
                                                >
                                                    <span className="truncate max-w-[40px]">{assignment.label_name}</span>
                                                    {onRemoveLabel && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onRemoveLabel(item.id, entityType, Number(assignment.label_id));
                                                            }}
                                                            className="ml-0.5 hover:bg-black/20 rounded-full"
                                                            title="Gỡ nhãn"
                                                        >
                                                            <X className="w-2 h-2" />
                                                        </button>
                                                    )}
                                                </Badge>
                                            ))}
                                            {assignedLabels.length > 3 && (
                                                <span className="text-[7px] text-muted-foreground shrink-0">+{assignedLabels.length - 3}</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Add Label Button - Smaller */}
                                    {onAssignLabel && labels.length > 0 && (
                                        <QuickAssignLabelsPopover
                                            labels={labels}
                                            entityId={item.id}
                                            entityName={item.name}
                                            entityType={entityType}
                                            currentLabelIds={currentLabelIds}
                                            onAssignLabels={onAssignLabel}
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-3.5 w-3.5 p-0 rounded-full border border-dashed border-gray-400 hover:border-primary hover:bg-primary/5 shrink-0"
                                                    title="Gán nhãn"
                                                >
                                                    <Plus className="h-2 w-2 text-muted-foreground" />
                                                </Button>
                                            }
                                        />
                                    )}
                                </div>

                            </div>

                            {/* Metrics Section */}
                            <div className="flex gap-4 mr-4 text-xs text-muted-foreground border-l pl-4 border-border/50">
                                <div className="flex flex-col items-center min-w-[60px]">
                                    <span className="text-[10px] opacity-70">Chi tiêu</span>
                                    <span className="font-medium text-foreground">
                                        {item.spend ? new Intl.NumberFormat('vi-VN', { notation: "compact", maximumFractionDigits: 1 }).format(item.spend).toLowerCase() : '0'}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center min-w-[60px] border-l border-border/50 pl-4">
                                    <span className="text-[10px] opacity-70">Kết quả</span>
                                    <span className="font-medium text-foreground">
                                        {item.results ? new Intl.NumberFormat('vi-VN', { notation: "compact", maximumFractionDigits: 1 }).format(item.results).toLowerCase() : '0'}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center min-w-[70px] border-l border-border/50 pl-4">
                                    <span className="text-[10px] opacity-70">Chi phí/KQ</span>
                                    <span className="font-medium text-foreground">
                                        {item.cost_per_result ? new Intl.NumberFormat('vi-VN', { notation: "compact", maximumFractionDigits: 1 }).format(item.cost_per_result).toLowerCase() : '0'}
                                    </span>
                                </div>
                            </div>

                            <Switch
                                checked={isActive}
                                onCheckedChange={(checked) => onToggle(item.id, checked ? 'ACTIVATE' : 'PAUSE')}
                                className="data-[state=checked]:bg-green-600"
                            />
                        </div>
                    );
                })}
            </div>

        );
    };

    return (
        <Card className="w-full max-w-2xl p-3 space-y-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Tabs defaultValue={getDefaultTab()} className="w-full" onValueChange={onTabChange}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="campaigns" className="text-xs">
                        <Layers className="w-3.5 h-3.5 mr-1.5" />
                        Chiến dịch ({campaignsList.length})
                    </TabsTrigger>
                    <TabsTrigger value="adsets" className="text-xs">
                        <Target className="w-3.5 h-3.5 mr-1.5" />
                        Nhóm QC ({adSetsList.length})
                    </TabsTrigger>
                    <TabsTrigger value="ads" className="text-xs">
                        <Megaphone className="w-3.5 h-3.5 mr-1.5" />
                        Quảng cáo ({adsList.length})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="campaigns" className="mt-0">
                    {renderList(campaignsList, 'chiến dịch', false, 'campaign')}
                </TabsContent>
                <TabsContent value="adsets" className="mt-0">
                    {renderList(adSetsList, 'nhóm quảng cáo', isLoadingAdSets, 'adset')}
                </TabsContent>
                <TabsContent value="ads" className="mt-0">
                    {renderList(adsList, 'quảng cáo', isLoadingAds, 'ad')}
                </TabsContent>

            </Tabs>
        </Card>
    );
};
