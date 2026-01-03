import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

/**
 * Get authenticated user from request Authorization header
 * Throws error if user is not authenticated
 */
export const getUserFromRequest = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  // Create supabase client with the Authorization header
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });

  // Verify the JWT token by getting the user
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('❌ Auth error:', error);
    throw new Error('Invalid or expired token');
  }


  return user;
};
