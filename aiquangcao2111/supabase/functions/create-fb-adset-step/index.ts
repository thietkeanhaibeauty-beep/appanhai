import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromRequest(req);
    const {
      campaignId,
      adSetName,
      // Budget fields - either daily or lifetime
      budgetType = 'DAILY',  // Default to DAILY for backward compatibility
      dailyBudget,
      lifetimeBudget,
      startTime,
      endTime,
      adsetSchedule,
      targeting,
      optimizationGoal,
      billingEvent,
      bidStrategy,
      promotedObject,
      adsToken,
      adAccountId,
      currency = 'VND',
      customAudienceIds,
    } = await req.json();

    console.log('[Create FB AdSet] Creating adset:', {
      adSetName, budgetType, dailyBudget, lifetimeBudget, currency, campaignId, adAccountId,
      hasSchedule: !!adsetSchedule, scheduleLength: adsetSchedule?.length
    });

    // Validate required params based on budget type
    if (!campaignId || !adSetName || !targeting || !adsToken || !adAccountId) {
      throw new Error('Missing required parameters: campaignId, adSetName, targeting, adsToken, adAccountId');
    }

    // Validate budget based on type
    if (budgetType === 'LIFETIME') {
      if (!lifetimeBudget) {
        throw new Error('lifetimeBudget is required for LIFETIME budget type');
      }
      if (!endTime) {
        throw new Error('endTime is required for LIFETIME budget type');
      }
    } else {
      if (!dailyBudget) {
        throw new Error('dailyBudget is required for DAILY budget type');
      }
    }

    // Parse targeting if it's a string
    const parsedTargeting = typeof targeting === 'string' ? JSON.parse(targeting) : targeting;

    // ✅ Inject custom_audiences if provided
    if (customAudienceIds && Array.isArray(customAudienceIds) && customAudienceIds.length > 0) {
      parsedTargeting.custom_audiences = customAudienceIds.map((id: string) => ({ id }));
      console.log('[Create FB AdSet] ✅ Added custom_audiences:', parsedTargeting.custom_audiences);
    }

    // ✅ Validate geo_locations format
    if (parsedTargeting?.geo_locations) {
      const geo = parsedTargeting.geo_locations;

      // Validate cities format (must be array of objects with 'key')
      if (geo.cities) {
        if (!Array.isArray(geo.cities)) {
          throw new Error('geo_locations.cities must be an array');
        }

        // Check if cities are in wrong format (strings instead of objects)
        const hasInvalidFormat = geo.cities.some((city: any) => typeof city === 'string');
        if (hasInvalidFormat) {
          throw new Error(
            'Invalid geo_locations.cities format. Expected array of objects with "key" field, ' +
            'got array of strings. Example: [{ key: "123", radius: 17, distance_unit: "kilometer" }]'
          );
        }

        // Validate each city has required 'key' field
        geo.cities.forEach((city: any, index: number) => {
          if (!city.key) {
            throw new Error(
              `geo_locations.cities[${index}] missing required "key" field. ` +
              'Cities must have format: { key: "123", radius: 17, distance_unit: "kilometer" }'
            );
          }
        });
      }

      console.log('[Create FB AdSet] ✅ Validated geo_locations:', JSON.stringify(geo, null, 2));
    } else {
      console.warn('[Create FB AdSet] ⚠️ No geo_locations provided in targeting');
    }

    // Helper to replace interests
    const replaceInterests = (interests: any[]) => {
      const deprecatedMap: Record<string, { id: string; name: string }> = {
        '6019154586676': { id: '6853952288867', name: 'Lifestyle blogs' },
        '6011653094530': { id: '6003088846792', name: 'Beauty salons' }
      };

      return interests.map((interest: any) => {
        const replacement = deprecatedMap[interest.id];
        if (replacement) {
          console.warn(`[Create FB AdSet] ⚠️ Auto-replaced deprecated interest within flexible_spec: "${interest.name}" (${interest.id}) → "${replacement.name}" (${replacement.id})`);
          return replacement;
        }
        return interest;
      });
    };

    // 1. Auto-replace deprecated interests in direct 'interests' field (legacy)
    if (parsedTargeting?.interests) {
      parsedTargeting.interests = replaceInterests(parsedTargeting.interests);
      console.log('[Create FB AdSet] ✅ Final direct interests:', JSON.stringify(parsedTargeting.interests, null, 2));
    }

    // 2. Auto-replace deprecated interests in 'flexible_spec' (current standard)
    if (parsedTargeting?.flexible_spec && Array.isArray(parsedTargeting.flexible_spec)) {
      parsedTargeting.flexible_spec = parsedTargeting.flexible_spec.map((spec: any) => {
        if (spec.interests && Array.isArray(spec.interests)) {
          spec.interests = replaceInterests(spec.interests);
        }
        return spec;
      });
      console.log('[Create FB AdSet] ✅ Final flexible_spec interests:', JSON.stringify(parsedTargeting.flexible_spec, null, 2));
    }


    // Convert budget for Facebook API
    // VND, JPY, KRW, IDR, CLP, TWD don't have cents - use amount as-is
    const noCentsCurrencies = ['VND', 'JPY', 'KRW', 'IDR', 'CLP', 'TWD'];

    const convertBudget = (amount: number) => noCentsCurrencies.includes(currency)
      ? Math.round(amount)
      : Math.round(amount * 100);

    const url = `https://graph.facebook.com/v24.0/${adAccountId}/adsets`;
    const finalOptimizationGoal = optimizationGoal || 'CONVERSATIONS';

    // Build base body
    const body: any = {
      name: adSetName,
      campaign_id: campaignId,
      targeting: {
        ...parsedTargeting,
        targeting_automation: {
          advantage_audience: 0  // 0 = TẮT Advantage Audience
        }
      },
      optimization_goal: finalOptimizationGoal,
      billing_event: billingEvent || 'IMPRESSIONS',
      bid_strategy: bidStrategy || 'LOWEST_COST_WITHOUT_CAP',
      destination_type: 'MESSENGER',
      status: 'ACTIVE',
      access_token: adsToken,
    };

    // Add budget based on type
    if (budgetType === 'LIFETIME') {
      body.lifetime_budget = convertBudget(lifetimeBudget!);

      // Convert startTime/endTime to ISO 8601 format required by Facebook API
      // Input format: YYYY-MM-DDTHH:mm, Output: Full ISO 8601 with timezone
      const formatToISO = (dateStr: string | undefined): string => {
        if (!dateStr) return new Date().toISOString();
        // If already full ISO format, return as-is
        if (dateStr.includes('Z') || dateStr.includes('+')) return dateStr;
        // Add seconds and Z if missing
        return dateStr.length === 16 ? `${dateStr}:00Z` : `${dateStr}Z`;
      };

      let adjustedStartTime = formatToISO(startTime);
      const now = new Date();
      const startDate = new Date(adjustedStartTime);

      // ✅ AUTO-ADJUST: If startTime is within 1 hour of now, push it 1 hour ahead
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      if (startDate < oneHourFromNow) {
        adjustedStartTime = oneHourFromNow.toISOString();
        console.log('[Create FB AdSet] ⏰ Auto-adjusted startTime from', startTime, 'to', adjustedStartTime);
      }

      body.start_time = adjustedStartTime;
      body.end_time = formatToISO(endTime);

      // Add schedule if provided
      if (adsetSchedule && adsetSchedule.length > 0) {
        body.pacing_type = ['day_parting'];
        body.adset_schedule = adsetSchedule;
      }
    } else {
      body.daily_budget = convertBudget(dailyBudget!);
    }



    // Add promoted_object (REQUIRED for CONVERSATIONS campaigns)
    if (promotedObject && promotedObject.page_id) {
      body.promoted_object = {
        page_id: promotedObject.page_id
      };
    } else {
      // For CONVERSATIONS, page_id is REQUIRED
      if (finalOptimizationGoal === 'CONVERSATIONS') {
        throw new Error('promoted_object.page_id is required for CONVERSATIONS optimization goal');
      }
    }


    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Create FB AdSet] Error:', data);
      throw new Error(data.error?.message || 'Failed to create adset');
    }


    return new Response(JSON.stringify({ success: true, adSetId: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Create FB AdSet] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
