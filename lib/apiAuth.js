// lib/apiAuth.js
import { supabaseAdmin } from './supabase';

export async function verifyApiKey(req) {
  const header = req.headers['x-api-key'] || req.headers['authorization'] || '';
  const key = header.replace(/^Bearer\s+/i, '').trim();
  if (!key) return false;

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('id, is_active')
    .eq('key', key)
    .single();

  if (error || !data || !data.is_active) return false;

  // Catat waktu pemakaian terakhir, gak perlu ditunggu (fire and forget)
  supabaseAdmin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {}, () => {});

  return true;
}
