/**
 * useAdsLabels - Hook quản lý Labels cho Campaigns/AdSets/Ads
 * 
 * Tách từ AdsReportAuto.tsx để giảm kích thước component chính
 * Bao gồm: loadLabels, handleAssignLabels, handleRemoveLabel, loadLabelAssignments
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    getLabelsByUserId,
    CampaignLabel
} from '@/services/nocodb/campaignLabelsService';
import {
    getLabelAssignmentsByEntities,
    bulkAssignLabels,
    assignLabel,
    removeLabel,
    CampaignLabelAssignment
} from '@/services/nocodb/campaignLabelAssignmentsService';
import { useToast } from '@/hooks/use-toast';

// ========================= TYPES =========================

export interface UseAdsLabelsOptions {
    insights: any[];
}

// ========================= MAIN HOOK =========================

export const useAdsLabels = ({ insights }: UseAdsLabelsOptions) => {
    const { user } = useAuth();
    const { toast } = useToast();

    // Labels state
    const [labels, setLabels] = useState<CampaignLabel[]>([]);
    const [labelAssignments, setLabelAssignments] = useState<CampaignLabelAssignment[]>([]);
    const [labelsManagerOpen, setLabelsManagerOpen] = useState(false);
    const [assignLabelsOpen, setAssignLabelsOpen] = useState(false);

    // ==================== LOAD LABELS ====================

    const loadLabels = useCallback(async () => {
        try {
            if (!user?.id) return;
            const labelsData = await getLabelsByUserId(user.id);
            setLabels(labelsData);
        } catch (error) {
            console.error('Error loading labels:', error);
        }
    }, [user?.id]);

    // ==================== LOAD LABEL ASSIGNMENTS ====================

    const loadLabelAssignments = useCallback(async () => {
        if (insights.length === 0) {
            setLabelAssignments([]);
            return;
        }

        try {
            const campaignIds = [...new Set(insights.map(i => i.campaign_id).filter(Boolean))];
            const adsetIds = [...new Set(insights.map(i => i.adset_id).filter(Boolean))];
            const adIds = [...new Set(insights.map(i => i.ad_id).filter(Boolean))];

            const [campaignAssignments, adsetAssignments, adAssignments] = await Promise.all([
                campaignIds.length > 0 ? getLabelAssignmentsByEntities(campaignIds, 'campaign') : Promise.resolve([]),
                adsetIds.length > 0 ? getLabelAssignmentsByEntities(adsetIds, 'adset') : Promise.resolve([]),
                adIds.length > 0 ? getLabelAssignmentsByEntities(adIds, 'ad') : Promise.resolve([]),
            ]);

            const allAssignments = [...campaignAssignments, ...adsetAssignments, ...adAssignments];
            setLabelAssignments(allAssignments);
        } catch (error) {
            console.error('Error loading label assignments:', error);
        }
    }, [insights]);

    // ==================== MANUAL ASSIGN LABELS ====================

    const handleManualAssignLabels = useCallback(async (
        entityIds: string[],
        entityType: 'campaign' | 'adset' | 'ad',
        labelIds: number[]
    ) => {
        try {
            const entities = entityIds.map(id => ({ id, type: entityType }));
            await bulkAssignLabels(entities, labelIds);

            // Reload assignments
            await loadLabelAssignments();

            toast({
                title: "Thành công",
                description: 'Đã gắn nhãn thành công',
            });
        } catch (error) {
            console.error('Error in manual label assignment:', error);
            throw error;
        }
    }, [loadLabelAssignments, toast]);

    // ==================== BULK ASSIGN LABELS ====================

    const handleAssignLabels = useCallback(async (
        selectedRows: Set<string>,
        filteredInsights: any[],
        viewLevel: 'campaign' | 'adset' | 'ad',
        labelIds: number[],
        getRowKey: (item: any) => string | null
    ) => {
        try {
            const selectedItems = filteredInsights.filter(insight => {
                const key = getRowKey(insight);
                return key && selectedRows.has(key);
            });

            const entities = selectedItems.map(item => {
                let entityType: 'campaign' | 'adset' | 'ad';
                let entityId: string;

                if (viewLevel === 'campaign' || (!item.adset_id && !item.ad_id)) {
                    entityType = 'campaign';
                    entityId = item.campaign_id;
                } else if (viewLevel === 'adset' || (item.adset_id && !item.ad_id)) {
                    entityType = 'adset';
                    entityId = item.adset_id;
                } else {
                    entityType = 'ad';
                    entityId = item.ad_id;
                }

                return { id: entityId, type: entityType };
            }).filter(e => e.id);

            if (entities.length === 0) {
                toast({
                    title: "Lỗi",
                    description: "Không tìm thấy mục để gắn nhãn",
                    variant: "destructive",
                });
                return false;
            }

            const entityTypeName = entities.length === 1
                ? (entities[0].type === 'campaign' ? 'chiến dịch' : entities[0].type === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo')
                : 'mục';

            await bulkAssignLabels(entities, labelIds);

            toast({
                title: "Đã gắn nhãn",
                description: `Đã gắn ${labelIds.length} nhãn cho ${entities.length} ${entityTypeName}`,
            });

            // Wait for NocoDB sync
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Reload assignments
            await loadLabelAssignments();

            return true;
        } catch (error) {
            console.error('Error assigning labels:', error);
            toast({
                title: "Lỗi gắn nhãn",
                description: error instanceof Error ? error.message : "Không thể gắn nhãn",
                variant: "destructive",
            });
            return false;
        }
    }, [loadLabelAssignments, toast]);

    // ==================== QUICK ASSIGN FROM POPOVER ====================

    const handleQuickAssignLabelsFromPopover = useCallback(async (
        entityId: string,
        entityType: 'campaign' | 'adset' | 'ad',
        labelIds: number[]
    ) => {
        try {
            if (!user?.id) {
                toast({
                    title: "Lỗi xác thực",
                    description: "Bạn cần đăng nhập để gắn nhãn",
                    variant: "destructive",
                });
                return;
            }

            // Get current assignments for this entity
            const currentAssignments = await getLabelAssignmentsByEntities([entityId], entityType);
            const currentLabelIds = currentAssignments.map(a => Number(a.label_id));

            // Find labels to ADD
            const labelsToAdd = labelIds.filter(id => !currentLabelIds.includes(id));
            // Find labels to REMOVE
            const labelsToRemove = currentLabelIds.filter(id => !labelIds.includes(id));

            // Add new labels
            if (labelsToAdd.length > 0) {
                await Promise.all(
                    labelsToAdd.map(labelId => assignLabel(entityId, entityType, labelId, user.id))
                );
            }

            // Remove old labels
            if (labelsToRemove.length > 0) {
                await Promise.all(
                    labelsToRemove.map(labelId => removeLabel(entityId, entityType, labelId))
                );
            }

            const entityTypeName = entityType === 'campaign' ? 'chiến dịch' : entityType === 'adset' ? 'nhóm QC' : 'quảng cáo';

            toast({
                title: "Đã gắn nhãn",
                description: `Đã gắn ${labelIds.length} nhãn cho ${entityTypeName}`,
            });

            // Wait for NocoDB sync
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Reload assignments
            await loadLabelAssignments();
        } catch (error) {
            console.error('❌ Error assigning labels:', error);
            toast({
                title: "Lỗi gắn nhãn",
                description: error instanceof Error ? error.message : "Không thể gắn nhãn",
                variant: "destructive",
            });
        }
    }, [user?.id, loadLabelAssignments, toast]);

    // ==================== REMOVE LABEL BADGE ====================

    const handleRemoveLabelBadge = useCallback(async (
        e: React.MouseEvent,
        entityId: string,
        entityType: 'campaign' | 'adset' | 'ad',
        labelId: number | undefined
    ) => {
        e.stopPropagation();

        if (!labelId) {
            console.warn('⚠️ No label ID provided for removal');
            return;
        }

        try {
            await removeLabel(entityId, entityType, labelId);

            const entityTypeName = entityType === 'campaign' ? 'chiến dịch' : entityType === 'adset' ? 'nhóm QC' : 'quảng cáo';

            toast({
                title: "Đã xóa nhãn",
                description: `Đã xóa nhãn khỏi ${entityTypeName}`,
            });

            // Wait for NocoDB sync
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Reload assignments
            await loadLabelAssignments();
        } catch (error) {
            console.error('❌ Error removing label:', error);
            toast({
                title: "Lỗi xóa nhãn",
                description: error instanceof Error ? error.message : "Không thể xóa nhãn",
                variant: "destructive",
            });
        }
    }, [loadLabelAssignments, toast]);

    // ==================== EFFECTS ====================

    // Load labels on mount
    useEffect(() => {
        loadLabels();
    }, [loadLabels]);

    // Load assignments when insights change
    useEffect(() => {
        loadLabelAssignments();
    }, [loadLabelAssignments]);

    // ==================== GET LABELS FOR ENTITY ====================

    const getLabelsForEntity = useCallback((
        entityId: string,
        entityType: 'campaign' | 'adset' | 'ad'
    ): CampaignLabel[] => {
        const entityAssignments = labelAssignments.filter(a => {
            if (entityType === 'campaign') return a.campaign_id === entityId;
            if (entityType === 'adset') return a.adset_id === entityId;
            return a.ad_id === entityId;
        });

        const assignedLabelIds = entityAssignments.map(a => Number(a.label_id));
        return labels.filter(l => assignedLabelIds.includes(Number(l.Id)));
    }, [labelAssignments, labels]);

    return {
        // State
        labels,
        setLabels,
        labelAssignments,
        setLabelAssignments,
        labelsManagerOpen,
        setLabelsManagerOpen,
        assignLabelsOpen,
        setAssignLabelsOpen,

        // Actions
        loadLabels,
        loadLabelAssignments,
        handleManualAssignLabels,
        handleAssignLabels,
        handleQuickAssignLabelsFromPopover,
        handleRemoveLabelBadge,

        // Helpers
        getLabelsForEntity,
    };
};

export default useAdsLabels;
