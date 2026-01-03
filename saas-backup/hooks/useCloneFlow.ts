import { useState, useCallback } from 'react';
import {
  suggestCloneName,
  fetchCampaignStructure,
  fetchAdSetsForCampaign,
  fetchAdsForAdSet,
  cloneCampaignWithAdSets,
  cloneAdSetWithAds,
  cloneAd
} from '@/services/advancedAdsService';

export type CloneStage =
  | 'idle'
  | 'awaiting_confirmation'
  | 'awaiting_list_choice'
  | 'listing_campaigns'
  | 'awaiting_campaign_selection'
  | 'selecting_type'
  | 'listing_children'
  | 'awaiting_child_selection'
  | 'awaiting_name'
  | 'awaiting_quantity'
  | 'confirming'
  | 'cloning';

export type CloneType = 'campaign' | 'adset' | 'ad';

interface CloneState {
  stage: CloneStage;
  selectedType?: CloneType;
  effectiveItems?: any[];
  childItems?: any[];
  selectedItem?: any;
  selectedChild?: any;
  quantities?: {
    campaigns?: number;
    adsets?: number;
    ads?: number;
  };
  statusOption?: 'PAUSED' | 'ACTIVE';
  newName?: string;
  isFetching?: boolean;
}

interface CloneFlowResult {
  stage: CloneStage;
  selectedType?: CloneType;
  effectiveItems: any[];
  childItems: any[];
  selectedItem?: any;
  selectedChild?: any;
  quantities?: { campaigns?: number; adsets?: number; ads?: number };
  statusOption?: 'PAUSED' | 'ACTIVE';
  newName?: string;
  isActive: boolean;
  start: () => void;
  confirmIntent: () => void;
  chooseListOption: () => void;
  chooseSearchOption: () => void;
  selectType: (type: CloneType) => void;
  loadCampaigns: (items: any[]) => { success: boolean; items: any[] };
  fetchCampaignsForListing: (userId: string, adAccountId: string, adsToken: string) => Promise<{ success: boolean; items?: any[]; message?: string }>;
  selectCampaignByIndex: (index: number) => { success: boolean; item?: any; message?: string };
  selectCampaignByName: (campaignName: string) => Promise<{ success: boolean; item?: any; message?: string }>;
  fetchChildItems: (adAccountId: string, adsToken: string, type?: CloneType, selectedItem?: any) => Promise<{ success: boolean; items?: any[]; message?: string }>;
  selectChildByIndex: (index: number) => { success: boolean; item?: any; message?: string };
  setQuantities: (quantities: any) => void;
  setStatusOption: (status: 'PAUSED' | 'ACTIVE') => void;
  setNewName: (name: string) => void;
  proceedToAwaitingName: () => void;
  proceedToAwaitingQuantity: () => void;
  proceedToConfirming: () => void;
  confirmAndClone: (adAccountId: string, adsToken: string) => Promise<{ success: boolean; message: string; error?: string }>;
  reset: () => void;
}

export function useCloneFlow(): CloneFlowResult {
  const [state, setState] = useState<CloneState>({
    stage: 'idle',
    selectedType: undefined,
    effectiveItems: undefined,
    childItems: undefined,
    selectedItem: undefined,
    selectedChild: undefined,
    quantities: undefined,
    statusOption: 'ACTIVE', // Default to ACTIVE per user request
    newName: undefined,
    isFetching: false
  });

  const start = useCallback(() => {
    setState({
      stage: 'awaiting_confirmation',
      selectedType: undefined,
      effectiveItems: undefined,
      childItems: undefined,
      selectedItem: undefined,
      selectedChild: undefined,
      quantities: { campaigns: 1, adsets: 1, ads: 1 },
      statusOption: 'ACTIVE', // Default to ACTIVE per user request
      newName: undefined
    });
  }, []);

  const confirmIntent = useCallback(() => {
    setState(prev => ({ ...prev, stage: 'awaiting_list_choice' }));
  }, []);

  const chooseListOption = useCallback(() => {
    setState(prev => ({ ...prev, stage: 'listing_campaigns' }));
  }, []);

  const chooseSearchOption = useCallback(() => {
    setState(prev => ({ ...prev, stage: 'awaiting_campaign_selection' }));
  }, []);

  const selectType = useCallback((type: CloneType) => {
    setState(prev => ({ ...prev, stage: 'confirming', selectedType: type }));
  }, []);

  const loadCampaigns = useCallback((items: any[]) => {
    setState(prev => ({
      ...prev,
      stage: 'awaiting_campaign_selection',
      effectiveItems: items,
      isFetching: false
    }));
    return { success: true, items };
  }, []);

  const fetchCampaignsForListing = useCallback(async (
    userId: string,
    adAccountId: string,
    adsToken: string
  ) => {
    if (state.isFetching) {
      return { success: false, message: 'Already fetching' };
    }

    setState(prev => ({ ...prev, isFetching: true }));

    try {
      // ✅ FIX: Use Standard Service (UI -> Hook -> Service)
      // fetchCampaignStructure handles effective_status and data mapping internally
      const campaigns = await fetchCampaignStructure(adAccountId, adsToken);

      // Adapter: Map Service Data -> UI Data
      // Although fetchCampaignStructure data is roughly compatible, we ensure keys match
      const items = campaigns.map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.effective_status || c.status, // Service returns effective_status
        level: 'campaign',
        spend: 0,
        results: 0,
        result_label: 'kết quả'
      }));

      setState(prev => ({
        ...prev,
        stage: 'awaiting_campaign_selection',
        effectiveItems: items,
        isFetching: false
      }));

      return { success: items.length > 0, items };
    } catch (error: any) {
      console.error('[CloneFlow] Fetch error:', error);
      setState(prev => ({ ...prev, isFetching: false }));
      return { success: false, message: error.message };
    }
  }, [state.isFetching]);

  const selectCampaignByIndex = useCallback((index: number) => {
    if (!state.effectiveItems || index < 0 || index >= state.effectiveItems.length) {
      return { success: false, message: 'Số thứ tự không hợp lệ' };
    }

    const matchedItem = state.effectiveItems[index];

    setState(prev => ({
      ...prev,
      stage: 'selecting_type',
      selectedItem: matchedItem,
      newName: suggestCloneName(matchedItem.name)
    }));

    return { success: true, item: matchedItem };
  }, [state.effectiveItems]);

  const selectCampaignByName = useCallback(async (input: string) => {
    setState(prev => ({ ...prev, stage: 'awaiting_campaign_selection' }));
    return { success: false, message: 'Vui lòng nhập tên chiến dịch để tìm kiếm' };
  }, []);

  const fetchChildItems = useCallback(async (
    adAccountId: string,
    adsToken: string,
    type?: CloneType,
    passedItem?: any
  ) => {
    // Use passed type parameter OR fallback to state.selectedType
    const effectiveType = type || state.selectedType;
    // Use passed item OR fallback to state.selectedItem (fixes React race condition)
    const effectiveItem = passedItem || state.selectedItem;

    if (!effectiveItem || !effectiveType) {
      console.warn('[fetchChildItems] Missing item or type:', { selectedItem: effectiveItem?.id, effectiveType });
      return { success: false, message: 'Chưa chọn chiến dịch hoặc loại' };
    }

    setState(prev => ({ ...prev, isFetching: true }));

    try {
      let items: any[] = [];


      if (effectiveType === 'adset') {
        // ✅ UI -> Hook -> Service
        const data = await fetchAdSetsForCampaign(effectiveItem.id, adsToken);
        // Adapter: Service Data -> UI Data (Safety Defaults)
        items = (data || []).map((i: any) => ({ ...i, spend: 0, results: 0, cost_per_result: 0 }));
      } else if (effectiveType === 'ad') {
        // ✅ UI -> Hook -> Service
        const data = await fetchAdsForAdSet(effectiveItem.id, adsToken);
        // Adapter: Service Data -> UI Data (Safety Defaults)
        items = (data || []).map((i: any) => ({ ...i, spend: 0, results: 0, cost_per_result: 0 }));
      }

      setState(prev => ({
        ...prev,
        // When single item, go directly to confirming stage (show CloneConfirmCard)
        // Skip the chat-based name/quantity input steps
        stage: items.length === 1 ? 'confirming' : 'awaiting_child_selection',
        childItems: items,
        selectedChild: items.length === 1 ? items[0] : undefined,
        newName: items.length === 1 ? suggestCloneName(items[0].name) : undefined,
        quantities: { campaigns: 1, adsets: 1, ads: 1 }, // Default quantities
        isFetching: false
      }));

      return { success: true, items };
    } catch (error: any) {
      console.error('[CloneFlow] Fetch child error:', error);
      setState(prev => ({ ...prev, isFetching: false }));

      // Check if it's a rate limit error
      const isRateLimit = error.message?.includes('rate limit') ||
        error.message?.includes('limit reached') ||
        error.message?.includes('User request limit');

      if (isRateLimit) {
        return {
          success: false,
          message: '⚠️ **Facebook API đang bị giới hạn tốc độ**\n\n' +
            '🕐 Vui lòng **đợi 10-15 giây** rồi thử lại.\n\n' +
            '💡 **Gợi ý:** Nhấn nút **Xóa** để reset chat và thử lại.'
        };
      }

      // Regular error
      return { success: false, message: error.message || 'Lỗi lấy dữ liệu' };
    }
  }, [state.selectedItem, state.selectedType]);

  const selectChildByIndex = useCallback((index: number) => {
    if (!state.childItems || index < 0 || index >= state.childItems.length) {
      return { success: false, message: 'Số thứ tự không hợp lệ' };
    }

    const matchedItem = state.childItems[index];

    setState(prev => ({
      ...prev,
      // Go directly to confirming to show CloneConfirmCard - skip chat-based name input
      stage: 'confirming',
      selectedChild: matchedItem,
      newName: suggestCloneName(matchedItem.name),
      quantities: { campaigns: 1, adsets: 1, ads: 1 } // Default quantities
    }));

    return { success: true, item: matchedItem };
  }, [state.childItems]);

  const proceedToAwaitingName = useCallback(() => {
    setState(prev => ({ ...prev, stage: 'awaiting_name' }));
  }, []);

  const proceedToAwaitingQuantity = useCallback(() => {
    setState(prev => ({ ...prev, stage: 'awaiting_quantity' }));
  }, []);

  const proceedToConfirming = useCallback(() => {
    setState(prev => ({ ...prev, stage: 'confirming' }));
  }, []);

  const setQuantities = useCallback((quantities: any) => {
    setState(prev => ({ ...prev, quantities }));
  }, []);

  const setStatusOption = useCallback((status: 'PAUSED' | 'ACTIVE') => {
    setState(prev => ({ ...prev, statusOption: status }));
  }, []);

  const setNewName = useCallback((name: string) => {
    setState(prev => ({ ...prev, newName: name }));
  }, []);

  const confirmAndClone = useCallback(async (
    adAccountId: string,
    adsToken: string
  ) => {
    setState(prev => ({ ...prev, stage: 'cloning' }));

    try {
      const baseName = state.newName || state.selectedChild?.name || state.selectedItem?.name || 'Clone';
      const quantities = state.quantities || { campaigns: 1, adsets: 1, ads: 1 };
      const status = state.statusOption || 'ACTIVE'; // Default to ACTIVE

      let allResults: any[] = [];

      // Helper function to add delay between API calls
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      const API_DELAY_MS = 5000; // 5 second delay between calls to avoid rate limit

      // ✅ UI -> Hook -> Service Execution
      if (state.selectedType === 'campaign') {
        const numCampaigns = quantities.campaigns || 1;

        for (let i = 0; i < numCampaigns; i++) {
          if (i > 0) await delay(API_DELAY_MS); // Add delay between iterations

          const campaignName = numCampaigns > 1 ? `${baseName} - ${i + 1}` : baseName;

          const result = await cloneCampaignWithAdSets({
            campaignId: state.selectedItem?.id || '',
            newName: campaignName,
            adsetQuantity: quantities.adsets || 1,
            adQuantity: quantities.ads || 1,
            statusOption: status, // Use user-selected status
            accessToken: adsToken,
            adAccountId
          });
          allResults.push(result);
        }
      } else if (state.selectedType === 'adset') {
        const numAdsets = quantities.adsets || 1;
        const targetId = state.selectedChild?.id || state.selectedItem?.id;

        for (let i = 0; i < numAdsets; i++) {
          if (i > 0) await delay(API_DELAY_MS); // Add delay between iterations

          const adsetName = numAdsets > 1 ? `${baseName} - ${i + 1}` : baseName;

          const result = await cloneAdSetWithAds({
            adsetId: targetId || '',
            newName: adsetName,
            adQuantity: quantities.ads || 1,
            statusOption: status, // Use user-selected status
            accessToken: adsToken,
            adAccountId
          });
          allResults.push(result);
        }
      } else if (state.selectedType === 'ad') {
        const numAds = quantities.ads || 1;
        const targetId = state.selectedChild?.id || state.selectedItem?.id;

        for (let i = 0; i < numAds; i++) {
          if (i > 0) await delay(API_DELAY_MS); // Add delay between iterations

          const adName = numAds > 1 ? `${baseName} - ${i + 1}` : baseName;

          const result = await cloneAd({
            adId: targetId || '',
            newName: adName,
            statusOption: status, // Use user-selected status
            accessToken: adsToken,
            adAccountId
          });
          allResults.push(result);
        }
      }

      // Status is now passed directly to clone functions, no batch activation needed

      const successCount = allResults.filter(r => r.success).length;

      if (successCount === 0) {
        setState(prev => ({ ...prev, stage: 'awaiting_name' }));
        return { success: false, message: `❌ Nhân bản thất bại`, error: 'All clones failed' };
      }

      setState({
        stage: 'idle',
        selectedType: undefined,
        effectiveItems: undefined,
        childItems: undefined,
        selectedItem: undefined,
        selectedChild: undefined,
        quantities: undefined,
        statusOption: 'PAUSED',
        newName: undefined,
        isFetching: false
      });

      return { success: true, message: `🎉 Nhân bản thành công ${successCount}/${allResults.length} ${state.selectedType}!` };
    } catch (error: any) {
      console.error('[CloneFlow] Clone error:', error);
      setState(prev => ({ ...prev, stage: 'awaiting_name' }));
      return { success: false, message: `❌ Lỗi: ${error.message}`, error: error.message };
    }
  }, [state.selectedType, state.selectedItem, state.selectedChild, state.quantities, state.statusOption, state.newName]);

  const reset = useCallback(() => {
    setState({
      stage: 'idle',
      selectedType: undefined,
      effectiveItems: undefined,
      childItems: undefined,
      selectedItem: undefined,
      selectedChild: undefined,
      quantities: undefined,
      statusOption: 'PAUSED',
      newName: undefined,
      isFetching: false
    });
  }, []);

  return {
    stage: state.stage,
    selectedType: state.selectedType,
    effectiveItems: state.effectiveItems || [],
    childItems: state.childItems || [],
    selectedItem: state.selectedItem,
    selectedChild: state.selectedChild,
    quantities: state.quantities,
    statusOption: state.statusOption,
    newName: state.newName,
    isActive: state.stage !== 'idle',
    start,
    confirmIntent,
    chooseListOption,
    chooseSearchOption,
    selectType,
    loadCampaigns,
    fetchCampaignsForListing,
    selectCampaignByIndex,
    selectCampaignByName,
    fetchChildItems,
    selectChildByIndex,
    setQuantities,
    setStatusOption,
    setNewName,
    proceedToAwaitingName,
    proceedToAwaitingQuantity,
    proceedToConfirming,
    confirmAndClone,
    reset
  };
}
