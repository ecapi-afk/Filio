import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const KEY_LENGTH = 32

function getEncryptionKey(): Buffer {
  // Support both XERO_ENCRYPTION_KEY and ENCRYPTION_KEY env vars
  const key = process.env.XERO_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY
  if (!key) throw new Error('XERO_ENCRYPTION_KEY environment variable is not set')

  // If it's a hex string (64 chars = 32 bytes), use directly
  if (/^[a-fA-F0-9]{64}$/.test(key)) {
    return Buffer.from(key, 'hex')
  }

  // Otherwise hash it to get 32 bytes
  return crypto.createHash('sha256').update(key).digest()
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey()
  const parts = ciphertext.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format')
  }

  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
