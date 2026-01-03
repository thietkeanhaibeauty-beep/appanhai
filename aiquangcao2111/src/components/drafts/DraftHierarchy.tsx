
import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, MoreHorizontal, Folder, Layers, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock Types
export interface DraftAd {
    id: string;
    originalId: string;
    name: string;
    creativeType: 'EXISTING_POST' | 'NEW_CREATIVE';
    creativeData?: {
        headline: string;
        content: string;
        greeting: string;
        faqs: string[];
    };
}

export interface DraftAdSet {
    id: string;
    originalId: string;
    name: string;
    ads: DraftAd[];
    budget?: string;
    targeting?: any; // Allow flexible targeting structure from NocoDB/AI
}

export interface DraftCampaign {
    id: string;
    originalId: string;
    name: string;
    adSets: DraftAdSet[];
}

import { Checkbox } from '@/components/ui/checkbox';

interface DraftHierarchyProps {
    campaigns: DraftCampaign[];
    onAddCampaign: () => void;
    selectedIds: Set<string>;
    onToggleSelect: (id: string, type: 'CAMPAIGN' | 'ADSET' | 'AD') => void;
    onSelectAll?: () => void;
}

export const DraftHierarchy: React.FC<DraftHierarchyProps> = ({ campaigns, onAddCampaign, selectedIds, onToggleSelect, onSelectAll }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold">Cấu trúc Chiến dịch</h3>
                    {onSelectAll && (
                        <Button variant="outline" size="sm" onClick={onSelectAll} className="h-8">
                            Chọn tất cả
                        </Button>
                    )}
                </div>
                <Button onClick={onAddCampaign} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Thêm Chiến dịch
                </Button>
            </div>

            <div className="border rounded-lg bg-card">
                {campaigns.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        Chưa có chiến dịch nào trong danh mục này.
                    </div>
                ) : (
                    <div className="divide-y">
                        {campaigns.map(campaign => (
                            <div key={campaign.id} className="p-2">
                                {/* Campaign Row */}
                                <div className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-md group">
                                    <Checkbox
                                        checked={selectedIds.has(campaign.id)}
                                        onCheckedChange={() => onToggleSelect(campaign.id, 'CAMPAIGN')}
                                        className="mr-2"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => toggleExpand(campaign.id)}
                                    >
                                        {expanded[campaign.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                    <Folder className="h-4 w-4 text-blue-500" />
                                    <span className="font-medium flex-1">{campaign.name}</span>
                                    <Badge variant="outline" className="mr-2">Chiến dịch</Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>Thêm Nhóm QC</DropdownMenuItem>
                                            <DropdownMenuItem>Chỉnh sửa</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive">Xóa</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Ad Sets */}
                                {expanded[campaign.id] && (
                                    <div className="ml-6 border-l-2 border-muted pl-2 mt-1 space-y-1">
                                        {campaign.adSets.map(adSet => (
                                            <div key={adSet.id}>
                                                <div className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-md group">
                                                    <Checkbox
                                                        checked={selectedIds.has(adSet.id)}
                                                        onCheckedChange={() => onToggleSelect(adSet.id, 'ADSET')}
                                                        className="mr-2"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => toggleExpand(adSet.id)}
                                                    >
                                                        {expanded[adSet.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    </Button>
                                                    <Layers className="h-4 w-4 text-purple-500" />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{adSet.name}</div>
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {adSet.budget && (
                                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-green-100 text-green-800 hover:bg-green-200">
                                                                    Ngân sách: {parseInt(adSet.budget).toLocaleString('vi-VN')}đ
                                                                </Badge>
                                                            )}
                                                            {adSet.targeting && (
                                                                <>
                                                                    {(adSet.targeting.age_min || adSet.targeting.age) && (
                                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                                                            Tuổi: {adSet.targeting.age || `${adSet.targeting.age_min}-${adSet.targeting.age_max}`}
                                                                        </Badge>
                                                                    )}
                                                                    {(adSet.targeting.genders || adSet.targeting.gender) && (
                                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                                                            Giới tính: {adSet.targeting.gender || (adSet.targeting.genders?.includes(1) ? 'Nam' : adSet.targeting.genders?.includes(2) ? 'Nữ' : 'Tất cả')}
                                                                        </Badge>
                                                                    )}
                                                                    {/* Handle Radius from geo_locations or direct radius field */}
                                                                    {(adSet.targeting.radius || adSet.targeting.geo_locations?.cities?.[0]?.radius) && (
                                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                                                            Bán kính: {adSet.targeting.radius || adSet.targeting.geo_locations?.cities?.[0]?.radius} km
                                                                        </Badge>
                                                                    )}
                                                                    {adSet.targeting.interests && (
                                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                                                            Sở thích: {Array.isArray(adSet.targeting.interests)
                                                                                ? adSet.targeting.interests.map((i: any) => i.name).join(', ')
                                                                                : adSet.targeting.interests}
                                                                        </Badge>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Badge variant="secondary" className="mr-2 text-xs">Nhóm QC</Badge>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem>Thêm Quảng cáo</DropdownMenuItem>
                                                            <DropdownMenuItem>Chỉnh sửa</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive">Xóa</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>

                                                {/* Ads */}
                                                {expanded[adSet.id] && (
                                                    <div className="ml-6 border-l-2 border-muted pl-2 mt-1 space-y-1">
                                                        {adSet.ads.map(ad => (
                                                            <div key={ad.id}>
                                                                <div className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-md group">
                                                                    <div className="w-6" /> {/* Spacer for indentation */}
                                                                    <Checkbox
                                                                        checked={selectedIds.has(ad.id)}
                                                                        onCheckedChange={() => onToggleSelect(ad.id, 'AD')}
                                                                        className="mr-2"
                                                                    />
                                                                    <ImageIcon className="h-4 w-4 text-green-500" />
                                                                    <div className="flex-1">
                                                                        <span className="text-sm font-medium">{ad.name}</span>
                                                                        {ad.creativeData && (
                                                                            <div className="mt-1 text-xs text-muted-foreground bg-muted/50 p-2 rounded border">
                                                                                <div className="font-semibold text-primary mb-1">{ad.creativeData.headline}</div>
                                                                                <div className="line-clamp-2 mb-1">{ad.creativeData.content}</div>
                                                                                <div className="italic mb-1">👋 {ad.creativeData.greeting}</div>
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {ad.creativeData.faqs.map((faq, i) => (
                                                                                        <Badge key={i} variant="outline" className="text-[10px] h-4 px-1">
                                                                                            Câu hỏi {i + 1}
                                                                                        </Badge>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <Badge variant="outline" className="mr-2 text-xs">Quảng cáo</Badge>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                                                                <MoreHorizontal className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            <DropdownMenuItem>Chỉnh sửa</DropdownMenuItem>
                                                                            <DropdownMenuItem className="text-destructive">Xóa</DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
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
                )}
            </div>
        </div>
    );
};
