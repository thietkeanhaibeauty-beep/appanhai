import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import * as advancedAdsService from "@/services/advancedAdsService";
import { getAdSets, getAds } from "@/services/facebookInsightsService";

// Import components
import { QuickPostConfirmCard } from "@/features/quick-post-isolated/components/QuickPostConfirmCard";
import { QuickCreativeConfirmCard } from "../QuickCreativeConfirmCard";
import { CloneConfirmIntentButtons } from "../CloneConfirmIntentButtons";
import { CloneListChoiceButtons } from "../CloneListChoiceButtons";
import { CampaignSelector } from "../CampaignSelector";
import { CloneTypeSelector } from "../CloneTypeSelector";
import { CloneConfirmCard } from "../CloneConfirmCard";
import { AudienceFlowHandler } from "./AudienceFlowHandler";
import { RuleCard } from "../automation/RuleCard";
import { ItemSelectorCard } from "@/assistant/components/ItemSelectorCard";
import { CampaignListCard } from "@/assistant/components/CampaignListCard";
import { useToast } from "@/hooks/use-toast";
import CustomAudienceSelector from "../CustomAudienceSelector";
import { TemplateCreatorCard } from "./TemplateCreatorCard";
import { ReportCard, ReportData } from "./ReportCard";
import { ReportErrorCard, ReportError } from "./ReportErrorCard";

import type { ParsedCampaignData } from "@/features/quick-post-isolated/types";
import type { CampaignLabel } from "@/services/nocodb/campaignLabelsService";
import type { CampaignLabelAssignment } from "@/services/nocodb/campaignLabelAssignmentsService";

type Message = { role: "user" | "assistant"; content: string; data?: any };

interface MessageListProps {
    messages: Message[];
    isLoading: boolean;
    userName: string | null;
    creative: any;
    audience: any;
    clone: any;
    quickPost: any;
    campaignControl: any;
    ruleFlow: any;
    customAudienceFlow?: any;
    templateCreator?: any;
    selectableItems?: any[];  // For rule label assignment
    // Label props
    labels?: CampaignLabel[];
    labelAssignments?: CampaignLabelAssignment[];
    onAssignLabel?: (entityId: string, entityType: 'campaign' | 'adset' | 'ad', labelIds: number[]) => Promise<void>;
    onRemoveLabel?: (entityId: string, entityType: 'campaign' | 'adset' | 'ad', labelId: number) => Promise<void>;
    addMessage: (role: "user" | "assistant", content: string) => void;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    getTokens: () => { adsToken: string; pageToken: string; adAccountId: string; pageId: string };
    refreshTokens: () => Promise<{ adsToken: string; pageToken: string; adAccountId: string; pageId: string }>;
    user: any;
    handleCancel: () => void;
    handleQuickReply: (text: string) => void;
    removeAttachedFile: () => void;
}


export function MessageList({
    messages,
    isLoading,
    userName,
    creative,
    audience,
    clone,
    quickPost,
    campaignControl,
    ruleFlow,
    customAudienceFlow,
    templateCreator,
    selectableItems,
    labels = [],
    labelAssignments = [],
    onAssignLabel,
    onRemoveLabel,
    addMessage,
    setMessages,
    setIsLoading,
    getTokens,
    refreshTokens,
    user,
    handleCancel,
    handleQuickReply,
    removeAttachedFile
}: MessageListProps) {


    // Collapsible message component
    const CollapsibleUserMessage = ({ content }: { content: string }) => {
        const [isExpanded, setIsExpanded] = useState(false);
        const maxLength = 150;
        const shouldTruncate = content.length > maxLength;

        return (
            <div>
                <div className="whitespace-pre-wrap">
                    {shouldTruncate && !isExpanded
                        ? content.substring(0, maxLength) + '...'
                        : content}
                </div>
                {shouldTruncate && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-primary/70 hover:text-primary mt-1"
                    >
                        {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                )}
            </div>
        );
    };

    // Helper to format selected campaign
    const formatSelectedCampaign = (campaign: any) => {
        return `✅ Đã chọn chiến dịch:\n\n` +
            `📌 Tên: ${campaign.name}\n` +
            `🆔 ID: ${campaign.id}\n` +
            `📊 Trạng thái: ${campaign.status}\n\n` +
            `Anh muốn làm gì tiếp theo ạ?`;
    };

    // Lazy Loading State
    const [loadingTabs, setLoadingTabs] = useState<Record<number, { adsets: boolean; ads: boolean }>>({});
    const [fetchedTabs, setFetchedTabs] = useState<Record<number, Set<string>>>({});
    // ✅ Fetch AdSets/Ads from NocoDB (same as direct chat)
    const handleTabChange = async (index: number, tab: string) => {

        // Only handle adsets and ads tabs
        if (tab !== 'adsets' && tab !== 'ads') {
            return;
        }

        // Guard: don't fetch if already loading
        if (loadingTabs[index]?.[tab as 'adsets' | 'ads']) {
            return;
        }

        const scope = tab === 'adsets' ? 'ADSET' : 'AD';
        const level = tab === 'adsets' ? 'adset' : 'ad';
        const msg = messages[index];
        const filterContext = (msg as any)?.filterContext;

        // Guard: don't fetch if already have data for this scope
        const existingData = msg?.data?.filter((d: any) => d.scope === scope) || [];
        if (existingData.length > 0) {
            return;
        }

        // Set loading
        setLoadingTabs(prev => ({
            ...prev,
            [index]: { ...prev[index], [tab]: true }
        }));

        try {
            const { getInsightsByUserAndDate } = await import('@/services/nocodb/facebookInsightsAutoService');
            const { adAccountId } = getTokens();

            if (!user?.id || !adAccountId) {
                console.error('Missing user or adAccountId');
                return;
            }

            // ✅ Fetch from NocoDB (already synced data - same as direct chat!)
            const today = new Date().toISOString().split('T')[0];
            const insights = await getInsightsByUserAndDate(user.id, today, today, adAccountId);

            // Filter by level (adset or ad)
            let filteredItems = insights.filter(i => i.level === level);

            // Get filterContext for smart filtering
            const statusFilter = filterContext?.statusFilter || 'ALL';
            const campaignIds: string[] = filterContext?.campaignIds || [];

            // Filter by campaignIds if viewing from campaign context
            if (campaignIds.length > 0) {
                filteredItems = filteredItems.filter(item => campaignIds.includes(item.campaign_id || ''));
            }

            // Filter by status if not ALL
            if (statusFilter !== 'ALL') {
                filteredItems = filteredItems.filter(item => item.effective_status === statusFilter);
            }

            // Transform to CampaignMatch format
            const newItems = filteredItems.map(item => ({
                id: tab === 'adsets' ? item.adset_id : item.ad_id,
                name: tab === 'adsets' ? item.adset_name : item.ad_name,
                scope,
                effective_status: item.effective_status || 'ACTIVE',
                spend: item.spend || 0,
                results: item.started_7d ?? item.results ?? 0,
                cost_per_result: item.cost_per_started_7d ?? item.cost_per_result ?? 0,
                campaign_id: item.campaign_id
            }));

            // Update message data
            setMessages(prev => prev.map((m, i) => {
                if (i === index && m.data) {
                    return {
                        ...m,
                        data: [...m.data.filter((d: any) => d.scope !== scope), ...newItems]
                    };
                }
                return m;
            }));

            // Mark as fetched
            setFetchedTabs(prev => {
                const newSet = new Set(prev[index] || []);
                newSet.add(tab);
                return { ...prev, [index]: newSet };
            });

        } catch (error) {
            console.error(`Error fetching ${tab} from NocoDB:`, error);
        } finally {
            setLoadingTabs(prev => ({
                ...prev,
                [index]: { ...prev[index], [tab]: false }
            }));
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-4">
            {messages.length === 0 && (
                <div className="flex items-center justify-center h-auto md:h-full max-h-[35vh] md:max-h-none md:min-h-[300px]">
                    <div className="text-center space-y-3 md:space-y-6 max-w-md mx-auto px-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-2xl mb-4">AI</div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-xl md:text-2xl text-foreground">
                                Xin chào {userName || 'bạn'}! 👋
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Em có thể giúp anh tạo chiến dịch, đối tượng, hoặc trả lời câu hỏi về quảng cáo
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Creator Card */}
            {templateCreator?.isCreating && (
                <TemplateCreatorCard
                    formData={templateCreator.formData}
                    isSaving={templateCreator.isSaving}
                    onUpdate={templateCreator.updateFormData}
                    onSubmit={templateCreator.createTemplate}
                    onCancel={templateCreator.hideCreator}
                />
            )}

            {messages.map((msg, idx) => {
                // Handle special message types
                if (msg.content === '__SHOW_CREATIVE_CONFIRM_CARD__' || msg.content === '__SHOW_CONFIRM_CARD__' || msg.content === '__SHOW_THUMBNAIL_OPTIONS__') {
                    return null;
                }

                // Handle Report Card
                if (msg.content === '__SHOW_REPORT_CARD__' && msg.data) {
                    return (
                        <div key={idx} className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                            <ReportCard
                                data={msg.data as ReportData}
                                onExportExcel={() => {
                                    import('@/utils/exportReportToExcel').then(({ exportReportToExcel }) => {
                                        exportReportToExcel(msg.data as ReportData);
                                    });
                                }}
                                onViewDetails={() => {
                                    // TODO: Navigate to full report
                                    console.log('View Details clicked');
                                }}
                            />
                        </div>
                    );
                }

                // Handle Report Error Card
                if (msg.content === '__SHOW_REPORT_ERROR__' && msg.data) {
                    return (
                        <div key={idx} className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                            <ReportErrorCard
                                error={msg.data as ReportError}
                                onRetry={() => {
                                    // TODO: Implement retry
                                    console.log('Retry clicked');
                                }}
                            />
                        </div>
                    );
                }

                if (msg.content === '__SHOW_CAMPAIGN_LIST__' && msg.data) {
                    return (
                        <div key={idx} className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                            <CampaignListCard
                                campaigns={msg.data}
                                isLoadingAdSets={loadingTabs[idx]?.adsets}
                                isLoadingAds={loadingTabs[idx]?.ads}
                                onTabChange={(tab) => handleTabChange(idx, tab)}
                                labels={labels}
                                labelAssignments={labelAssignments}
                                onAssignLabel={onAssignLabel}
                                onRemoveLabel={onRemoveLabel}
                                onToggle={async (id, action) => {
                                    // 1. Call API
                                    await campaignControl.handleToggleAction(id, action);

                                    // 2. Update local message state to reflect change immediately in UI
                                    setMessages(prev => prev.map((m, i) => {
                                        if (i === idx && m.data) {
                                            return {
                                                ...m,
                                                data: m.data.map((c: any) =>
                                                    c.id === id
                                                        ? { ...c, effective_status: action === 'PAUSE' ? 'PAUSED' : 'ACTIVE' }
                                                        : c
                                                )
                                            };
                                        }
                                        return m;
                                    }));
                                }}
                            />

                        </div>
                    );
                }

                return (
                    <div
                        key={idx}
                        className={cn(
                            "flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2",
                            msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                    >
                        {msg.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                        )}
                        <div
                            className={cn(
                                "px-4 py-2 rounded-lg max-w-[80%]",
                                msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-gradient-to-r from-[#e91e63] to-[#ff7043] text-white"
                            )}
                        >
                            {msg.role === "user" ? (
                                <CollapsibleUserMessage content={msg.content} />
                            ) : (
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Quick Post Confirm Card - Skip if Custom Audience flow is confirming */}
            {quickPost.stage === 'confirming' && customAudienceFlow?.stage !== 'confirming' && (
                <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                    <div className="w-full max-w-lg">
                        <QuickPostConfirmCard
                            data={(() => {
                                return quickPost.data as ParsedCampaignData;
                            })()}
                            onConfirm={async () => {
                                setIsLoading(true);
                                try {
                                    const tokens = getTokens();
                                    const result = await quickPost.confirmAndCreate(tokens);
                                    if (result) {
                                        addMessage('assistant',
                                            `✅ Tạo thành công!\n\n` +
                                            `📊 Campaign ID: ${result.campaignId}\n` +
                                            `🎯 Ad Set ID: ${result.adSetId}\n` +
                                            `📢 Ad ID: ${result.adId}\n\n` +
                                            `Kiểm tra trong Facebook Ads Manager nhé!`
                                        );
                                    }
                                } catch (error) {
                                    addMessage('assistant', `❌ Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`);
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                            onCancel={() => {
                                quickPost.reset();
                                addMessage('assistant', '🔄 Đã hủy. Anh có thể thử lại với chiến dịch khác nhé!');
                            }}
                            isLoading={isLoading}
                        />
                    </div>
                </div>
            )}

            {/* Creative Confirm Card */}
            {creative.stage === 'reviewing_data' && (
                <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                    <div className="w-full max-w-lg">
                        <QuickCreativeConfirmCard
                            parsedData={creative.partialData}
                            userMessage={messages.find(m => m.role === 'user')?.content}
                            uploadedHash={creative.uploadedHash}
                            uploadedVideoId={creative.uploadedVideoId}
                            customAudienceIds={creative.customAudienceIds}
                            onContinue={async () => {
                                if (creative.uploadedHash || creative.uploadedVideoId) {
                                    setIsLoading(true);
                                    try {
                                        const { adsToken, pageToken, adAccountId, pageId } = getTokens();
                                        addMessage('assistant', '⏳ Đang tạo campaign...');

                                        const result = await creative.confirmAndCreate(
                                            user!.id,
                                            adsToken,
                                            pageToken,
                                            adAccountId,
                                            pageId
                                        );

                                        if (result.success && result.ids) {
                                            addMessage('assistant',
                                                `✅ Tạo thành công!\n\n` +
                                                `📊 Campaign ID: ${result.ids.campaignId}\n` +
                                                `🎯 Ad Set ID: ${result.ids.adSetId}\n` +
                                                `📢 Ad ID: ${result.ids.adId}\n\n` +
                                                `Kiểm tra trong Facebook Ads Manager nhé!`
                                            );
                                        } else {
                                            addMessage('assistant', result.message);
                                        }
                                    } catch (error) {
                                        addMessage('assistant', `❌ Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`);
                                    } finally {
                                        setIsLoading(false);
                                    }
                                } else {
                                    creative.continueToUpload();
                                    removeAttachedFile();
                                    addMessage('assistant', '✅ Tuyệt vời! Giờ hãy tải ảnh hoặc video lên nhé!');
                                }
                            }}
                            onCancel={() => {
                                creative.reset();
                                removeAttachedFile();
                                addMessage('assistant', '🔄 Đã hủy. Anh có thể thử lại với chiến dịch khác nhé!');
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Clone Flow: Show confirm intent buttons */}
            {clone.stage === 'awaiting_confirmation' && (
                <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                    <CloneConfirmIntentButtons
                        onConfirm={async () => {
                            // Skip awaiting_list_choice - go directly to listing campaigns
                            clone.chooseListOption();
                            setIsLoading(true);
                            addMessage('assistant', '✅ Được rồi ạ! Anh chọn chiến dịch nào nhé?');
                            try {
                                const { adsToken, adAccountId } = getTokens();
                                const result = await clone.fetchCampaignsForListing(user!.id, adAccountId, adsToken);

                                if (!result.success || !result.items || result.items.length === 0) {
                                    addMessage('assistant', '⚠️ Không tìm thấy chiến dịch nào.');
                                    clone.reset();
                                }
                            } catch (error) {
                                addMessage('assistant', `❌ Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`);
                                clone.reset();
                            } finally {
                                setIsLoading(false);
                            }
                        }}
                        onCancel={() => {
                            clone.reset();
                            addMessage('assistant', '✅ Đã hủy. Em sẵn sàng hỗ trợ anh nhé!');
                        }}
                    />
                </div>
            )}

            {/* Clone Flow: Show list/search choice buttons (kept for backup but normally skipped) */}
            {clone.stage === 'awaiting_list_choice' && (
                <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                    <CloneListChoiceButtons
                        onChooseList={async () => {
                            clone.chooseListOption();
                            setIsLoading(true);
                            try {
                                const { adsToken, adAccountId } = getTokens();
                                const result = await clone.fetchCampaignsForListing(user!.id, adAccountId, adsToken);

                                if (result.success && result.items && result.items.length > 0) {
                                    addMessage('assistant', '📋 Vui lòng chọn chiến dịch từ danh sách bên dưới:');
                                } else {
                                    addMessage('assistant', '⚠️ Không tìm thấy chiến dịch nào.');
                                    clone.reset();
                                }
                            } catch (error) {
                                addMessage('assistant', `❌ Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`);
                                clone.reset();
                            } finally {
                                setIsLoading(false);
                            }
                        }}
                        onChooseSearch={() => {
                            clone.chooseSearchOption();
                            addMessage('assistant', '🔍 Vui lòng nhập tên chiến dịch hoặc từ khóa để tìm kiếm:');
                        }}
                        onCancel={() => {
                            clone.reset();
                            addMessage('assistant', '✅ Đã hủy.');
                        }}
                    />
                </div>
            )}

            {/* Clone Flow: Show campaign selector when awaiting selection */}
            {clone.stage === 'awaiting_campaign_selection' && clone.effectiveItems.length > 0 && (
                <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                    <div className="w-full max-w-lg">
                        <CampaignSelector
                            campaigns={clone.effectiveItems}
                            onSelect={(campaign, index) => {
                                const result = clone.selectCampaignByIndex(index);
                                if (result.success) {
                                    addMessage('assistant', formatSelectedCampaign(campaign));
                                }
                            }}
                            onCancel={() => {
                                clone.reset();
                                addMessage('assistant', '✅ Đã hủy.');
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Clone Flow: Show type selector when selecting type */}
            {clone.stage === 'selecting_type' && clone.selectedItem && (
                <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                    <CloneTypeSelector
                        onSelect={async (type) => {
                            clone.selectType(type);

                            if (type === 'campaign') {
                                clone.proceedToAwaitingName();
                                addMessage('assistant',
                                    '✅ Đã chọn nhân bản chiến dịch\n\n' +
                                    '📝 Bạn muốn đặt tên mới cho chiến dịch là gì?'
                                );
                            } else {
                                setIsLoading(true);
                                try {
                                    const { adsToken, adAccountId } = getTokens();
                                    const result = await clone.fetchChildItems(adAccountId, adsToken, type, clone.selectedItem);

                                    if (result.success && result.items) {
                                        if (result.items.length === 1) {
                                            const itemType = type === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo';
                                            addMessage('assistant',
                                                `✅ Tìm thấy 1 ${itemType}: ${result.items[0].name}\n\n` +
                                                `Anh điền thông tin và nhấn Xác nhận để nhân bản.`
                                            );
                                        } else {
                                            const itemType = type === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo';
                                            const list = result.items.map((item: any, i: number) =>
                                                `${i + 1}. ${item.name} (${item.status})`
                                            ).join('\n');
                                            addMessage('assistant',
                                                `📋 Danh sách ${itemType} (${result.items.length} ${itemType}):\n\n${list}\n\n` +
                                                `💡 Chọn ${itemType}: Nhập số thứ tự`
                                            );
                                        }
                                    } else {
                                        // Show error message (including rate limit guidance)
                                        if (result.message) {
                                            addMessage('assistant', result.message);
                                        } else {
                                            const itemType = type === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo';
                                            addMessage('assistant', `⚠️ Không tìm thấy ${itemType} nào.`);
                                        }
                                        clone.reset();
                                    }
                                } catch (error) {
                                    addMessage('assistant', `❌ Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`);
                                    clone.reset();
                                } finally {
                                    setIsLoading(false);
                                }
                            }
                        }}
                        onCancel={() => {
                            clone.reset();
                            addMessage('assistant', '✅ Đã hủy.');
                        }}
                    />
                </div>
            )}

            {/* Clone Flow: Show CloneConfirmCard when confirming */}
            {clone.stage === 'confirming' && clone.selectedItem && (
                <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                    <div className="w-full max-w-lg">
                        <CloneConfirmCard
                            selectedItem={clone.selectedItem}
                            cloneType={clone.selectedType!}
                            suggestedName={clone.newName || advancedAdsService.suggestCloneName(clone.selectedItem.name)}
                            quantities={clone.quantities || { campaigns: 1, adsets: 1, ads: 1 }}
                            onChangeQuantities={(q) => clone.setQuantities(q)}
                            statusOption={clone.statusOption || 'ACTIVE'}
                            onChangeStatus={(s) => clone.setStatusOption(s)}
                            onConfirm={async () => {
                                setIsLoading(true);
                                const { adsToken, adAccountId } = getTokens();
                                addMessage('assistant', '⏳ Đang nhân bản...');

                                const result = await clone.confirmAndClone(adAccountId, adsToken);

                                setMessages(prev => prev.filter(m => !m.content.includes('⏳ Đang nhân bản')));

                                if (result.success) {
                                    addMessage('assistant', result.message);
                                } else {
                                    addMessage('assistant', `❌ ${result.message}`);
                                }
                                setIsLoading(false);
                            }}
                            onCancel={() => {
                                clone.reset();
                                addMessage('assistant', '🔄 Đã hủy.');
                            }}
                            isLoading={isLoading}
                        />
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                    <div className="px-4 py-2 rounded-lg bg-muted">
                        <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                </div>
            )}

            <AudienceFlowHandler
                audience={audience}
                addMessage={addMessage}
                setIsLoading={setIsLoading}
                isLoading={isLoading}
                getTokens={getTokens}
                refreshTokens={refreshTokens}
                onRunAds={customAudienceFlow ? (audienceId, audienceName) => {
                    customAudienceFlow.startWithPreselectedAudience(audienceId, audienceName);
                    addMessage('assistant',
                        `🚀 Đã chọn tệp **${audienceName}**!\n\n` +
                        `Vui lòng nhập thông tin chiến dịch:\n` +
                        `- Link bài viết\n` +
                        `- Ngân sách (VD: 500k/ngày hoặc 2 triệu từ 25/12 đến 31/12)\n` +
                        `- Targeting (tuổi, giới tính, vị trí...)`
                    );
                } : undefined}
            />

            {/* Campaign Control Flow */}
            {campaignControl.stage === 'selecting_items' && campaignControl.items.length > 0 && (
                <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                    <div className="w-full max-w-lg">
                        <ItemSelectorCard
                            items={campaignControl.items}
                            type={campaignControl.scope || 'campaign'}
                            onConfirm={async (selectedIds) => {
                                setIsLoading(true);
                                const { adsToken } = getTokens();
                                const result = await campaignControl.executeAction(selectedIds, adsToken);
                                addMessage('assistant', result.message);
                                setIsLoading(false);
                            }}
                            onCancel={() => {
                                campaignControl.reset();
                                addMessage('assistant', '✅ Đã hủy thao tác.');
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Rule Flow */}
            {ruleFlow.stage === 'reviewing' && ruleFlow.rule && (
                <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                    <div className="w-full max-w-lg">
                        <RuleCard
                            rule={ruleFlow.rule}
                            labels={[]}
                            onToggleActive={() => { }}
                            onEdit={() => { }}
                            onDelete={() => { }}
                            onRun={() => { }}
                            onConfirm={async () => {
                                setIsLoading(true);
                                const result = await ruleFlow.confirm(user?.id);
                                addMessage('assistant', result.message);
                                setIsLoading(false);
                            }}
                            onCancel={() => {
                                ruleFlow.reset();
                                addMessage('assistant', '✅ Đã hủy tạo quy tắc.');
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Rule Flow - Post Create Options */}
            {ruleFlow.stage === 'post_create_options' && (
                <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-muted-foreground">{ruleFlow.lastMessage}</p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={() => {
                                    ruleFlow.handlePostCreateOption('continue');
                                }}
                            >
                                ✅ Gắn nhãn ngay
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    ruleFlow.handlePostCreateOption('cancel');
                                    addMessage('assistant', ruleFlow.lastMessage);
                                }}
                            >
                                ⏭️ Bỏ qua
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rule Flow - Choosing Type (Basic vs Advanced) */}
            {ruleFlow.stage === 'choosing_type' && (
                <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                    <div className="p-2 rounded-lg bg-primary/10 h-fit">
                        <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={() => {
                                    ruleFlow.selectBasicMode();
                                }}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                📝 Quy tắc Cơ bản
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    ruleFlow.selectAdvancedMode();
                                    addMessage('assistant', ruleFlow.lastMessage);
                                }}
                            >
                                🚀 Quy tắc Nâng cao
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            <strong>Cơ bản:</strong> Điền form thủ công |
                            <strong> Nâng cao:</strong> AI phân tích (đang phát triển)
                        </p>
                    </div>
                </div>
            )}

            {/* Rule Flow - Selecting Items for Label Assignment */}
            {ruleFlow.stage === 'selecting_items' && selectableItems && selectableItems.length > 0 && (
                <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                    <div className="p-2 rounded-lg bg-primary/10 h-fit">
                        <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="w-full max-w-lg">
                        <ItemSelectorCard
                            items={selectableItems.map(item => ({
                                id: item.id,
                                name: item.name,
                                status: item.status || item.effective_status || 'UNKNOWN'
                            }))}
                            type={ruleFlow.proposedRule?.scope || 'adset'}
                            onConfirm={async (selectedIds) => {
                                setIsLoading(true);
                                const resultMessage = await ruleFlow.handleApplyLabel(selectedIds);
                                addMessage('assistant', resultMessage);
                                setIsLoading(false);
                            }}
                            onCancel={() => {
                                ruleFlow.handlePostCreateOption('cancel');
                                addMessage('assistant', '✅ Đã bỏ qua gắn nhãn.');
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Custom Audience Flow - Selector */}
            {customAudienceFlow?.stage === 'selecting_audience' && customAudienceFlow?.audiences?.length > 0 && (
                <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                    <div className="p-2 rounded-lg bg-primary/10 h-fit">
                        <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="w-full max-w-md">
                        <CustomAudienceSelector
                            audiences={customAudienceFlow.audiences}
                            selectedIds={customAudienceFlow.selectedAudienceIds || []}
                            onConfirm={(selectedIds) => {
                                // ✅ Pass audiences array so names are stored in state
                                customAudienceFlow.confirmAudiences(selectedIds, customAudienceFlow.audiences);
                                const selectedNames = selectedIds
                                    .map((id: string) => customAudienceFlow.audiences.find((a: any) => a.id === id)?.name)
                                    .filter(Boolean);
                                addMessage('assistant',
                                    `✅ Đã chọn ${selectedIds.length} tệp đối tượng:\n` +
                                    selectedNames.map((n: string) => `• ${n}`).join('\n') +
                                    `\n\n📝 Giờ hãy nhập thông tin chiến dịch (tên, ngân sách, tuổi, giới tính, vị trí, link bài viết):`
                                );
                            }}
                            onCancel={() => {
                                customAudienceFlow.reset();
                                addMessage('assistant', '✅ Đã hủy chọn tệp đối tượng.');
                            }}
                            isLoading={isLoading}
                        />
                    </div>
                </div>
            )}

            {/* Custom Audience Flow - Confirm Card */}
            {customAudienceFlow?.stage === 'confirming' && customAudienceFlow?.campaignData && (
                <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 justify-start">
                    <div className="p-2 rounded-lg bg-primary/10 h-fit">
                        <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="w-full max-w-lg">
                        <QuickPostConfirmCard
                            data={(() => {
                                return {
                                    ...customAudienceFlow.campaignData,
                                    age: {
                                        min: customAudienceFlow.campaignData.ageMin || 18,
                                        max: customAudienceFlow.campaignData.ageMax || 65
                                    },
                                    // ✅ Use selectedAudienceNames directly from state
                                    customAudienceNames: customAudienceFlow.selectedAudienceNames || []
                                };
                            })() as any}
                            onConfirm={async () => {
                                setIsLoading(true);
                                try {
                                    const tokens = getTokens();
                                    const result = await customAudienceFlow.confirmAndCreate(tokens);
                                    if (result) {
                                        addMessage('assistant',
                                            `✅ Tạo thành công với tệp đối tượng!\n\n` +
                                            `📊 Campaign ID: ${result.campaignId}\n` +
                                            `🎯 Ad Set ID: ${result.adSetId}\n` +
                                            `📢 Ad ID: ${result.adId}\n\n` +
                                            `Kiểm tra trong Facebook Ads Manager nhé!`
                                        );
                                    }
                                } catch (error) {
                                    addMessage('assistant', `❌ Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`);
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                            onCancel={() => {
                                customAudienceFlow.reset();
                                addMessage('assistant', '🔄 Đã hủy. Anh có thể thử lại với chiến dịch khác nhé!');
                            }}
                            isLoading={isLoading}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
