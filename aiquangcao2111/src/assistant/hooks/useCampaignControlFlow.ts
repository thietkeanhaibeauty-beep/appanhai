import { useState } from 'react';
import { parseCampaignIntent, CampaignMatch } from '../services/campaignControl.service';

export type ControlStage = 'idle' | 'analyzing' | 'confirming' | 'done';

export interface ControlFlowState {
    stage: ControlStage;
    intent: 'LIST' | 'TOGGLE' | null;
    foundCampaigns: CampaignMatch[];
    targetAction: 'PAUSE' | 'ACTIVATE' | null;
    lastMessage: string;
}

export function useCampaignControlFlow(
    campaignCatalog: any[], // Pass catalog from parent context
    onToggle: (id: string, status: boolean) => Promise<void> // Pass toggle handler
) {
    const [state, setState] = useState<ControlFlowState>({
        stage: 'idle',
        intent: null,
        foundCampaigns: [],
        targetAction: null,
        lastMessage: '',
    });

    const start = async (input: string, catalogOverride?: any[]): Promise<{ handled: boolean; intent?: string; matches?: CampaignMatch[]; message?: string; action?: 'PAUSE' | 'ACTIVATE'; scope?: string }> => {
        const catalogToUse = catalogOverride || campaignCatalog;
        setState(prev => ({ ...prev, stage: 'analyzing' }));

        const intent = parseCampaignIntent(input);

        if (intent.type === 'UNKNOWN') {
            setState(prev => ({
                ...prev,
                stage: 'idle',
                lastMessage: 'Xin lỗi, tôi chưa hiểu lệnh này. Bạn có thể nói "Tắt chiến dịch X", "Bật nhóm Y" hoặc "Xem các bài viết đang chạy".'
            }));
            return { handled: false };
        }

        // Determine Entity Name for messages
        const getEntityName = (scope: string) => {
            if (scope === 'ADSET') return 'nhóm quảng cáo';
            if (scope === 'AD') return 'quảng cáo';
            return 'chiến dịch';
        };

        const entityName = 'scope' in intent ? getEntityName(intent.scope) : 'chiến dịch';

        if (intent.type === 'LIST') {
            // Filter campaigns
            let matches = catalogToUse.map(c => ({
                id: String(c.id),
                name: c.name,
                status: c.status,
                effective_status: c.effective_status,
                spend: c.spend,
                results: c.results,
                cost_per_result: c.cost_per_result,
                scope: c.scope || ('scope' in intent ? intent.scope : 'CAMPAIGN')
            }));

            if (intent.status === 'ACTIVE') {
                matches = matches.filter(c => c.effective_status === 'ACTIVE');
            } else if (intent.status === 'PAUSED') {
                matches = matches.filter(c => c.effective_status === 'PAUSED' || c.effective_status === 'CAMPAIGN_PAUSED' || c.effective_status === 'ADSET_PAUSED' || c.effective_status === 'AD_PAUSED');
            }

            // Sort: ACTIVE first, then others
            matches.sort((a, b) => {
                const aActive = a.effective_status === 'ACTIVE';
                const bActive = b.effective_status === 'ACTIVE';
                if (aActive && !bActive) return -1;
                if (!aActive && bActive) return 1;
                return 0;
            });

            const message = `Tìm thấy ${matches.length} ${entityName} ${intent.status === 'ACTIVE' ? 'đang chạy' : intent.status === 'PAUSED' ? 'đang tắt' : ''}.`;

            setState({
                stage: 'done',
                intent: 'LIST',
                foundCampaigns: matches,
                targetAction: null,
                lastMessage: message,
            });

            // Return data directly so caller can use it immediately
            return { handled: true, intent: 'LIST', matches, message, scope: 'scope' in intent ? intent.scope : 'CAMPAIGN' };
        }

        if (intent.type === 'TOGGLE') {
            const targetName = intent.targetName.toLowerCase();
            let matches = catalogToUse.filter(c =>
                c.name.toLowerCase().includes(targetName)
            ).map(c => ({
                id: String(c.id),
                name: c.name,
                status: c.status,
                effective_status: c.effective_status,
                scope: c.scope || ('scope' in intent ? intent.scope : 'CAMPAIGN')
            }));

            // Sort: ACTIVE first, then others
            matches.sort((a: any, b: any) => {
                const aActive = a.effective_status === 'ACTIVE';
                const bActive = b.effective_status === 'ACTIVE';
                if (aActive && !bActive) return -1;
                if (!aActive && bActive) return 1;
                return 0;
            });

            if (matches.length === 0) {
                setState({
                    stage: 'done',
                    intent: null,
                    foundCampaigns: [],
                    targetAction: null,
                    lastMessage: `Không tìm thấy ${entityName} nào có tên chứa "${intent.targetName}".`,
                });
            } else {
                setState({
                    stage: 'confirming',
                    intent: 'TOGGLE',
                    foundCampaigns: matches,
                    targetAction: intent.action,
                    lastMessage: `Tìm thấy ${matches.length} ${entityName} phù hợp.`,
                });
            }
            return { handled: true, intent: 'TOGGLE', matches, message: `Tìm thấy ${matches.length} ${entityName} phù hợp.`, action: intent.action, scope: 'scope' in intent ? intent.scope : 'CAMPAIGN' };
        }

        return { handled: false };
    };

    const handleToggleAction = async (campaignId: string, action: 'PAUSE' | 'ACTIVATE') => {
        const isPause = action === 'PAUSE';

        // Optimistically update UI state first to prevent lag perception
        setState(prev => ({
            ...prev,
            foundCampaigns: prev.foundCampaigns.map(c =>
                c.id === campaignId
                    ? { ...c, effective_status: isPause ? 'PAUSED' : 'ACTIVE' }
                    : c
            )
        }));

        await onToggle(campaignId, !isPause);

        // Dispatch event to notify other components (e.g. AdsReportAuto)
        const event = new CustomEvent('campaign-status-updated', {
            detail: {
                id: campaignId,
                status: isPause ? 'PAUSED' : 'ACTIVE'
            }
        });
        window.dispatchEvent(event);

        // ✅ FIX: Persist to localStorage so AdsReportAuto picks it up when mounting
        // ✅ Strict Backend Mode: Do NOT update localStorage. 
        // We rely on fresh API data or event dispatch.
        // const savedStatuses = localStorage.getItem('ads_report_row_statuses');
        // ...
    };

    const reset = () => {
        setState({
            stage: 'idle',
            intent: null,
            foundCampaigns: [],
            targetAction: null,
            lastMessage: '',
        });
    };

    return {
        state,
        start,
        reset,
        handleToggleAction
    };
}
