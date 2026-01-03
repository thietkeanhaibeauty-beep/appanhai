import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      throw new Error("API key is required");
    }

    console.log("Checking OpenAI API key");

    // Test the API key by making a simple request
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Invalid API key");
    }

    const data = await response.json();
    
    // Get available models
    const availableModels = data.data
      .filter((model: any) => 
        model.id.includes('gpt-5') || 
        model.id.includes('gpt-4') || 
        model.id.includes('o3') || 
        model.id.includes('o4')
      )
      .map((model: any) => model.id)
      .slice(0, 20); // Limit to first 20 models

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          valid: true,
          modelsCount: data.data.length,
          availableGptModels: availableModels,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error checking OpenAI key:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
