import { useState } from "react";
import { ChevronDown, ChevronRight, FolderOpen, Folder, Box, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchAdSetsForCampaign, fetchAdsForAdSet } from "@/services/advancedAdsService";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
}

interface AdSet {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
}

interface Ad {
  id: string;
  name: string;
  status: string;
  adset_id: string;
}

interface StructureTreeViewProps {
  campaigns: Campaign[];
  accessToken: string;
  onSelectItem: (item: { type: 'campaign' | 'adset' | 'ad'; id: string; name: string }) => void;
  selectedItem?: { type: string; id: string };
  onRefresh: () => void;
}

export function StructureTreeView({
  campaigns,
  accessToken,
  onSelectItem,
  selectedItem,
  onRefresh
}: StructureTreeViewProps) {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());
  const [adSets, setAdSets] = useState<Record<string, AdSet[]>>({});
  const [ads, setAds] = useState<Record<string, Ad[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const toggleCampaign = async (campaignId: string) => {
    const newExpanded = new Set(expandedCampaigns);
    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId);
    } else {
      newExpanded.add(campaignId);
      if (!adSets[campaignId] || adSets[campaignId].length === 0) {
        setLoading(prev => ({ ...prev, [campaignId]: true }));
        try {
          const fetchedAdSets = await fetchAdSetsForCampaign(campaignId, accessToken);

          setAdSets(prev => ({ ...prev, [campaignId]: fetchedAdSets }));
          setLoading(prev => ({ ...prev, [campaignId]: false }));
        } catch (error) {
          console.error('Error fetching ad sets:', error);
          setLoading(prev => ({ ...prev, [campaignId]: false }));
        }
      }
    }
    setExpandedCampaigns(newExpanded);
  };

  const toggleAdSet = async (adsetId: string) => {
    const newExpanded = new Set(expandedAdSets);
    if (newExpanded.has(adsetId)) {
      newExpanded.delete(adsetId);
    } else {
      newExpanded.add(adsetId);
      if (!ads[adsetId] || ads[adsetId].length === 0) {
        setLoading(prev => ({ ...prev, [adsetId]: true }));
        try {
          const fetchedAds = await fetchAdsForAdSet(adsetId, accessToken);

          setAds(prev => ({ ...prev, [adsetId]: fetchedAds }));
          setLoading(prev => ({ ...prev, [adsetId]: false }));
        } catch (error) {
          console.error('Error fetching ads:', error);
          setLoading(prev => ({ ...prev, [adsetId]: false }));
        }
      }
    }
    setExpandedAdSets(newExpanded);
  };


  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Cấu trúc Campaign</h3>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          🔄 Refresh
        </Button>
      </div>

      <ScrollArea className="h-[600px] border rounded-lg">
        <div className="p-2 space-y-1">
          {campaigns.map((campaign) => (
            <div key={campaign.id}>
              <div
                className={cn(
                  "flex items-start gap-2 p-3 rounded hover:bg-accent cursor-pointer transition-colors",
                  selectedItem?.type === 'campaign' && selectedItem?.id === campaign.id && "bg-accent"
                )}
                onClick={() => onSelectItem({ type: 'campaign', id: campaign.id, name: campaign.name })}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0 flex-shrink-0 mt-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCampaign(campaign.id);
                  }}
                >
                  {expandedCampaigns.has(campaign.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                {expandedCampaigns.has(campaign.id) ? (
                  <FolderOpen className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <Folder className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{campaign.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{campaign.id}</div>
                </div>
              </div>

              {expandedCampaigns.has(campaign.id) && adSets[campaign.id] && (
                <div className="ml-6 space-y-1 mt-1">
                  {adSets[campaign.id].map((adset) => (
                    <div key={adset.id}>
                      <div
                        className={cn(
                          "flex items-start gap-2 p-3 rounded hover:bg-accent cursor-pointer transition-colors",
                          selectedItem?.type === 'adset' && selectedItem?.id === adset.id && "bg-accent"
                        )}
                        onClick={() => onSelectItem({ type: 'adset', id: adset.id, name: adset.name })}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 p-0 flex-shrink-0 mt-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAdSet(adset.id);
                          }}
                        >
                          {expandedAdSets.has(adset.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <Box className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{adset.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{adset.id}</div>
                        </div>
                      </div>

                      {expandedAdSets.has(adset.id) && ads[adset.id] && (
                        <div className="ml-6 space-y-1 mt-1">
                          {ads[adset.id].map((ad) => (
                            <div
                              key={ad.id}
                              className={cn(
                                "flex items-start gap-2 p-3 rounded hover:bg-accent cursor-pointer transition-colors",
                                selectedItem?.type === 'ad' && selectedItem?.id === ad.id && "bg-accent"
                              )}
                              onClick={() => onSelectItem({ type: 'ad', id: ad.id, name: ad.name })}
                            >
                              <Square className="h-3 w-3 ml-5 text-orange-600 flex-shrink-0 mt-1" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{ad.name}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{ad.id}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
