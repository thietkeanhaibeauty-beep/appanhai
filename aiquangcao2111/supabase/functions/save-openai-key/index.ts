import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserFromRequest } from "../_shared/auth.ts";
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromRequest(req);
    console.log('🔐 Authenticated user:', user.id);

    const { apiKey, model } = await req.json();

    console.log('📥 Received payload:', { apiKey: apiKey ? '***' : 'missing', model });

    if (!apiKey) {
      throw new Error("API key is required");
    }

    const cleanApiKey = apiKey.trim();
    const cleanModel = model ? model.trim() : 'gpt-4o-mini';

    console.log('🧹 Cleaned data:', { cleanModel });

    console.log('💾 Saving OpenAI API key to NocoDB...');

    // Check if setting exists for this user
    const checkUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.OPENAI_SETTINGS}/records?where=(user_id,eq,${user.id})&limit=100`;

    // DEBUG: Fetch table columns to verify names
    const columnsUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/meta/tables/${NOCODB_CONFIG.TABLES.OPENAI_SETTINGS}/columns`;
    const [checkResponse, columnsResponse] = await Promise.all([
      fetch(checkUrl, { method: 'GET', headers: getNocoDBHeaders() }),
      fetch(columnsUrl, { method: 'GET', headers: getNocoDBHeaders() })
    ]);

    const existingData = await checkResponse.json();
    const columnsData = await columnsResponse.json();

    // Log available columns
    const availableColumns = columnsData.list ? columnsData.list.map((c: any) => ({ title: c.title, column_name: c.column_name, uid: c.uid })) : [];
    console.log('📋 Table Columns:', JSON.stringify(availableColumns));

    const existingRecords = existingData.list || [];

    let result;

    let targetRecord = null;
    const recordsToUpdate = [];

    // Prepare updates for existing records
    for (const record of existingRecords) {
      if (record.api_key === cleanApiKey) {
        targetRecord = record;
        // Will update this one to be active
      } else if (record.is_active) {
        // Deactivate others
        recordsToUpdate.push({
          Id: record.Id,
          is_active: 0
        });
      }
    }

    // If we found the target record, add it to updates with new values
    if (targetRecord) {
      recordsToUpdate.push({
        Id: targetRecord.Id,
        api_key: cleanApiKey,
        model: cleanModel || 'gpt-4o-mini',
        is_active: 1,
        name_api: 'openai'
      });
    }

    // Execute bulk update if needed
    if (recordsToUpdate.length > 0) {
      const updateUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.OPENAI_SETTINGS}/records`;
      const updateResponse = await fetch(updateUrl, {
        method: 'PATCH',
        headers: getNocoDBHeaders(),
        body: JSON.stringify(recordsToUpdate),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to update OpenAI settings: ${errorText}`);
      }
      console.log(`✅ Updated ${recordsToUpdate.length} settings`);
    }

    // If target record didn't exist, create it
    if (!targetRecord) {
      const settingData = {
        record_id: crypto.randomUUID(), // ✅ Added record_id as per service logic
        user_id: user.id,
        api_key: cleanApiKey,
        model: cleanModel || 'gpt-4o-mini',
        is_active: 1,
        name_api: 'openai'
      };

      const createUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.OPENAI_SETTINGS}/records`;
      const saveResponse = await fetch(createUrl, {
        method: 'POST',
        headers: getNocoDBHeaders(),
        body: JSON.stringify(settingData),
      });

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        throw new Error(`Failed to create OpenAI setting: ${errorText}`);
      }
      console.log(`✅ Created new OpenAI setting`);
    }

    result = {
      success: true,
      savedData: {
        model: cleanModel || 'gpt-4o-mini',
        apiKey: cleanApiKey ? '***' : 'missing',
        recordsUpdated: recordsToUpdate.length,
        created: !targetRecord,
        columns: availableColumns // Return columns for debugging
      }
    };

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error saving OpenAI key:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
