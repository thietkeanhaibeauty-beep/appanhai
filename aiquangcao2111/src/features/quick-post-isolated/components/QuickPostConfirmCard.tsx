import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, MapPin, Facebook, Target, ExternalLink, ChevronRight, ChevronDown, Info, Image, Video, Upload, Type, FileText } from "lucide-react";
import { ParsedCampaignData } from "../types";

interface QuickPostConfirmCardProps {
  data: ParsedCampaignData;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  onMediaUpload?: (file: File) => void;
}

export function QuickPostConfirmCard({ data, onConfirm, onCancel, isLoading, onMediaUpload }: QuickPostConfirmCardProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Format location display based on type
  const getLocationDisplay = () => {
    // ✅ Prefer explicit coordinates
    if ((data.locationType === 'coordinate' || (data.latitude && data.longitude)) && data.latitude && data.longitude) {
      return `📍 ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)} • Bán kính: ${data.radiusKm ?? 10} km`;
    }

    // ✅ Heuristic: coordinates embedded inside location[0]
    if (data.location && data.location.length > 0) {
      const loc: any = data.location[0];
      const coordFromKey = typeof loc.key === 'string' && loc.key.includes(',') ? loc.key : undefined;
      const coordFromName = typeof loc.name === 'string' && /-?\d+\.\d+\s*,\s*-?\d+\.\d+/.test(loc.name) ? loc.name : undefined;
      const coordStr = coordFromKey || coordFromName;
      if (loc.type === 'coordinates' || coordStr) {
        const [latStr, lngStr] = (coordStr || '').replace(/\s+/g, '').split(',');
        const lat = Number(latStr);
        const lng = Number(lngStr);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          const radius = data.radiusKm ?? loc.radius ?? 10;
          return `📍 ${lat.toFixed(6)}, ${lng.toFixed(6)} • Bán kính: ${radius} km`;
        }
      }
    }

    if (data.locationType === 'city' && data.location && data.location.length > 0) {
      const city = data.location[0] as any;
      const radius = data.radiusKm ?? (city as any).radius ?? (city as any).minRadiusKm ?? 17;
      return `🏙️ ${city.name} (Bán kính: ${radius} km)`;
    }

    if (data.locationType === 'country') {
      return `🇻🇳 Việt Nam (toàn quốc)`;
    }

    return '📍 Chưa xác định vị trí';
  };

  // Format gender display
  const getGenderDisplay = () => {
    if (data.gender === 'male') return 'Nam';
    if (data.gender === 'female') return 'Nữ';
    return 'Tất cả';
  };

  return (
    <Card className="w-full max-w-[256px] shadow-md border-primary/20">
      <CardHeader className="pb-1 pt-2 sm:pb-2 sm:pt-3">
        <CardTitle className="flex items-center gap-1.5 text-xs sm:text-sm leading-tight">
          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
          <span className="truncate">Xác nhận thông tin chiến dịch</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2 p-3 pt-0">
        {/* Basic Information */}
        <div
          className="bg-muted/50 border border-border rounded-md p-2 cursor-pointer hover:bg-muted transition-colors"
          onClick={() => toggleSection('basic')}
        >
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0 flex items-center gap-1">
              <span className="font-semibold text-[10px] text-muted-foreground whitespace-nowrap">Thông tin:</span>
              <span className="text-[10px] text-foreground truncate">
                {data.name} • {(() => {
                  if (String(data.budgetType || '').toLowerCase() === 'lifetime' && (data.lifetimeBudget || data.budget)) {
                    const budget = (data.lifetimeBudget || data.budget || 0) / 1000000;
                    const formattedBudget = budget % 1 === 0 ? budget.toFixed(0) : budget.toFixed(1);
                    return `${formattedBudget}tr trọn đời`;
                  }
                  return data.budget ? `${data.budget.toLocaleString('vi-VN')}đ/ngày` : '0đ';
                })()}
              </span>
            </div>
            {expandedSection === 'basic' ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>

          {expandedSection === 'basic' && (
            <div className="mt-2 pl-5.5 grid grid-cols-2 gap-x-2 gap-y-1">
              <div>
                <p className="text-[10px] text-muted-foreground">Tên chiến dịch</p>
                <p className="font-medium text-xs truncate">{data.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Ngân sách</p>
                <p className="font-medium text-xs text-primary">
                  {String(data.budgetType || '').toLowerCase() === 'lifetime' && (data.lifetimeBudget || data.budget)
                    ? `${(data.lifetimeBudget || data.budget || 0).toLocaleString('vi-VN')}đ trọn đời`
                    : data.budget ? `${data.budget.toLocaleString('vi-VN')}đ/ngày` : 'Chưa xác định'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Độ tuổi</p>
                <p className="font-medium text-xs">
                  {data.age?.min || 18} - {data.age?.max || 65} tuổi
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Giới tính</p>
                <p className="font-medium text-xs">{getGenderDisplay()}</p>
              </div>

              {/* ✅ Date & Schedule info for LIFETIME budget */}
              {String(data.budgetType || '').toLowerCase() === 'lifetime' && data.startTime && data.endTime && (
                <>
                  <div className="col-span-2">
                    <p className="text-[10px] text-muted-foreground">Thời gian</p>
                    <p className="font-medium text-xs truncate">
                      {new Date(data.startTime).toLocaleDateString('vi-VN')} - {new Date(data.endTime).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  {data.scheduleSlots && data.scheduleSlots.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-muted-foreground">Lịch chạy</p>
                      <p className="font-medium text-xs truncate">
                        {data.scheduleSlots.length > 3
                          ? `${data.scheduleSlots.length} khung giờ`
                          : data.scheduleSlots.map((s: any) => `${s.startHour}h-${s.endHour}h`).join(', ')}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Location Section */}
        <div
          className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          onClick={() => toggleSection('location')}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0 flex items-center gap-1">
              <span className="font-semibold text-[10px] text-blue-900 dark:text-blue-100 whitespace-nowrap">Vị trí:</span>
              <span className="text-[10px] text-blue-700 dark:text-blue-300 truncate">{getLocationDisplay()}</span>
            </div>
            {expandedSection === 'location' ? <ChevronDown className="h-3 w-3 text-blue-500" /> : <ChevronRight className="h-3 w-3 text-blue-500" />}
          </div>

          {expandedSection === 'location' && (
            <div className="mt-2 pl-5.5 text-[10px] text-blue-800 dark:text-blue-200">
              {getLocationDisplay()}
            </div>
          )}
        </div>

        {/* Facebook Post Section */}
        {data.postUrl && (
          <div
            className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md p-2 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            onClick={() => toggleSection('post')}
          >
            <div className="flex items-center gap-2">
              <Facebook className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="font-semibold text-[10px] text-green-900 dark:text-green-100 whitespace-nowrap">Post:</span>
                <span className="text-[10px] text-green-700 dark:text-green-300 truncate">
                  {data.resolvedPostId ? `ID ${data.resolvedPostId}` : data.postUrl}
                </span>
              </div>
              {expandedSection === 'post' ? <ChevronDown className="h-3 w-3 text-green-500" /> : <ChevronRight className="h-3 w-3 text-green-500" />}
            </div>

            {expandedSection === 'post' && (
              <div className="mt-2 pl-5.5 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200 text-[9px] px-1 py-0 h-4">
                    <CheckCircle2 className="h-2 w-2 mr-0.5" />
                    HIGH
                  </Badge>
                  <a
                    href={data.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Xem bài viết <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                {data.resolvedPostId && (
                  <p className="text-[9px] text-green-700 dark:text-green-300 font-mono break-all">
                    ID: {data.resolvedPostId}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Interests Section */}
        {data.interests && data.interests.length > 0 && (
          <div
            className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-md p-2 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            onClick={() => toggleSection('interests')}
          >
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="font-semibold text-[10px] text-purple-900 dark:text-purple-100 whitespace-nowrap">Sở thích:</span>
                <span className="text-[10px] text-purple-700 dark:text-purple-300 truncate">
                  {data.interests.length} sở thích được chọn
                </span>
              </div>
              {expandedSection === 'interests' ? <ChevronDown className="h-3 w-3 text-purple-500" /> : <ChevronRight className="h-3 w-3 text-purple-500" />}
            </div>

            {expandedSection === 'interests' && (
              <div className="mt-2 pl-5.5">
                <div className="flex flex-wrap gap-1.5">
                  {data.interests.map((interest) => (
                    <Badge
                      key={interest.id}
                      variant="secondary"
                      className="bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-[9px] px-1.5 py-0"
                    >
                      {interest.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Audiences Section */}
        {(data as any).customAudienceNames && (data as any).customAudienceNames.length > 0 && (
          <div
            className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md p-2 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
            onClick={() => toggleSection('audiences')}
          >
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="font-semibold text-[10px] text-orange-900 dark:text-orange-100 whitespace-nowrap">Tệp đối tượng:</span>
                <span className="text-[10px] text-orange-700 dark:text-orange-300 truncate">
                  {(data as any).customAudienceNames.length} tệp được chọn
                </span>
              </div>
              {expandedSection === 'audiences' ? <ChevronDown className="h-3 w-3 text-orange-500" /> : <ChevronRight className="h-3 w-3 text-orange-500" />}
            </div>

            {expandedSection === 'audiences' && (
              <div className="mt-2 pl-5.5">
                <div className="flex flex-wrap gap-1.5">
                  {(data as any).customAudienceNames.map((name: string, idx: number) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-[9px] px-1.5 py-0"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-2 p-3">
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          size="sm"
          className="flex-1 bg-primary hover:bg-primary/90 text-xs h-8"
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-1.5">⏳</span>
              Đang tạo...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Xác nhận & Tạo
            </>
          )}
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          disabled={isLoading}
          size="sm"
          className="text-xs h-8 px-3"
        >
          Hủy
        </Button>
      </CardFooter>
    </Card>
  );
}
