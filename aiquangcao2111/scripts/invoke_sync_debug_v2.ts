
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jtaekxrkubhwtqgodvtx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDcxMTYsImV4cCI6MjA3OTI4MzExNn0.iRHg-xMZ1i_qb0xnQ6vDivcFEEdrpYb0Z6cSkgOLLyU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function invokeSync() {
    console.log("Invoking sync-ads-cron...");

    // We can pass a body if needed, e.g. limit
    const { data, error } = await supabase.functions.invoke('sync-ads-cron', {
        body: { limit: 5000, date_preset: 'today' }
    });

    if (error) {
        console.error("Error invoking function:", error);
        return;
    }

    console.log("Function response:", data);

    if (data && data.logs) {
        console.log("\n--- LOGS ---");
        data.logs.forEach(l => console.log(l));
        console.log("--- END LOGS ---");

        // Filter for "Anh tuấn"
        const relevantLogs = data.logs.filter(l => l.includes("Anh tuấn") || l.includes("Recovered"));
        console.log("\n--- RELEVANT LOGS ---");
        relevantLogs.forEach(l => console.log(l));
    }
}

invokeSync();
