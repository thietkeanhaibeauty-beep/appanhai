import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ljpownumtmclnrtnqldt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqcG93bnVtdG1jbG5ydG5xbGR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTY3MjUsImV4cCI6MjA4Mjk5MjcyNX0.k-Ar9aG9y7-llFU4MtZjDvUDyuJgtnKop7BdTsM7MVw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
