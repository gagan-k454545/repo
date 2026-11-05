import { RateLimiterMemory } from 'rate-limiter-flexible';
import { AppError } from './errors';

// Place order rate limiters: 6/min per device, 20/min per table
export const placeOrderDeviceLimiter = new RateLimiterMemory({
  points: 6,
  duration: 60,
});

export const placeOrderTableLimiter = new RateLimiterMemory({
  points: 20,
  duration: 60,
});

// Call waiter / Request bill: 1 per 2 minutes per session
export const waiterCallLimiter = new RateLimiterMemory({
  points: 1,
  duration: 120,
});

export const billRequestLimiter = new RateLimiterMemory({
  points: 1,
  duration: 120,
});

// Table code attempts: 5 per 10 mins
export const tableCodeLimiter = new RateLimiterMemory({
  points: 5,
  duration: 600,
  blockDuration: 600, // locked for 10 minutes
});

// General guest API limiter: 120/min per device
export const generalGuestLimiter = new RateLimiterMemory({
  points: 120,
  duration: 60,
});

// Staff login limiter: 5 failures per 15 min
export const staffLoginLimiter = new RateLimiterMemory({
  points: 5,
  duration: 900,
  blockDuration: 900,
});

export async function checkRateLimit(
  limiter: RateLimiterMemory,
  key: string,
  errorMessage = 'Too many requests. Please slow down.'
): Promise<void> {
  try {
    await limiter.consume(key);
  } catch {
    throw new AppError('RATE_LIMITED', errorMessage, 429);
  }
}

export function getClientIp(headers: Headers | { get: (name: string) => string | null }): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}
