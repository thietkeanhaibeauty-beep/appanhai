
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Construct Supabase URL (referencing local if needed or project)
const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDcxMTYsImV4cCI6MjA3OTI4MzExNn0.iRHg-xMZ1i_qb0xnQ6vDivcFEEdrpYb0Z6cSkgOLLyU';

if (!SUPABASE_KEY) {
    console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OBJECT_ID = "120237109895570772"; // From user screenshot
const RULE_ID = 53; // Likely the rule ID (user screenshot shows rule_id 53 in logs)

async function checkHistory() {
    console.log(`Checking history for Object: ${OBJECT_ID} (Rule: ${RULE_ID})...`);

    // 1. Check automation_rule_object_executions
    const { data: executions, error } = await supabase
        .from('automation_rule_object_executions')
        .select('*')
        .eq('object_id', OBJECT_ID);

    if (error) {
        console.error("❌ Error fetching executions:", error);
    } else {
        console.log(`\n📋 Found ${executions.length} execution records: `);
        executions.forEach(ex => {
            console.log(`- ID: ${ex.id} | Rule: ${ex.rule_id} | Count: ${ex.execution_count} | Last: ${new Date(ex.last_executed_at).toLocaleString('vi-VN')} | Created: ${new Date(ex.created_at).toLocaleString('vi-VN')} `);
        });
    }

    // 2. Check logs table if possible (optional, might not have access directly via this script depending on RLS/Structure)
}

checkHistory();
