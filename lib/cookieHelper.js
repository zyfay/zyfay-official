// lib/cookieHelper.js
// Helper kecil biar gak perlu nambah dependency 'cookie' cuma buat bikin Set-Cookie string.
export function buildCookie(name, value, { maxAge, path = '/' } = {}) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const maxAgePart = maxAge != null ? `; Max-Age=${maxAge}` : '';
  return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=${path}${maxAgePart}${secure}`;
}

export function clearCookie(name, { path = '/' } = {}) {
  return `${name}=; HttpOnly; SameSite=Lax; Path=${path}; Max-Age=0`;
}
