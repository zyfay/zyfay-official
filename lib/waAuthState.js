// lib/waAuthState.js
import { initAuthCreds, BufferJSON, proto } from 'baileys';
import { supabaseAdmin } from './supabase';

async function readData(key) {
  const { data } = await supabaseAdmin.from('whatsapp_auth').select('data').eq('id', key).maybeSingle();
  if (!data) return null;
  try {
    return JSON.parse(JSON.stringify(data.data), BufferJSON.reviver);
  } catch {
    return null;
  }
}

async function writeData(key, value) {
  const data = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
  await supabaseAdmin.from('whatsapp_auth').upsert({ id: key, data, updated_at: new Date().toISOString() });
}

async function removeData(key) {
  await supabaseAdmin.from('whatsapp_auth').delete().eq('id', key);
}

export async function clearAuthState() {
  await supabaseAdmin.from('whatsapp_auth').delete().neq('id', '');
}

export async function useSupabaseAuthState() {
  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(key, value) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData('creds', creds),
  };
}
