import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Pinged by the Vercel Cron Job in vercel.json. Supabase free-tier projects
// pause after 7 days with no activity; this does the lightest possible read
// (no inserts/updates) purely to keep the project awake.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ ok: false, error: 'Missing Supabase configuration' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await supabase.from('fonts').select('id').limit(1);

  if (error) {
    res.status(502).json({ ok: false, error: error.message });
    return;
  }

  res.status(200).json({ ok: true });
}
