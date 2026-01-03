const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDcxMTYsImV4cCI6MjA3OTI4MzExNn0.iRHg-xMZ1i_qb0xnQ6vDivcFEEdrpYb0Z6cSkgOLLyU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    console.log('Checking table automation_rule_object_executions...');

    const { data, error } = await supabase
        .from('automation_rule_object_executions')
        .select('count', { count: 'exact', head: true });

    if (error) {
        console.error('❌ Error accessing table:', JSON.stringify(error, null, 2));
        if (error.code === '42P01') {
            console.error('👉 Result: TABLE DOES NOT EXIST (42P01)');
        } else {
            console.error('👉 Result: OTHER ERROR', error.code);
        }
    } else {
        console.log('✅ Table exists!');
    }
}

checkTable();
