// UUIDv7 generation utility
// UUIDv7 provides time-ordered unique identifiers with millisecond precision

/**
 * Generate a UUIDv7 (time-ordered UUID)
 * Format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
 * where x is random and y is random with variant bits
 */
export function generateUUIDv7(): string {
  // Get current timestamp in milliseconds
  const timestamp = Date.now();

  // Convert timestamp to hex (48 bits)
  const timestampHex = timestamp.toString(16).padStart(12, '0');

  // Generate random bytes for the rest
  const randomBytes = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Version (4 bits): 0111 (7 in hex)
  const version = '7';

  // Variant (2 bits): 10 (RFC 4122)
  // We need to set the first 2 bits of randomBytes[2] to 10
  randomBytes[2] = (randomBytes[2] & 0x3f) | 0x80;

  // Convert random bytes to hex
  const randomHex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Build UUID string: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
  // timestamp (12 chars) + version (1 char) + random (3 chars) + variant random (16 chars)
  const uuid = [
    timestampHex.substring(0, 8), // First 8 chars of timestamp
    timestampHex.substring(8, 12), // Next 4 chars of timestamp
    version + randomHex.substring(0, 3), // Version + 3 random chars
    randomHex.substring(3, 7), // 4 random chars with variant
    randomHex.substring(7, 19), // 12 random chars
  ].join('-');

  return uuid;
}

/**
 * Extract timestamp from UUIDv7
 */
export function extractTimestampFromUUIDv7(uuid: string): number {
  // Remove hyphens and get first 12 hex characters (48 bits)
  const cleanUuid = uuid.replace(/-/g, '');
  const timestampHex = cleanUuid.substring(0, 12);

  return parseInt(timestampHex, 16);
}

/**
 * Validate if a string is a valid UUIDv7
 */
export function isValidUUIDv7(uuid: string): boolean {
  // UUID format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
  const uuidv7Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidv7Regex.test(uuid);
}
