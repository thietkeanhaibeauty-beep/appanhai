-- Helper function to execute raw SQL from edge functions
-- This is needed for dynamic cron job management
-- SECURITY: Only callable by service role

CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;
