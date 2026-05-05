import crypto from 'crypto'

const SECRET = process.env.TOKEN_SECRET || 'change-this-secret-in-production'

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const computed = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'))
  } catch {
    return false
  }
}

export function buildSessionCookie(userId: string, cargo: string): string {
  const hmac = crypto.createHmac('sha256', SECRET).update(`${userId}:${cargo}`).digest('hex')
  return `${userId}:${cargo}:${hmac}`
}

export function parseSessionCookie(value: string): { userId: string; cargo: string } | null {
  const parts = value.split(':')
  if (parts.length !== 3) return null
  const [userId, cargo, hmac] = parts
  const expectedHmac = crypto.createHmac('sha256', SECRET).update(`${userId}:${cargo}`).digest('hex')
  try {
    if (!crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'))) return null
  } catch {
    return null
  }
  return { userId, cargo }
}

// Legacy token (backward compat)
export function getAdminSessionToken(): string {
  return crypto.createHmac('sha256', SECRET).update('admin-session').digest('hex')
}
