import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, MapPin, Target, MessageSquare, Sparkles, ChevronRight, ChevronDown, Info, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickCreativeConfirmCardProps {
  parsedData: any;
  userMessage?: string;
  uploadedHash?: string;
  uploadedVideoId?: string;
  customAudienceIds?: string[];
  onContinue: () => void;
  onCancel: () => void;
}

export function QuickCreativeConfirmCard({ parsedData, userMessage, uploadedHash, uploadedVideoId, customAudienceIds, onContinue, onCancel }: QuickCreativeConfirmCardProps) {
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Format location display
  const getLocationDisplay = () => {
    if (!parsedData.locations || parsedData.locations.length === 0) {
      return '📍 Chưa xác định vị trí';
    }

    const loc = parsedData.locations[0];

    // Check if it's coordinates
    if (typeof loc === 'string' && /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(loc.trim())) {
      const [lat, lng] = loc.split(',').map(s => parseFloat(s.trim()));
      const radius = parsedData.locationRadius || 10;
      return `📍 ${lat.toFixed(6)}, ${lng.toFixed(6)} • Bán kính: ${radius}km`;
    }

    // Check if it's a resolved location object with coordinates
    if (loc.latitude && loc.longitude) {
      const radius = parsedData.locationRadius || loc.radius || 10;
      return `📍 ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)} • Bán kính: ${radius}km`;
    }

    // Check if it's a city
    if (loc.name) {
      const radius = parsedData.locationRadius || loc.radius || loc.minRadiusKm || 17;
      return `🏙️ ${loc.name} (Bán kính: ${radius} km)`;
    }

    // Country
    if (loc.type === 'country' || loc === 'Việt Nam' || loc === 'Vietnam' || loc === 'VN') {
      return `🇻🇳 Việt Nam (toàn quốc)`;
    }

    // City as string with radius
    if (typeof loc === 'string' && parsedData.locationRadius) {
      return `🏙️ ${loc} • Bán kính: ${parsedData.locationRadius}km`;
    }

    return `📍 ${loc}`;
  };

  // Format gender display
  const getGenderDisplay = () => {
    if (parsedData.gender === 'male' || parsedData.gender === 1) return 'Nam';
    if (parsedData.gender === 'female' || parsedData.gender === 2) return 'Nữ';
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
        {/* Media Ready Section */}
        {(uploadedHash || uploadedVideoId) && (
          <div
            className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-md p-2 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
            onClick={() => toggleSection('media')}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="font-semibold text-[10px] text-emerald-900 dark:text-emerald-100 whitespace-nowrap">Media:</span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 truncate">
                  {uploadedVideoId ? 'Video đã upload' : 'Ảnh đã upload'}
                </span>
              </div>
              {expandedSection === 'media' ? <ChevronDown className="h-3 w-3 text-emerald-500" /> : <ChevronRight className="h-3 w-3 text-emerald-500" />}
            </div>

            {expandedSection === 'media' && (
              <div className="mt-2 pl-5.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                {uploadedVideoId ? '🎥 Video đã upload thành công' : '🖼️ Ảnh đã upload thành công'}
              </div>
            )}
          </div>
        )}

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
                {parsedData.campaignName || 'Chưa xác định'} • {(() => {
                  if (String(parsedData.budgetType || '').toLowerCase() === 'lifetime') {
                    const budget = (parsedData.lifetimeBudget || parsedData.budget) / 1000000;
                    const formattedBudget = budget % 1 === 0 ? budget.toFixed(0) : budget.toFixed(1);
                    return `${formattedBudget}tr trọn đời`;
                  }
                  return parsedData.budget ? `${parsedData.budget.toLocaleString('vi-VN')}đ/ngày` : '0đ';
                })()}
              </span>
            </div>
            {expandedSection === 'basic' ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>

          {expandedSection === 'basic' && (
            <div className="mt-2 pl-5.5 grid grid-cols-2 gap-x-2 gap-y-1">
              <div>
                <p className="text-[10px] text-muted-foreground">Tên chiến dịch</p>
                <p className="font-medium text-xs truncate">{parsedData.campaignName || 'Chưa xác định'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Ngân sách</p>
                <p className="font-medium text-xs text-primary">
                  {String(parsedData.budgetType || '').toLowerCase() === 'lifetime'
                    ? `${(parsedData.lifetimeBudget || parsedData.budget || 0).toLocaleString('vi-VN')}đ trọn đời`
                    : parsedData.budget ? `${parsedData.budget.toLocaleString('vi-VN')}đ/ngày` : 'Chưa xác định'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Độ tuổi</p>
                <p className="font-medium text-xs">
                  {parsedData.ageMin || 18} - {parsedData.ageMax || 65} tuổi
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Giới tính</p>
                <p className="font-medium text-xs">{getGenderDisplay()}</p>
              </div>

              {/* Date & Schedule info for LIFETIME budget */}
              {String(parsedData.budgetType || '').toLowerCase() === 'lifetime' && parsedData.startTime && parsedData.endTime && (
                <>
                  <div className="col-span-2">
                    <p className="text-[10px] text-muted-foreground">Thời gian</p>
                    <p className="font-medium text-xs truncate">
                      {new Date(parsedData.startTime).toLocaleDateString('vi-VN')} - {new Date(parsedData.endTime).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  {parsedData.scheduleSlots && parsedData.scheduleSlots.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-muted-foreground">Lịch chạy</p>
                      <p className="font-medium text-xs truncate">
                        {parsedData.scheduleSlots.length > 3
                          ? `${parsedData.scheduleSlots.length} khung giờ`
                          : parsedData.scheduleSlots.map((s: any) => `${s.startHour}h-${s.endHour}h`).join(', ')}
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

        {/* Interests Section */}
        {parsedData.interests && parsedData.interests.length > 0 && (
          <div
            className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-md p-2 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            onClick={() => toggleSection('interests')}
          >
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="font-semibold text-[10px] text-purple-900 dark:text-purple-100 whitespace-nowrap">Sở thích:</span>
                <span className="text-[10px] text-purple-700 dark:text-purple-300 truncate">
                  {parsedData.interests.length} sở thích được chọn
                </span>
              </div>
              {expandedSection === 'interests' ? <ChevronDown className="h-3 w-3 text-purple-500" /> : <ChevronRight className="h-3 w-3 text-purple-500" />}
            </div>

            {expandedSection === 'interests' && (
              <div className="mt-2 pl-5.5">
                <div className="flex flex-wrap gap-1.5">
                  {parsedData.interests.map((interest: any) => (
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

        {/* Ad Content Section */}
        {parsedData.adContent && (
          <div
            className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md p-2 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            onClick={() => toggleSection('content')}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="font-semibold text-[10px] text-green-900 dark:text-green-100 whitespace-nowrap">Nội dung:</span>
                <span className="text-[10px] text-green-700 dark:text-green-300 truncate">
                  {parsedData.adHeadline || parsedData.adContent}
                </span>
              </div>
              {expandedSection === 'content' ? <ChevronDown className="h-3 w-3 text-green-500" /> : <ChevronRight className="h-3 w-3 text-green-500" />}
            </div>

            {expandedSection === 'content' && (
              <div className="mt-2 pl-5.5 space-y-2">
                {parsedData.adHeadline && (
                  <div>
                    <p className="text-[10px] text-green-700 dark:text-green-300 uppercase font-semibold mb-0.5">
                      Tiêu đề:
                    </p>
                    <p className="text-xs text-green-900 dark:text-green-100 font-medium">
                      {parsedData.adHeadline}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-green-700 dark:text-green-300 uppercase font-semibold mb-0.5">
                    Nội dung:
                  </p>
                  <p className="text-xs text-green-800 dark:text-green-200 leading-relaxed whitespace-pre-wrap">
                    {parsedData.adContent}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messaging Features Section */}
        {(parsedData.greetingText || (parsedData.iceBreakerQuestions && parsedData.iceBreakerQuestions.length > 0)) && (
          <div
            className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-2 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            onClick={() => toggleSection('messaging')}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="font-semibold text-[10px] text-amber-900 dark:text-amber-100 whitespace-nowrap">Tin nhắn:</span>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 truncate">
                  {parsedData.greetingText ? 'Có lời chào' : ''}
                  {parsedData.greetingText && parsedData.iceBreakerQuestions?.length > 0 ? ' & ' : ''}
                  {parsedData.iceBreakerQuestions?.length > 0 ? `${parsedData.iceBreakerQuestions.length} câu hỏi` : ''}
                </span>
              </div>
              {expandedSection === 'messaging' ? <ChevronDown className="h-3 w-3 text-amber-500" /> : <ChevronRight className="h-3 w-3 text-amber-500" />}
            </div>

            {expandedSection === 'messaging' && (
              <div className="mt-2 pl-5.5 space-y-2">
                {parsedData.greetingText && (
                  <div>
                    <p className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-semibold mb-1">
                      Lời chào tự động:
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-200 italic">
                      "{parsedData.greetingText}"
                    </p>
                  </div>
                )}

                {parsedData.iceBreakerQuestions && parsedData.iceBreakerQuestions.length > 0 && (
                  <div>
                    <p className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-semibold mb-1">
                      Câu hỏi gợi ý ({parsedData.iceBreakerQuestions.length}):
                    </p>
                    <ul className="space-y-1">
                      {parsedData.iceBreakerQuestions.map((q: string, idx: number) => (
                        <li key={idx} className="text-xs text-amber-800 dark:text-amber-200 flex items-start">
                          <span className="mr-1.5">•</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Custom Audience Section */}
        {customAudienceIds && customAudienceIds.length > 0 && (
          <div
            className="bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800 rounded-md p-2 cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors"
            onClick={() => toggleSection('audience')}
          >
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400 flex-shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="font-semibold text-[10px] text-pink-900 dark:text-pink-100 whitespace-nowrap">Tệp đối tượng:</span>
                <span className="text-[10px] text-pink-700 dark:text-pink-300 truncate">
                  {customAudienceIds.length} tệp được chọn
                </span>
              </div>
              {expandedSection === 'audience' ? <ChevronDown className="h-3 w-3 text-pink-500" /> : <ChevronRight className="h-3 w-3 text-pink-500" />}
            </div>

            {expandedSection === 'audience' && (
              <div className="mt-2 pl-5.5 text-[10px] text-pink-700 dark:text-pink-300">
                {customAudienceIds.map((id, idx) => (
                  <p key={idx}>• ID: {id}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-2 p-3">
        <Button
          onClick={onContinue}
          size="sm"
          className="flex-1 bg-primary hover:bg-primary/90 text-xs h-8"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          Xác nhận & Tạo
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          size="sm"
          className="text-xs h-8 px-3"
        >
          Hủy
        </Button>
      </CardFooter>
    </Card>
  );
}
