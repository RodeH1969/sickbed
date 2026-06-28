const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn(
    '[sickbed] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars — ' +
    'set these in the Render dashboard. The app will start but API calls will fail.'
  );
}

const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_KEY || 'placeholder-key',
  { auth: { persistSession: false } }
);

module.exports = supabase;
