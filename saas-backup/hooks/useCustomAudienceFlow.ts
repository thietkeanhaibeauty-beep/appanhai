import { useState, useCallback } from 'react';
import { getCustomAudiences } from '@/services/aiChatAudienceOrchestratorService';
import { supabase } from '@/integrations/supabase/client';
import {
    buildTargetingObject,
    createCampaignStep,
    createAdSetStep,
    createAdStep
} from '@/features/quick-post-isolated/services/quickPost.service';
import type { QuickPostTokens } from '@/features/quick-post-isolated/types';

export type CustomAudienceFlowStage =
    | 'idle'
    | 'fetching_audiences'
    | 'selecting_audience'
    | 'awaiting_campaign_info'
    | 'parsing_campaign'
    | 'confirming'
    | 'creating';

export interface CustomAudience {
    id: string;
    name: string;
    subtype?: string;
    approximate_count?: number;
}

export interface ParsedCampaignData {
    campaignName?: string;
    budget?: number;
    budgetType?: 'daily' | 'lifetime';
    lifetimeBudget?: number;
    startTime?: string;   // ISO format
    endTime?: string;     // ISO format
    enableSchedule?: boolean;
    scheduleSlots?: Array<{
        days: number[];
        startHour: number;
        endHour: number;
    }>;
    ageMin?: number;
    ageMax?: number;
    gender?: 'male' | 'female' | 'all';
    locationType?: 'coordinate' | 'city' | 'country';
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    resolvedLocation?: any;
    interests?: Array<{ id: string; name: string }>;
    postUrl?: string;
    postId?: string;
    pageId?: string;
    resolvedPostId?: string;
    adContent?: string;
    adHeadline?: string;
    greetingText?: string;
    iceBreakerQuestions?: string[];
}

export interface CreationResult {
    campaignId: string;
    adSetId: string;
    adId: string;
}

interface CustomAudienceFlowState {
    stage: CustomAudienceFlowStage;
    audiences: CustomAudience[];
    selectedAudienceIds: string[];
    selectedAudienceNames: string[];  // ✅ Store names directly in state
    campaignData?: ParsedCampaignData;
    error?: string;
}

const initialState: CustomAudienceFlowState = {
    stage: 'idle',
    audiences: [],
    selectedAudienceIds: [],
    selectedAudienceNames: [],  // ✅ NEW
    campaignData: undefined,
    error: undefined,
};

export function useCustomAudienceFlow() {
    const [state, setState] = useState<CustomAudienceFlowState>(initialState);

    // Start the flow: fetch audiences and show selector
    const startFlow = useCallback(async (adAccountId: string, adsToken: string) => {
        setState(s => ({ ...s, stage: 'fetching_audiences', error: undefined }));

        try {
            const audiences = await getCustomAudiences(adAccountId, adsToken);
            setState(s => ({
                ...s,
                stage: 'selecting_audience',
                audiences,
            }));
            return { success: true, audiences };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to fetch audiences';
            setState(s => ({ ...s, stage: 'idle', error: errorMsg }));
            return { success: false, error: errorMsg };
        }
    }, []);

    // User confirms audience selection
    const confirmAudiences = useCallback((selectedIds: string[], audiences: CustomAudience[]) => {
        // ✅ Save names immediately to state
        const names = selectedIds
            .map(id => audiences.find(a => a.id === id)?.name)
            .filter((name): name is string => !!name);

        setState(s => ({
            ...s,
            selectedAudienceIds: selectedIds,
            selectedAudienceNames: names,  // ✅ Store names directly
            stage: 'awaiting_campaign_info',
        }));
    }, []);

    // Start with a pre-selected audience (used after audience creation)
    // Supports comma-separated IDs for multiple audiences
    const startWithPreselectedAudience = useCallback((
        audienceIdOrIds: string,  // Can be "id1" or "id1,id2"
        audienceNameOrNames: string  // Can be "name1" or "name1, name2"
    ) => {
        // Split comma-separated values
        const ids = audienceIdOrIds.split(',').map(id => id.trim()).filter(Boolean);
        const names = audienceNameOrNames.split(',').map(name => name.trim()).filter(Boolean);

        setState({
            stage: 'awaiting_campaign_info',
            audiences: ids.map((id, i) => ({ id, name: names[i] || id })),
            selectedAudienceIds: ids,
            selectedAudienceNames: names,
            campaignData: undefined,
            error: undefined,
        });
    }, []);

    // Cancel the flow
    const cancelFlow = useCallback(() => {
        setState(initialState);
    }, []);

    // Parse campaign info from user input
    const parseCampaignInfo = useCallback(async (
        userInput: string,
        adsToken: string,
        pageToken?: string
    ): Promise<{ success: boolean; data?: ParsedCampaignData; error?: string }> => {
        setState(s => ({ ...s, stage: 'parsing_campaign' }));

        try {
            // Call parse-campaign-with-user-api Edge Function
            const { data: responseData, error } = await supabase.functions.invoke('parse-campaign-with-user-api', {
                body: {
                    text: userInput,  // Edge Function expects 'text' not 'userMessage'
                    adsToken,
                    pageToken,
                }
            });

            if (error) throw error;

            // Edge Function returns { success: true, data: { ...parsed campaign fields } }
            if (!responseData?.success) {
                throw new Error(responseData?.error || 'Failed to parse campaign info');
            }

            const parsedData = responseData.data;



            // Map the parsed fields to our internal format
            const campaignData: ParsedCampaignData = {
                campaignName: parsedData.campaignName,
                budget: parsedData.budget,
                budgetType: parsedData.budgetType === 'lifetime' ? 'lifetime' : 'daily',
                lifetimeBudget: parsedData.lifetimeBudget || (parsedData.budgetType === 'lifetime' ? parsedData.budget : undefined),
                startTime: parsedData.startTime,
                endTime: parsedData.endTime,
                enableSchedule: parsedData.enableSchedule || false,
                scheduleSlots: Array.isArray(parsedData.scheduleSlots) ? parsedData.scheduleSlots : undefined,
                ageMin: parsedData.ageMin,
                ageMax: parsedData.ageMax,
                gender: parsedData.gender,
                locationType: parsedData.locationType,
                latitude: parsedData.latitude,
                longitude: parsedData.longitude,
                radiusKm: parsedData.radiusKm,
                resolvedLocation: parsedData.resolvedLocation,
                interests: parsedData.resolvedInterests,
                postUrl: parsedData.postUrl,
                postId: parsedData.resolvedPost?.postId,
                pageId: parsedData.resolvedPost?.pageId,
                resolvedPostId: parsedData.resolvedPost?.fullPostId,
                adContent: parsedData.content,
                adHeadline: parsedData.headline,
                greetingText: parsedData.greetingTemplate,
                iceBreakerQuestions: parsedData.frequentQuestions,
            };

            // Successfully parsed - move to confirming stage
            // Successfully parsed - move to confirming stage
            // ✅ Fallback: If resolvedPostId is missing but we have postUrl, try to validate again
            // This matches logic in useQuickPostFlow to handle cases where initial parse misses the ID
            let finalCampaignData = campaignData;

            if (!finalCampaignData.resolvedPostId && finalCampaignData.postUrl && pageToken) {
                try {
                    // ✅ Updated: Use facebook-post-extractor (as validate-facebook-post is deprecated)
                    const { data: extractorData, error: extractorError } = await supabase.functions.invoke('facebook-post-extractor', {
                        body: {
                            facebook_post_input: finalCampaignData.postUrl,
                            access_token: adsToken || pageToken
                        }
                    });

                    if (!extractorError && extractorData?.success && extractorData?.post_id) {
                        finalCampaignData = {
                            ...finalCampaignData,
                            postId: extractorData.post_id,
                            // Use pageId from existing data if available, or from validation (resolved_page_id)
                            pageId: campaignData.pageId || extractorData.resolved_page_id,
                            resolvedPostId: `${campaignData.pageId || extractorData.resolved_page_id}_${extractorData.post_id}`
                        };
                    } else {
                        console.warn('[CustomAudienceFlow] ⚠️ Fallback validation failed:', extractorError || extractorData?.error);
                    }
                } catch (fallbackError) {
                    console.error('[CustomAudienceFlow] ❌ Fallback validation error:', fallbackError);
                }
            }

            setState(s => ({
                ...s,
                stage: 'confirming',
                campaignData: finalCampaignData,
            }));

            return { success: true, data: campaignData };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to parse campaign info';
            console.error('[CustomAudienceFlow] ❌ parseCampaignInfo error:', error);
            setState(s => ({ ...s, stage: 'awaiting_campaign_info', error: errorMsg }));
            return { success: false, error: errorMsg };
        }
    }, []);

    // Get selected audience names for display - now returns stored names
    const getSelectedAudienceNames = useCallback((): string[] => {
        return state.selectedAudienceNames;  // ✅ Return stored names directly
    }, [state.selectedAudienceNames]);

    // Move to creating stage
    const startCreation = useCallback(() => {
        setState(s => ({ ...s, stage: 'creating' }));
    }, []);

    // ✅ Confirm and create campaign with custom audiences
    const confirmAndCreate = useCallback(async (
        tokens: QuickPostTokens
    ): Promise<CreationResult | null> => {
        if (!state.campaignData) {
            console.error('[CustomAudienceFlow] No campaign data to create');
            return null;
        }

        setState(s => ({ ...s, stage: 'creating' }));

        try {
            const data = state.campaignData;
            const customAudienceIds = state.selectedAudienceIds;

            // ✅ VALIDATION: Block creation if lifetime budget is missing dates
            if (data.budgetType === 'lifetime') {
                if (!data.startTime || !data.endTime) {
                    throw new Error('❌ Ngân sách trọn đời cần có ngày bắt đầu và kết thúc!\n\n💡 Vui lòng nhập lại với format:\ntừ DD/MM/YYYY đến DD/MM/YYYY');
                }
            }



            // Transform to format expected by buildTargetingObject
            const parsedForTargeting = {
                age: { min: data.ageMin || 18, max: data.ageMax || 65 },
                gender: data.gender || 'all',
                latitude: data.latitude,
                longitude: data.longitude,
                radiusKm: data.radiusKm,
                location: data.resolvedLocation ? [data.resolvedLocation] : undefined,
                interests: data.interests,
            };

            // Build targeting WITH custom audiences
            const targeting = buildTargetingObject(parsedForTargeting as any, customAudienceIds);

            // Step 1: Create Campaign
            const campaign = await createCampaignStep(
                data.campaignName || 'Custom Audience Campaign',
                tokens.adsToken,
                tokens.adAccountId,
                'OUTCOME_ENGAGEMENT'
            );
            console.log('[CustomAudienceFlow] Campaign created:', campaign.campaignId);

            // Step 2: Create AdSet with custom audiences
            // ✅ Build lifetimeOptions if budgetType is lifetime
            const lifetimeOptions = data.budgetType === 'lifetime' ? {
                budgetType: 'lifetime' as const,
                lifetimeBudget: data.lifetimeBudget || data.budget,
                startTime: data.startTime,
                endTime: data.endTime,
                adsetSchedule: data.scheduleSlots && data.scheduleSlots.length > 0
                    ? data.scheduleSlots.map((slot: any) => ({
                        days: slot.days,
                        start_minute: slot.startHour * 60,
                        end_minute: slot.endHour * 60,
                        timezone_type: 'USER'
                    }))
                    : undefined
            } : undefined;



            const adset = await createAdSetStep(
                campaign.campaignId,
                data.campaignName || 'Custom Audience Campaign',
                data.budget || 200000,
                targeting,
                tokens,
                'CONVERSATIONS',  // ✅ Must be CONVERSATIONS for Messenger destination
                lifetimeOptions,  // ✅ Now passing lifetime options!
                customAudienceIds  // ✅ Pass custom audience IDs
            );
            console.log('[CustomAudienceFlow] AdSet created:', adset.adSetId);

            // Step 3: Create Ad
            if (!data.resolvedPostId) {
                throw new Error('Missing resolved post ID. Please provide a valid Facebook post URL.');
            }

            const ad = await createAdStep(
                adset.adSetId,
                data.campaignName || 'Custom Audience Campaign',
                data.resolvedPostId,
                tokens
            );

            console.log('[CustomAudienceFlow] Ad created:', ad.adId);
            console.log('[CustomAudienceFlow] Ad created:', ad.adId);

            // Success - reset state
            setState(initialState);

            return {
                campaignId: campaign.campaignId,
                adSetId: adset.adSetId,
                adId: ad.adId
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to create campaign';
            console.error('[CustomAudienceFlow] Creation failed:', errorMsg);
            setState(s => ({ ...s, stage: 'confirming', error: errorMsg }));
            return null;
        }
    }, [state.campaignData, state.selectedAudienceIds]);

    // Reset state
    const reset = useCallback(() => {
        setState(initialState);
    }, []);

    return {
        // State
        stage: state.stage,
        audiences: state.audiences,
        selectedAudienceIds: state.selectedAudienceIds,
        selectedAudienceNames: state.selectedAudienceNames,  // ✅ Export names directly
        campaignData: state.campaignData,
        error: state.error,
        isActive: state.stage !== 'idle',

        // Actions
        startFlow,
        startWithPreselectedAudience,
        confirmAudiences,
        cancelFlow,
        parseCampaignInfo,
        getSelectedAudienceNames,
        startCreation,
        confirmAndCreate,
        reset,
    };

}
