// lib/customerAuth.js
// Session buat akun CUSTOMER — terpisah total dari admin_token (lib/auth.js),
// biar admin & customer gak ketuker cookie-nya.
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'zyfay-fallback-secret-change-me'
);

export async function signCustomerToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
}

export async function verifyCustomerToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

// Sesi "login" (udah masuk password, BELUM tentu udah buka PIN)
export async function getCustomer(req) {
  const token = req.cookies?.customer_token;
  if (!token) return null;
  const payload = await verifyCustomerToken(token);
  if (!payload || payload.role !== 'customer') return null;
  return payload; // { id, name, email, role: 'customer' }
}

// Sesi "unlocked" (udah login DAN udah masukin PIN bener) — buat akses halaman saldo
export async function getUnlockedCustomer(req) {
  const customer = await getCustomer(req);
  if (!customer) return null;
  const unlockToken = req.cookies?.customer_pin_unlock;
  if (!unlockToken) return null;
  const payload = await verifyCustomerToken(unlockToken);
  if (!payload || payload.role !== 'customer_unlocked' || payload.id !== customer.id) return null;
  return customer;
}
