import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const NOCODB_API_URL = Deno.env.get('NOCODB_API_URL');
const NOCODB_API_TOKEN = 'u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij';
const CAMPAIGN_LABELS_TABLE_ID = 'm0idnywr0mcv8he';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      } 
    });
  }

  try {
    console.log('🗑️ Starting to delete all campaign labels...');

    // Fetch all labels
    const fetchUrl = `${NOCODB_API_URL}/api/v2/tables/${CAMPAIGN_LABELS_TABLE_ID}/records?limit=100`;
    console.log('Fetching labels from:', fetchUrl);

    const fetchResponse = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'xc-token': NOCODB_API_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch labels: ${fetchResponse.status}`);
    }

    const data = await fetchResponse.json();
    const labels = data.list || [];
    
    console.log(`Found ${labels.length} labels to delete`);

    if (labels.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No labels to delete', deletedCount: 0 }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Delete each label
    const deleteUrl = `${NOCODB_API_URL}/api/v2/tables/${CAMPAIGN_LABELS_TABLE_ID}/records`;
    const deletePayload = labels.map((label: any) => ({ Id: label.Id }));

    console.log('Deleting labels:', deletePayload);

    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'xc-token': NOCODB_API_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deletePayload),
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(`Failed to delete labels: ${deleteResponse.status} - ${errorText}`);
    }

    console.log(`✅ Successfully deleted ${labels.length} labels`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Deleted ${labels.length} labels successfully`,
        deletedCount: labels.length,
        deletedLabels: labels.map((l: any) => ({ id: l.Id, name: l.label_name }))
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );

  } catch (error: any) {
    console.error('❌ Error deleting labels:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }
});
