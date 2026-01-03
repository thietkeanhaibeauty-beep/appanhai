/**
 * Campaign Control Flow Handler
 * Extracted from AIChatPanel.tsx to reduce inline complexity
 * 
 * Handles:
 * - LIST intent: Show campaigns with status filter
 * - TOGGLE intent: Turn campaigns on/off
 * - Confirming stage: Process user confirmation
 */

import { parseCampaignIntent, CampaignMatch } from './campaignControl.service';
import { getCampaigns } from '@/services/facebookInsightsService';
import { getInsightsByUserAndDate } from '@/services/nocodb/facebookInsightsAutoService';
import { getLabelAssignmentsByEntities } from '@/services/nocodb/campaignLabelAssignmentsService';

// Types
export interface CampaignControlContext {
    userMessage: string;
    campaignControl: {
        state: {
            stage: string;
            targetAction: 'PAUSE' | 'ACTIVATE' | null;
            foundCampaigns: CampaignMatch[];
        };
        start: (input: string, catalog?: any[]) => Promise<{
            handled: boolean;
            intent?: string;
            matches?: CampaignMatch[];
            message?: string;
            action?: 'PAUSE' | 'ACTIVATE';
            scope?: string;
        }>;
        handleToggleAction: (id: string, action: 'PAUSE' | 'ACTIVATE') => Promise<void>;
        reset: () => void;
    };
    getTokens: () => { adsToken: string; adAccountId: string; pageToken: string; pageId: string };
    userId?: string;
    // Flow state checks
    otherFlowsIdle: boolean;
    // State setters
    setCampaignCatalog: (catalog: any[]) => void;
    campaignCatalog: any[];
}

export interface CampaignControlResult {
    handled: boolean;
    matches?: CampaignMatch[];
    message?: string;
    showCampaignList?: boolean;
    filterContext?: {
        statusFilter: string;
        campaignIds: string[];
    };
    labelAssignments?: any[];
}

/**
 * Check if Campaign Control is in confirming stage and handle user input
 */
export async function handleCampaignControlConfirming(
    ctx: CampaignControlContext,
    addMessage: (role: 'assistant', content: string) => void
): Promise<CampaignControlResult> {
    const { userMessage, campaignControl } = ctx;
    const lowerMsg = userMessage.toLowerCase();

    if (campaignControl.state.stage !== 'confirming') {
        return { handled: false };
    }

    // Handle confirmation text
    if (lowerMsg.includes('ok') || lowerMsg.includes('có') || lowerMsg.includes('yes')) {
        if (campaignControl.state.targetAction && campaignControl.state.foundCampaigns.length === 1) {
            const campaign = campaignControl.state.foundCampaigns[0];
            await campaignControl.handleToggleAction(campaign.id, campaignControl.state.targetAction);
            addMessage('assistant',
                `✅ Đã ${campaignControl.state.targetAction === 'PAUSE' ? 'tắt' : 'bật'} chiến dịch "${campaign.name}" thành công!`
            );
            campaignControl.reset();
        }
        return { handled: true };
    }

    if (lowerMsg.includes('hủy') || lowerMsg.includes('no') || lowerMsg.includes('không')) {
        addMessage('assistant', 'Đã hủy thao tác.');
        campaignControl.reset();
        return { handled: true };
    }

    return { handled: true }; // Still in confirming, don't fall through
}

/**
 * Handle Campaign Control intent detection and execution
 */
export async function handleCampaignControlIntent(
    ctx: CampaignControlContext,
    addMessage: (role: 'assistant', content: string) => void
): Promise<CampaignControlResult> {
    const { userMessage, campaignControl, getTokens, userId, otherFlowsIdle, setCampaignCatalog } = ctx;

    // Only process if other flows are idle
    if (!otherFlowsIdle) {
        return { handled: false };
    }

    // Check intent
    const detectedIntent = parseCampaignIntent(userMessage);
    if (detectedIntent.type === 'UNKNOWN') {
        return { handled: false };
    }

    const { adsToken, adAccountId } = getTokens();
    if (!adsToken || !adAccountId) {
        addMessage('assistant', '⚠️ Lỗi: Không tìm thấy thông tin tài khoản quảng cáo.');
        return { handled: true };
    }

    // Extract status filter
    const statusFilter = 'status' in detectedIntent ? detectedIntent.status : 'ALL';

    try {
        // 1. Fetch fresh campaigns from Facebook API
        const allCampaigns = await getCampaigns(adsToken, adAccountId);

        // 2. Filter by status
        let campaignsToUse: any[];
        if (statusFilter === 'ACTIVE') {
            campaignsToUse = allCampaigns.filter((c: any) => c.effective_status === 'ACTIVE');
        } else if (statusFilter === 'PAUSED') {
            campaignsToUse = allCampaigns.filter((c: any) => c.effective_status === 'PAUSED');
        } else {
            campaignsToUse = allCampaigns;
        }

        const campaignIds = campaignsToUse.map((c: any) => c.id);

        // Cache for later use
        localStorage.setItem('cached_campaign_catalog', JSON.stringify(allCampaigns));

        // 3. Fetch insights from NocoDB
        if (userId && adAccountId) {
            try {
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                const insights = await getInsightsByUserAndDate(userId, todayStr, todayStr, adAccountId);

                campaignsToUse = campaignsToUse.map(c => {
                    const insight = insights.find(i => String(i.campaign_id) === String(c.id));
                    if (insight) {
                        const results = insight.started_7d ?? insight.results_messaging_replied_7d ?? 0;
                        const costPerResult = insight.cost_per_started_7d ?? insight.cost_per_messaging_replied_7d ?? 0;
                        return {
                            ...c,
                            spend: insight.spend || 0,
                            results,
                            cost_per_result: costPerResult
                        };
                    }
                    return { ...c, spend: 0, results: 0, cost_per_result: 0 };
                });
            } catch (e) {
                console.error('[CampaignControlHandler] Failed to fetch insights:', e);
            }
        }

        // 4. Update catalog
        setCampaignCatalog(campaignsToUse);

        // 5. Execute campaign control flow
        const result = await campaignControl.start(userMessage, campaignsToUse);

        if (!result.handled) {
            return { handled: false };
        }

        // Handle LIST intent
        if (result.intent === 'LIST' && result.matches) {
            // Load label assignments
            let labelAssignments: any[] = [];
            try {
                const displayedCampaignIds = result.matches.map((c: any) => c.id);
                labelAssignments = await getLabelAssignmentsByEntities(displayedCampaignIds, 'campaign');
            } catch (e) {
                console.error('[CampaignControlHandler] Error loading labels:', e);
            }

            campaignControl.reset();

            return {
                handled: true,
                matches: result.matches,
                showCampaignList: true,
                filterContext: { statusFilter, campaignIds },
                labelAssignments
            };
        }

        // Handle TOGGLE intent
        if (result.intent === 'TOGGLE' && result.matches && result.matches.length > 0) {
            addMessage('assistant', result.message || 'Đã tìm thấy đối tượng.');
            return { handled: true, matches: result.matches };
        }

        // Other cases
        if (result.message) {
            addMessage('assistant', result.message);
        }

        return { handled: true };

    } catch (e) {
        console.error('[CampaignControlHandler] Error:', e);
        addMessage('assistant', '⚠️ Lỗi: Không thể tải danh sách chiến dịch.');
        return { handled: true };
    }
}

/**
 * Main handler combining both confirming and intent handling
 */
export async function handleCampaignControlFlow(
    ctx: CampaignControlContext,
    addMessage: (role: 'assistant', content: string) => void
): Promise<CampaignControlResult> {
    // First check if in confirming stage
    if (ctx.campaignControl.state.stage === 'confirming') {
        return handleCampaignControlConfirming(ctx, addMessage);
    }

    // Then check for new intent
    return handleCampaignControlIntent(ctx, addMessage);
}
