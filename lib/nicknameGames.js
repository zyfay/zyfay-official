// lib/nicknameGames.js
// Peta dari slug game di database kita ke kode game yang dipakai API cek
// nickname pihak ketiga (api.isan.eu.org, sumber data dari Codashop).
// Key di-normalisasi lowercase & tanpa simbol, jadi "Free Fire" / "free-fire"
// / "freefire" semua bisa cocok ke satu entri yang sama.

export const NICKNAME_GAME_MAP = {
  // Mobile Legends: Bang Bang
  mlbb: { code: 'ml', needsServer: true },
  ml: { code: 'ml', needsServer: true },
  mobilelegends: { code: 'ml', needsServer: true },
  mobilelegendsbangbang: { code: 'ml', needsServer: true },

  // Free Fire
  ff: { code: 'ff', needsServer: false },
  freefire: { code: 'ff', needsServer: false },

  // Call of Duty Mobile
  codm: { code: 'codm', needsServer: false },
  cod: { code: 'codm', needsServer: false },
  callofdutymobile: { code: 'codm', needsServer: false },

  // Arena of Valor
  aov: { code: 'aov', needsServer: false },
  arenaofvalor: { code: 'aov', needsServer: false },

  // Genshin Impact
  genshin: { code: 'gi', needsServer: false },
  genshinimpact: { code: 'gi', needsServer: false },
  gi: { code: 'gi', needsServer: false },

  // Honkai Star Rail
  hsr: { code: 'hsr', needsServer: false },
  honkaistarrail: { code: 'hsr', needsServer: false },

  // Honkai Impact 3rd
  honkai: { code: 'hi', needsServer: false },
  honkaiimpact: { code: 'hi', needsServer: false },
  hi3: { code: 'hi', needsServer: false },

  // Zenless Zone Zero
  zzz: { code: 'zzz', needsServer: false },
  zenlesszonezero: { code: 'zzz', needsServer: false },

  // Valorant (pakai format RiotID#Tag)
  valorant: { code: 'valo', needsServer: false },
  valo: { code: 'valo', needsServer: false },

  // Point Blank
  pb: { code: 'pb', needsServer: false },
  pointblank: { code: 'pb', needsServer: false },

  // Sausage Man
  sausageman: { code: 'sm', needsServer: false },
  sm: { code: 'sm', needsServer: false },

  // Super Sus
  supersus: { code: 'sus', needsServer: false },
  sus: { code: 'sus', needsServer: false },

  // Magic Chess: Go Go
  magicchess: { code: 'mcgg', needsServer: true },
  magicchessgogo: { code: 'mcgg', needsServer: true },
  mcgg: { code: 'mcgg', needsServer: true },

  // Love and Deepspace
  loveanddeepspace: { code: 'ld', needsServer: false },
  ld: { code: 'ld', needsServer: false },

  // Punishing: Gray Raven
  pgr: { code: 'pgr', needsServer: true },
  punishinggrayraven: { code: 'pgr', needsServer: true },

  // LifeAfter
  lifeafter: { code: 'la', needsServer: true },
  la: { code: 'la', needsServer: true },
};

export function normalizeGameKey(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getNicknameGameConfig(gameId) {
  return NICKNAME_GAME_MAP[normalizeGameKey(gameId)] || null;
}
