import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { pairedDevices, events } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { formatErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['KITCHEN', 'MANAGER', 'OWNER']);

    // Record presence heartbeat in PostgreSQL so all serverless instances know KDS is online
    const updated = await db
      .update(pairedDevices)
      .set({ lastSeenAt: new Date() })
      .where(and(eq(pairedDevices.restaurantId, auth.restaurantId), eq(pairedDevices.kind, 'KDS')))
      .returning();

    if (updated.length === 0) {
      const tokenHash = crypto.createHash('sha256').update(`kds-${auth.restaurantId}`).digest('hex');
      await db
        .insert(pairedDevices)
        .values({
          restaurantId: auth.restaurantId,
          kind: 'KDS',
          name: 'Kitchen Display',
          tokenHash,
          lastSeenAt: new Date(),
        })
        .onConflictDoNothing();
    }
    const response = NextResponse.json({
      data: {
        status: 'online',
        serverNow,
      },
    });

    response.headers.set('X-Request-Id', requestId);
    response.headers.set('X-Server-Time', serverNow.toString());
    return response;
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    const response = NextResponse.json(body, { status });
    response.headers.set('X-Request-Id', requestId);
    response.headers.set('X-Server-Time', serverNow.toString());
    return response;
  }
}
