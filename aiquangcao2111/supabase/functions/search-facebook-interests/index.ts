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
    const { query, adsToken } = await req.json();

    console.log('Searching Facebook interests for query:', query);

    if (!query || !adsToken) {
      throw new Error('Missing required parameters: query, adsToken');
    }

    const results = [];

    const searchResponse = await fetch(
      `https://graph.facebook.com/v20.0/search?type=adinterest&q=${encodeURIComponent(query)}&limit=10&access_token=${adsToken}`
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.data && searchData.data.length > 0) {
        // Return all matches
        for (const interest of searchData.data) {
          results.push({
            id: interest.id,
            name: interest.name,
            audience_size: interest.audience_size || 0,
            path: interest.path || []
          });
        }
        console.log(`Found ${results.length} interests for "${query}"`);
      } else {
        console.log(`No interests found for query: ${query}`);
      }
    } else {
      console.error(`Failed to search interests for "${query}"`, await searchResponse.text());
    }

    return new Response(
      JSON.stringify({ success: true, interests: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-facebook-interests:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
