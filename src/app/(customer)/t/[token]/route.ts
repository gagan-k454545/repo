import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/db/client';
import { tables } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { signDeviceCookie, DEVICE_COOKIE_NAME } from '@/lib/device-cookie';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let table: { id: string; restaurantId: string; token: string; isEnabled: boolean; deletedAt: Date | null } | undefined;

  if (token === 'demo') {
    const [demoTable] = await db
      .select({
        id: tables.id,
        restaurantId: tables.restaurantId,
        token: tables.token,
        isEnabled: tables.isEnabled,
        deletedAt: tables.deletedAt,
      })
      .from(tables)
      .where(eq(tables.isEnabled, true))
      .limit(1);
    table = demoTable;
  } else {
    if (!token || token.length < 16) {
      return NextResponse.redirect(new URL('/closed?reason=invalid_qr', request.url));
    }

    const [foundTable] = await db
      .select({
        id: tables.id,
        restaurantId: tables.restaurantId,
        token: tables.token,
        isEnabled: tables.isEnabled,
        deletedAt: tables.deletedAt,
      })
      .from(tables)
      .where(eq(tables.token, token))
      .limit(1);
    table = foundTable;
  }

  if (!table || !table.isEnabled || table.deletedAt) {
    return NextResponse.redirect(new URL('/closed?reason=invalid_qr', request.url));
  }

  // Generate random 128-bit device ID (or preserve existing device ID if valid)
  const deviceId = crypto.randomBytes(16).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(table.token).digest('hex').slice(0, 16);

  const cookiePayload = {
    deviceId,
    tableId: table.id,
    tokenHash,
    issuedAt: Date.now(),
  };

  const signedCookie = signDeviceCookie(cookiePayload, env.DEVICE_COOKIE_SECRET);

  const response = NextResponse.redirect(new URL('/menu', request.url));

  // Set signed httpOnly, Secure, SameSite=Lax cookie
  response.cookies.set({
    name: DEVICE_COOKIE_NAME,
    value: signedCookie,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
