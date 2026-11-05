import { describe, it, expect } from 'vitest';
import { signDeviceCookie, verifyDeviceCookie } from '@/lib/device-cookie';
import { hashRequestBody } from '@/lib/idempotency';
import { formatPaiseToRupees, rupeesToPaise, assertNonNegativePaise } from '@/lib/money';
import { placeOrderDeviceLimiter, checkRateLimit } from '@/lib/rate-limit';

describe('Security & Utilities Unit Tests', () => {
  const secret = 'super-secret-key-32-chars-minimum-required!';

  describe('Device Cookie HMAC-SHA256 Signing & Verification', () => {
    it('signs and verifies a valid device cookie', () => {
      const payload = {
        deviceId: 'device-12345',
        tableId: 'table-67890',
        tokenHash: 'abcdef1234567890',
        issuedAt: Date.now(),
      };

      const cookie = signDeviceCookie(payload, secret);
      expect(cookie).toContain('.');

      const verified = verifyDeviceCookie(cookie, secret);
      expect(verified).not.toBeNull();
      expect(verified?.deviceId).toBe(payload.deviceId);
      expect(verified?.tableId).toBe(payload.tableId);
      expect(verified?.tokenHash).toBe(payload.tokenHash);
    });

    it('rejects tampered cookie signature', () => {
      const payload = {
        deviceId: 'device-12345',
        tableId: 'table-67890',
        issuedAt: Date.now(),
      };

      const cookie = signDeviceCookie(payload, secret);
      const [data, sig] = cookie.split('.');
      const tampered = `${data}.${sig.slice(0, -2)}xx`;

      const verified = verifyDeviceCookie(tampered, secret);
      expect(verified).toBeNull();
    });

    it('rejects cookie signed with wrong secret', () => {
      const payload = {
        deviceId: 'device-12345',
        tableId: 'table-67890',
        issuedAt: Date.now(),
      };

      const cookie = signDeviceCookie(payload, secret);
      const verified = verifyDeviceCookie(cookie, 'another-wrong-secret-32-chars-min-ok!');
      expect(verified).toBeNull();
    });
  });

  describe('Idempotency Hashing', () => {
    it('produces deterministic SHA-256 hash for identical payloads', () => {
      const body1 = { items: [{ id: 1, qty: 2 }], note: 'No onion' };
      const body2 = { items: [{ id: 1, qty: 2 }], note: 'No onion' };

      const hash1 = hashRequestBody(body1);
      const hash2 = hashRequestBody(body2);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('produces distinct hashes for different payloads', () => {
      const hash1 = hashRequestBody({ amount: 100 });
      const hash2 = hashRequestBody({ amount: 200 });

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Integer Paise Money Utilities', () => {
    it('formats paise to INR currency strings accurately', () => {
      expect(formatPaiseToRupees(15000)).toMatch(/₹\s*150\.00/);
      expect(formatPaiseToRupees(4250)).toMatch(/₹\s*42\.50/);
      expect(formatPaiseToRupees(0)).toMatch(/₹\s*0\.00/);
    });

    it('converts rupees to paise without floating-point drift', () => {
      expect(rupeesToPaise(150.50)).toBe(15050);
      expect(rupeesToPaise(0.20)).toBe(20);
      expect(rupeesToPaise(999.99)).toBe(99999);
    });

    it('asserts non-negative paise integers and rejects invalid amounts', () => {
      expect(() => assertNonNegativePaise(100)).not.toThrow();
      expect(() => assertNonNegativePaise(0)).not.toThrow();
      expect(() => assertNonNegativePaise(-1)).toThrow();
      expect(() => assertNonNegativePaise(12.34)).toThrow();
    });
  });

  describe('Rate Limiting', () => {
    it('consumes points within limit and throws AppError 429 when exhausted', async () => {
      const key = `test-device-${Date.now()}`;
      // points: 6
      for (let i = 0; i < 6; i++) {
        await expect(checkRateLimit(placeOrderDeviceLimiter, key)).resolves.not.toThrow();
      }

      // 7th attempt must throw 429
      await expect(checkRateLimit(placeOrderDeviceLimiter, key)).rejects.toThrow();
    });
  });
});
