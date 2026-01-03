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


    const { adsToken, pageToken } = await req.json();



    const results: any = {
      adsToken: null,
      pageToken: null,
    };

    // Save Ads Token
    if (adsToken) {
      try {
        // Fetch ad accounts first
        const fbResponse = await fetch(
          `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,currency,timezone_name&access_token=${adsToken}`,
          { signal: AbortSignal.timeout(30000) }
        );

        if (fbResponse.ok) {
          const fbData = await fbResponse.json();
          const accounts = fbData.data || [];


          let savedCount = 0;

          for (const account of accounts) {
            try {
              // Check if account exists
              const checkUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS}/records?where=(user_id,eq,${user.id})~and(account_id,eq,${account.account_id})&limit=1`;
              const checkResponse = await fetch(checkUrl, {
                method: 'GET',
                headers: getNocoDBHeaders(),
              });

              const existingData = await checkResponse.json();

              if (existingData.list && existingData.list.length > 0) {
                // Update existing
                const existingRecord = existingData.list[0];
                const updateUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS}/records`;
                const updateResponse = await fetch(updateUrl, {
                  method: 'PATCH',
                  headers: getNocoDBHeaders(),
                  body: JSON.stringify([{
                    Id: existingRecord.Id,
                    account_name: account.name,
                    access_token: adsToken,
                    currency: account.currency,
                    timezone_name: account.timezone_name,
                    is_active: 1,
                  }]),
                });

                if (updateResponse.ok) {
                  savedCount++;

                }
              } else {
                // Create new
                const accountData = {
                  user_id: user.id,
                  account_id: account.account_id,
                  account_name: account.name,
                  access_token: adsToken,
                  currency: account.currency,
                  timezone_name: account.timezone_name,
                  is_active: 1,
                };

                const createUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS}/records`;
                const saveResponse = await fetch(createUrl, {
                  method: 'POST',
                  headers: getNocoDBHeaders(),
                  body: JSON.stringify(accountData),
                });

                if (saveResponse.ok) {
                  savedCount++;

                }
              }
            } catch (err) {
              console.error(`❌ Error saving account ${account.account_id}:`, err);
            }
          }

          results.adsToken = {
            success: true,
            accountsSaved: savedCount,
            totalAccounts: accounts.length,
          };
        }
      } catch (error) {
        console.error('Error saving ads token:', error);
        results.adsToken = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Save Page Token
    if (pageToken) {
      try {
        // Get page info
        const pageResponse = await fetch(
          `https://graph.facebook.com/v18.0/me?access_token=${pageToken}&fields=id,name,category`,
          { signal: AbortSignal.timeout(10000) }
        );

        if (pageResponse.ok) {
          const pageData = await pageResponse.json();


          // Check if page exists
          const checkUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PAGES}/records?where=(user_id,eq,${user.id})~and(page_id,eq,${pageData.id})&limit=1`;
          const checkResponse = await fetch(checkUrl, {
            method: 'GET',
            headers: getNocoDBHeaders(),
          });

          const existingData = await checkResponse.json();

          if (existingData.list && existingData.list.length > 0) {
            // Update existing
            const existingRecord = existingData.list[0];
            const updateUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PAGES}/records`;
            const updateResponse = await fetch(updateUrl, {
              method: 'PATCH',
              headers: getNocoDBHeaders(),
              body: JSON.stringify([{
                Id: existingRecord.Id,
                page_name: pageData.name,
                access_token: pageToken,
                category: pageData.category,
                is_active: 1,
              }]),
            });

            if (updateResponse.ok) {

              results.pageToken = { success: true, action: 'updated' };
            }
          } else {
            // Create new
            const pageDataToSave = {
              user_id: user.id,
              page_id: pageData.id,
              page_name: pageData.name,
              access_token: pageToken,
              category: pageData.category,
              is_active: 1,
            };

            const createUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_PAGES}/records`;
            const saveResponse = await fetch(createUrl, {
              method: 'POST',
              headers: getNocoDBHeaders(),
              body: JSON.stringify(pageDataToSave),
            });

            if (saveResponse.ok) {

              results.pageToken = { success: true, action: 'created' };
            }
          }
        }
      } catch (error) {
        console.error('Error saving page token:', error);
        results.pageToken = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }



    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in save-fb-tokens:", error);
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
