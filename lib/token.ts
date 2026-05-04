import crypto from 'crypto'

const SECRET = process.env.TOKEN_SECRET || 'change-this-secret-in-production'
const BUCKET_MS = 30_000 // token muda a cada 30s

export function getCurrentToken(): string {
  const bucket = Math.floor(Date.now() / BUCKET_MS)
  return crypto.createHmac('sha256', SECRET).update(String(bucket)).digest('hex').slice(0, 20)
}

export function isValidToken(token: string): boolean {
  const now = Math.floor(Date.now() / BUCKET_MS)
  // aceita o bucket atual e os 2 anteriores (até 90s de validade)
  for (let i = 0; i <= 2; i++) {
    const bucket = now - i
    const expected = crypto.createHmac('sha256', SECRET).update(String(bucket)).digest('hex').slice(0, 20)
    if (token === expected) return true
  }
  return false
}

export function getAdminSessionToken(): string {
  return crypto.createHmac('sha256', SECRET).update('admin-session').digest('hex')
}
