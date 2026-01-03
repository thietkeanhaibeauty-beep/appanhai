
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role for cron updates usually, or generic if RPC allows

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase URL or Service Role Key in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function updateCron() {
    console.log('Updating cron schedule for auto-automation-rules-cron to "* * * * *" (Every minute)...');

    const { data, error } = await supabase.rpc('update_cron_schedule', {
        job_name: 'auto-automation-rules-cron',
        new_schedule: '* * * * *'
    });

    if (error) {
        console.error('Reference Error:', error);
        // Try alternate job name if needed
    } else {
        console.log('Success:', data);
    }
}

updateCron();
