// pages/api/admin/maintenance.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Publik: dipakai juga oleh halaman /maintenance untuk polling status,
    // jadi sengaja tidak diwajibkan login admin.
    const { data, error } = await supabaseAdmin
      .from('site_settings')
      .select('value')
      .eq('key', 'maintenance')
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, enabled: !!data?.value?.enabled, message: data?.value?.message || '' });
  }

  if (req.method === 'PATCH') {
    const admin = await getAdmin(req);
    if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { enabled, message } = req.body || {};

    const { data: current } = await supabaseAdmin
      .from('site_settings')
      .select('value')
      .eq('key', 'maintenance')
      .single();

    const newValue = {
      enabled: enabled !== undefined ? !!enabled : (current?.value?.enabled ?? false),
      message: message !== undefined ? message : (current?.value?.message ?? ''),
    };

    const { error } = await supabaseAdmin
      .from('site_settings')
      .upsert({ key: 'maintenance', value: newValue, updated_at: new Date().toISOString() });

    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, ...newValue });
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).json({ success: false, message: 'Method not allowed' });
          }
