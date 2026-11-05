import crypto from 'crypto';

export interface DeviceCookiePayload {
  deviceId: string;
  tableId: string;
  tokenHash?: string;
  issuedAt: number;
}

const COOKIE_NAME = 'qr_device';

/**
 * Signs payload using HMAC-SHA256
 */
export function signDeviceCookie(payload: DeviceCookiePayload, secret: string): string {
  const jsonStr = JSON.stringify(payload);
  const base64Payload = Buffer.from(jsonStr).toString('base64url');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(base64Payload);
  const signature = hmac.digest('base64url');
  return `${base64Payload}.${signature}`;
}

/**
 * Verifies signed cookie string and extracts payload
 */
export function verifyDeviceCookie(cookieValue: string | undefined, secret: string): DeviceCookiePayload | null {
  if (!cookieValue) return null;

  const parts = cookieValue.split('.');
  if (parts.length !== 2) return null;

  const [base64Payload, signature] = parts;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(base64Payload);
  const expectedSignature = hmac.digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(base64Payload, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr) as DeviceCookiePayload;
    if (!parsed.deviceId || !parsed.tableId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export { COOKIE_NAME as DEVICE_COOKIE_NAME };
