import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/db/client';
import { tables, restaurants, restaurantSettings, tableSessions, sessionDevices } from '@/db/schema';
import { eq, and, ne, sql } from 'drizzle-orm';
import { verifyDeviceCookie, DEVICE_COOKIE_NAME } from '@/lib/device-cookie';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';

export interface GuestContext {
  deviceId: string;
  tableId: string;
  restaurantId: string;
  tableLabel: string;
  guardMode: string;
}

export async function requireGuestContext(): Promise<GuestContext> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(DEVICE_COOKIE_NAME)?.value;

  const verified = verifyDeviceCookie(rawCookie, env.DEVICE_COOKIE_SECRET);
  if (!verified) {
    throw new AppError('DEVICE_UNIDENTIFIED', 'Please scan the table QR code to begin', 401);
  }

  // Look up table and verify it exists and is enabled
  const [tableRecord] = await db
    .select({
      id: tables.id,
      restaurantId: tables.restaurantId,
      token: tables.token,
      label: tables.label,
      isEnabled: tables.isEnabled,
      deletedAt: tables.deletedAt,
      guardMode: restaurantSettings.orderGuardMode,
      orderingPausedUntil: restaurantSettings.orderingPausedUntil,
      pauseMessage: restaurantSettings.pauseMessage,
    })
    .from(tables)
    .innerJoin(restaurantSettings, eq(tables.restaurantId, restaurantSettings.restaurantId))
    .where(eq(tables.id, verified.tableId))
    .limit(1);

  if (!tableRecord || !tableRecord.isEnabled || tableRecord.deletedAt) {
    throw new AppError('TABLE_DISABLED', 'This table is currently disabled or unavailable', 403);
  }

  // Token rotation check: verify cookie tokenHash matches current table token
  if (verified.tokenHash) {
    const currentTokenHash = crypto.createHash('sha256').update(tableRecord.token).digest('hex').slice(0, 16);
    if (verified.tokenHash !== currentTokenHash) {
      throw new AppError('TOKEN_ROTATED', 'This table QR code has been regenerated. Please scan the updated QR code.', 401);
    }
  }

  // Blocked device check: check if device was blocked in active session
  const [activeSession] = await db
    .select({ id: tableSessions.id })
    .from(tableSessions)
    .where(and(eq(tableSessions.tableId, tableRecord.id), ne(tableSessions.status, 'CLOSED')))
    .limit(1);

  if (activeSession) {
    const [deviceRecord] = await db
      .select({ blockedAt: sessionDevices.blockedAt })
      .from(sessionDevices)
      .where(
        and(
          eq(sessionDevices.sessionId, activeSession.id),
          eq(sessionDevices.deviceId, verified.deviceId)
        )
      )
      .limit(1);

    if (deviceRecord?.blockedAt) {
      throw new AppError('DEVICE_BLOCKED', 'This device has been blocked by staff.', 403);
    }
  }

  // Check if ordering is paused
  if (tableRecord.orderingPausedUntil && new Date() < new Date(tableRecord.orderingPausedUntil)) {
    throw new AppError(
      'ORDERING_PAUSED',
      tableRecord.pauseMessage || 'Ordering is temporarily paused. Please check back shortly.',
      403
    );
  }

  return {
    deviceId: verified.deviceId,
    tableId: tableRecord.id,
    restaurantId: tableRecord.restaurantId,
    tableLabel: tableRecord.label,
    guardMode: tableRecord.guardMode,
  };
}
