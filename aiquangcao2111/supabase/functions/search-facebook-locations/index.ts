import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, locationType, adsToken } = await req.json();

    console.log('Searching Facebook locations:', { query, locationType });

    if (!query || !locationType || !adsToken) {
      throw new Error('Missing required parameters: query, locationType, adsToken');
    }

    // Determine location_types based on locationType
    let locationTypes = '';
    if (locationType === 'country') {
      locationTypes = 'country';
    } else if (locationType === 'city') {
      locationTypes = 'city';
    } else if (locationType === 'region') {
      locationTypes = 'region';
    }

    const searchUrl = `https://graph.facebook.com/v20.0/search?type=adgeolocation&location_types=${locationTypes}&q=${encodeURIComponent(query)}&access_token=${adsToken}`;

    console.log('Calling Facebook API:', searchUrl);

    const response = await fetch(searchUrl);
    const data = await response.json();

    console.log('Facebook API Response:', JSON.stringify(data, null, 2));

    if (!response.ok || data.error) {
      console.error('Facebook API Error:', data.error);
      throw new Error(data.error?.message || 'Failed to search locations');
    }

    // Format the results
    const results = (data.data || []).map((location: any) => ({
      key: location.key,
      name: location.name,
      type: location.type,
      country_code: location.country_code,
      country_name: location.country_name,
      region: location.region,
      region_id: location.region_id,
      supports_region: location.supports_region,
      supports_city: location.supports_city,
    }));

    return new Response(
      JSON.stringify({ success: true, locations: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-facebook-locations:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
