// AI Chat Creative Orchestrator Service - Điều phối tạo QC tin nhắn mới từ AI Chat
import { supabase } from "@/integrations/supabase/client";
import * as quickCreativeService from "./quickCreativeService";
import * as quickCreativeFacebookService from "./quickCreativeFacebookService";
import type { Interest } from "./quickCreativeFacebookService";

export interface ParsedCreativeData {
  campaignName: string;
  budget: number;
  ageMin: number;
  ageMax: number;
  gender: 'all' | 'male' | 'female';
  locations: string[];
  locationRadius?: number | null;
  budgetType?: 'DAILY' | 'LIFETIME';
  lifetimeBudget?: number;
  startTime?: string;
  endTime?: string;
  enableSchedule?: boolean;
  scheduleSlots?: Array<{
    days: number[];
    startHour: number;
    endHour: number;
  }>;
  // Thêm các field giống CreateQuickAd để dùng trực tiếp
  locationType?: 'coordinate' | 'country' | 'city';
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  resolvedLocation?: {
    key: string;
    name: string;
    type: string;
    country_code?: string;
    country_name?: string;
    minRadiusKm?: number;
  };
  interests: Interest[];
  adContent: string;
  adHeadline: string;
  greetingText?: string;
  iceBreakerQuestions?: string[];
}

export interface ParseCreativeResult {
  success: boolean;
  data?: ParsedCreativeData;
  needsMoreInfo?: boolean;
  missingField?: 'locationRadius' | 'media';
  missingFieldPrompt?: string;
  partialData?: any;
  error?: string;
}

type LogCallback = (message: string) => void;

/**
 * Parse và validate creative campaign từ user input
 * Tương tự aiChatOrchestratorService nhưng cho QC tin nhắn mới
 */
export const parseAndValidateCreativeCampaign = async (
  rawInput: string,
  adsToken: string,
  addLog: LogCallback,
  partialData?: any
): Promise<ParseCreativeResult> => {
  try {
    // =========================================================================
    // ⚡ FAST PATH: Detect @# template FIRST - skip AI completely
    // This ONLY runs if user input contains @#keyword
    // If no @# detected, the existing AI flow runs unchanged below
    // =========================================================================
    const templateMatch = rawInput.match(/@#([^\s,]+)/i);
    if (templateMatch) {
      const templateKeyword = `@#${templateMatch[1]}`;
      addLog(`📋 Phát hiện mẫu template: ${templateKeyword}`);
      addLog('⚡ FAST PATH: Đang load template từ database...');

      try {
        // Call parse-campaign-with-template Edge Function
        const { data: templateData, error: templateError } = await supabase.functions.invoke('parse-campaign-with-template', {
          body: { text: rawInput }
        });

        if (templateError) {
          addLog(`❌ Lỗi load template: ${templateError.message}`);
          throw new Error(`Không thể load template: ${templateError.message}`);
        }

        if (!templateData?.success) {
          const errorMsg = templateData?.error || 'Template không tìm thấy';
          addLog(`❌ ${errorMsg}`);
          throw new Error(errorMsg);
        }

        const parsed = templateData.data;
        addLog(`✅ Template loaded: ${parsed.campaignName}`);
        addLog(`   → Age: ${parsed.ageMin}-${parsed.ageMax}, Gender: ${parsed.gender}`);
        addLog(`   → Budget: ${parsed.budget}, Location: ${parsed.locationType}`);

        // Transform template data to ParsedCreativeData format
        // ✅ FIX: Build locations based on locationType
        let locations: string[] = [];
        if (parsed.locationType === 'coordinate' && parsed.latitude && parsed.longitude) {
          // Tọa độ: hiển thị lat,lng
          locations = [`${parsed.latitude}, ${parsed.longitude}`];
        } else if (parsed.cityName) {
          // Thành phố
          locations = [parsed.cityName];
        } else if (parsed.country) {
          // Quốc gia (fallback)
          locations = [parsed.country];
        }

        return {
          success: true,
          data: {
            campaignName: parsed.campaignName || 'Campaign từ Template',
            budget: parsed.budget || 200000,
            ageMin: parsed.ageMin || 18,
            ageMax: parsed.ageMax || 65,
            gender: parsed.gender || 'all',
            locations: locations,
            locationRadius: parsed.radiusKm,
            // ✅ Lifetime budget fields
            budgetType: parsed.budgetType === 'lifetime' ? 'LIFETIME' : 'DAILY',
            lifetimeBudget: parsed.lifetimeBudget,
            startTime: parsed.startTime,
            endTime: parsed.endTime,
            enableSchedule: parsed.enableSchedule,
            scheduleSlots: parsed.scheduleSlots,
            // Location fields
            locationType: parsed.locationType,
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            radiusKm: parsed.radiusKm,
            resolvedLocation: parsed.resolvedLocation,
            interests: parsed.resolvedInterests || [],
            adContent: parsed.content || '',
            adHeadline: parsed.headline || 'Chat với chúng tôi',
            greetingText: parsed.greetingTemplate,
            iceBreakerQuestions: parsed.frequentQuestions
          }
        };
      } catch (templateError: any) {
        addLog(`❌ Template error: ${templateError.message}`);
        // Don't fallback to AI - user explicitly wanted template
        return {
          success: false,
          error: templateError.message
        };
      }
    }

    // =========================================================================
    // 🐢 SLOW PATH: No @# template detected - use existing AI parsing
    // This code is UNCHANGED from original
    // =========================================================================
    addLog('🤖 Đang phân tích thông tin với AI...');

    // STEP 1: Parse với AI
    const parsed = await quickCreativeService.parseQuickCreativePrompt(rawInput);
    addLog(`✅ Phân tích AI xong: ${parsed.campaignName}`);

    // STEP 1.1: Chuẩn hóa locationRadius về số (hỗ trợ "17", "17km", "17 km")
    const normalizeRadius = (val: any): number | null => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'number' && !isNaN(val)) return val;
      const m = String(val).match(/([\d]+(?:\.\d+)?)/);
      const num = m ? parseFloat(m[1]) : NaN;
      return isNaN(num) ? null : num;
    };
    const normalizedRadius = normalizeRadius(parsed.locationRadius);

    // ✅ STEP 1.5: Check date validation error from AI parsing
    if ((parsed as any)._dateError) {
      addLog(`❌ Lỗi ngày: ${(parsed as any)._dateError}`);
      return {
        success: false,
        error: (parsed as any)._dateError,
        needsMoreInfo: true,
        missingField: 'locationRadius', // Hack to trigger info request, though it's actually date error
        missingFieldPrompt: (parsed as any)._dateError,
        partialData: parsed
      };
    }

    // STEP 2: Validate interests - CHỈ LẤY 1 GỢI Ý ĐẦU TIÊN cho mỗi keyword
    addLog(`🔍 Đang tìm kiếm ${parsed.interestKeywords.length} sở thích...`);

    const interests: Interest[] = [];

    for (const keyword of parsed.interestKeywords) {
      const results = await quickCreativeFacebookService.searchInterests(keyword, adsToken);
      if (results && results.length > 0) {
        interests.push(results[0]); // Chỉ lấy kết quả đầu tiên (gần nhất)
        addLog(`✅ "${keyword}" → ${results[0].name}`);
      } else {
        addLog(`⚠️ "${keyword}" không có kết quả`);
      }
    }

    addLog(`✅ Tìm thấy ${interests.length} sở thích`);

    // STEP 2.5: Resolve location key nếu là city (gọi search-facebook-locations)
    let resolvedLocation: any = null;

    if (parsed.locations && parsed.locations.length > 0) {
      const firstLoc = parsed.locations[0].trim();

      // Detect THÀNH PHỐ (không phải tọa độ, không phải quốc gia)
      const coordMatch = firstLoc.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
      const isCountry = /^(việt nam|vietnam|vn)$/i.test(firstLoc);

      if (!coordMatch && !isCountry) {
        // Đây là thành phố → cần resolve location key
        addLog(`🔍 Đang tìm kiếm vị trí: ${firstLoc}...`);

        try {
          const locationResults = await quickCreativeFacebookService.searchLocations(firstLoc, adsToken);
          if (locationResults && locationResults.length > 0) {
            // Ưu tiên type="city", không có thì lấy kết quả đầu
            const bestMatch = locationResults.find((loc: any) => loc.type === 'city') || locationResults[0];
            resolvedLocation = {
              key: bestMatch.key, // Đây là location key (số) từ Facebook
              name: bestMatch.name,
              type: bestMatch.type,
              country_code: bestMatch.country_code,
              country_name: bestMatch.country_name,
              minRadiusKm: 17
            };
            addLog(`✅ Tìm thấy: ${bestMatch.name} (key: ${bestMatch.key})`);
          } else {
            addLog(`⚠️ Không tìm thấy vị trí "${firstLoc}"`);
          }
        } catch (error: any) {
          addLog(`❌ Lỗi tìm kiếm vị trí: ${error.message}`);
        }
      }
    }

    // STEP 3: Kiểm tra media (nếu không có file attached)
    // Lưu ý: Logic này sẽ được check từ frontend, orchestrator chỉ validate data

    // STEP 4: Kiểm tra locationRadius
    if (parsed.locations.length > 0 && (parsed.locationRadius === null || parsed.locationRadius === undefined)) {
      addLog('⚠️ Thiếu thông tin bán kính targeting');

      const locationNames = parsed.locations.join(', ');

      // Detect TỌA ĐỘ (latitude, longitude)
      const isCoordinate = parsed.locations.some(loc =>
        /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(loc.trim())
      );

      // Detect QUỐC GIA (Việt Nam, Vietnam, VN)
      const isCountry = parsed.locations.some(loc =>
        /^(việt nam|vietnam|vn)$/i.test(loc.trim())
      );

      // DẠNG 1: Quốc gia → KHÔNG cần hỏi radius
      if (isCountry) {
        addLog('✅ Quốc gia Việt Nam → Không cần bán kính');
        // Tiếp tục mà không cần locationRadius
      }
      // DẠNG 3: Tọa độ → CẦN hỏi radius (min 1km)
      else if (isCoordinate) {
        addLog('⚠️ Tọa độ thiếu bán kính → Hỏi user (min 1km)');
        return {
          success: false,
          needsMoreInfo: true,
          missingField: 'locationRadius',
          missingFieldPrompt:
            `📍 Anh cho em biết **bán kính targeting** bao nhiêu km ạ?\n\n` +
            `📌 Vị trí: ${locationNames}\n` +
            `🎯 Tọa độ\n` +
            `⚠️ Bán kính tối thiểu **1km**\n` +
            `💡 Ví dụ: 5, 10, 15`,
          partialData: {
            ...parsed,
            interests: interests
          }
        };
      }
      // DẠNG 2: Thành phố → CẦN hỏi radius (min 17km)
      else {
        addLog('⚠️ Thành phố thiếu bán kính → Hỏi user (min 17km)');
        return {
          success: false,
          needsMoreInfo: true,
          missingField: 'locationRadius',
          missingFieldPrompt:
            `📍 Anh cho em biết **bán kính targeting** bao nhiêu km ạ?\n\n` +
            `📌 Vị trí: ${locationNames}\n` +
            `🏙️ Thành phố/địa điểm\n` +
            `⚠️ Bán kính tối thiểu **17km**\n` +
            `💡 Ví dụ: 20, 30, 50`,
          partialData: {
            ...parsed,
            // Quan trọng: trả về để frontend dùng đúng city key
            locationType: 'city',
            resolvedLocation: resolvedLocation || undefined,
            interests: interests
          }
        };
      }
    }

    // STEP 4: Validate locationRadius nếu có
    if (normalizedRadius !== null && normalizedRadius !== undefined) {
      // Detect QUỐC GIA
      const isCountry = parsed.locations.some(loc =>
        /^(việt nam|vietnam|vn)$/i.test(loc.trim())
      );

      // Nếu là quốc gia → KHÔNG validate radius (sẽ bỏ qua radius)
      if (!isCountry) {
        // Detect TỌA ĐỘ
        const isCoordinate = parsed.locations.some(loc =>
          /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(loc.trim())
        );

        // Phân biệt tọa độ (1km) vs thành phố (17km)
        const minRadius = isCoordinate ? 1 : 17;
        const locationType = isCoordinate ? '🎯 Tọa độ' : '🏙️ Thành phố/địa điểm';
        const radiusNote = isCoordinate
          ? 'tọa độ quy định là **1km trở lên**'
          : 'thành phố bán kính phải từ **17km trở lên**';

        addLog(`📍 Validate: ${locationType} → Min: ${minRadius}km, Got: ${normalizedRadius}km`);

        if (normalizedRadius < minRadius) {
          addLog(`⚠️ Bán kính ${normalizedRadius}km < ${minRadius}km (tối thiểu)`);
          return {
            success: false,
            needsMoreInfo: true,
            missingField: 'locationRadius',
            missingFieldPrompt:
              `⚠️ Bán kính **${normalizedRadius}km** quá nhỏ!\n\n` +
              `📍 Vị trí: ${parsed.locations.join(', ')}\n` +
              `${locationType}\n` +
              `⚠️ Theo Facebook, ${radiusNote}\n\n` +
              `Anh vui lòng nhập lại bán kính mới nhé!\n` +
              `💡 Ví dụ: ${isCoordinate ? '5' : '20'}`,
            partialData: {
              ...parsed,
              locationRadius: normalizedRadius,
              interests: interests
            }
          };
        }

        addLog(`✅ Bán kính ${normalizedRadius}km hợp lệ (>= ${minRadius}km)`);
      } else {
        addLog('✅ Target quốc gia → Bỏ qua bán kính');
      }
    }

    // STEP 5: Normalize gender
    let normalizedGender: 'all' | 'male' | 'female' = 'all';
    if (parsed.gender === 'male') normalizedGender = 'male';
    else if (parsed.gender === 'female') normalizedGender = 'female';

    // STEP 6: Parse location thành locationType, latitude, longitude (giống CreateQuickAd.tsx)
    let locationType: 'coordinate' | 'country' | 'city' | undefined;
    let latitude: number | undefined;
    let longitude: number | undefined;
    let radiusKm: number | undefined = normalizedRadius || undefined;

    if (parsed.locations && parsed.locations.length > 0) {
      const firstLoc = parsed.locations[0].trim();

      // Detect TỌA ĐỘ
      const coordMatch = firstLoc.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        locationType = 'coordinate';
        latitude = parseFloat(coordMatch[1]);
        longitude = parseFloat(coordMatch[2]);
        radiusKm = normalizedRadius || 17; // Default 17km for coordinates if not provided
        addLog(`✅ Phát hiện tọa độ: ${latitude}, ${longitude}, radius: ${radiusKm}km`);
      }
      // Detect QUỐC GIA
      else if (/^(việt nam|vietnam|vn)$/i.test(firstLoc)) {
        locationType = 'country';
        resolvedLocation = {
          key: 'VN',
          name: 'Vietnam',
          type: 'country',
          country_code: 'VN',
          country_name: 'Vietnam'
        };
        addLog(`✅ Phát hiện quốc gia: ${firstLoc} (Mã: VN)`);
      }
      // Còn lại: THÀNH PHỐ
      else {
        locationType = 'city';
        addLog(`✅ Phát hiện thành phố: ${firstLoc}`);
      }
    }

    // STEP 7: Return success với đầy đủ data
    addLog('✅ Validation hoàn tất!');

    return {
      success: true,
      data: {
        campaignName: parsed.campaignName,
        budget: parsed.budget,
        ageMin: parsed.ageMin,
        ageMax: parsed.ageMax,
        gender: normalizedGender,
        budgetType: parsed.budgetType || 'DAILY',
        lifetimeBudget: parsed.lifetimeBudget,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        enableSchedule: parsed.enableSchedule,
        scheduleSlots: parsed.scheduleSlots,
        locations: parsed.locations,
        locationRadius: normalizedRadius,
        // Thêm các field mới giống CreateQuickAd
        locationType,
        latitude,
        longitude,
        radiusKm,
        // Thêm resolvedLocation để có location key
        resolvedLocation: resolvedLocation || undefined,
        interests: interests,
        adContent: parsed.adContent,
        adHeadline: parsed.adHeadline,
        greetingText: parsed.greetingText,
        iceBreakerQuestions: parsed.iceBreakerQuestions
      }
    };

  } catch (error: any) {
    console.error('[Creative Orchestrator] Error:', error);
    addLog(`❌ Lỗi: ${error.message}`);

    return {
      success: false,
      error: error.message || 'Lỗi không xác định'
    };
  }
};
