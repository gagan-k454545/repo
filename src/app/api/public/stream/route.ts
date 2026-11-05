import { NextRequest } from 'next/server';
import { requireGuestContext } from '@/modules/auth/guest-guard';
import { db } from '@/db/client';
import { events, tableSessions } from '@/db/schema';
import { eq, gt, and, sql } from 'drizzle-orm';
import { bus, RealtimeEventPayload } from '@/modules/realtime/bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let guest;
  try {
    guest = await requireGuestContext();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  // Look up live session for this table
  const [session] = await db
    .select({ id: tableSessions.id })
    .from(tableSessions)
    .where(
      and(
        eq(tableSessions.tableId, guest.tableId),
        eq(tableSessions.restaurantId, guest.restaurantId)
      )
    )
    .limit(1);

  const sessionId = session?.id;

  let lastDispatchedId = 0;
  const lastEventIdStr = request.headers.get('last-event-id');
  if (lastEventIdStr) {
    const parsed = parseInt(lastEventIdStr, 10);
    if (!isNaN(parsed)) lastDispatchedId = parsed;
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Flush Vercel proxy headers and configure auto-reconnect
      controller.enqueue(encoder.encode(': connected\n\n'));
      controller.enqueue(encoder.encode('retry: 1000\n\n'));

      const isAllowedForGuest = (ev: { sessionId?: string | null; channel?: string; type?: string }) => {
        return (
          ev.sessionId === sessionId ||
          ev.channel === 'menu' ||
          ev.type === 'settings.updated' ||
          ev.type === 'app.version'
        );
      };

      const dispatch = (ev: { id: number; type: string; payload: unknown; sessionId?: string | null; channel?: string }) => {
        if (!isAllowedForGuest(ev)) return;
        if (ev.id > lastDispatchedId) {
          lastDispatchedId = ev.id;
        }
        try {
          const sseMessage = `id: ${ev.id}\nevent: ${ev.type}\ndata: ${JSON.stringify(ev.payload)}\n\n`;
          controller.enqueue(encoder.encode(sseMessage));
        } catch {
          // Stream already closed
        }
      };

      // 1. Initial replay from database
      if (lastDispatchedId > 0) {
        try {
          const pastEvents = await db
            .select()
            .from(events)
            .where(
              and(
                eq(events.restaurantId, guest.restaurantId),
                gt(events.id, lastDispatchedId)
              )
            )
            .orderBy(events.id)
            .limit(50);

          for (const ev of pastEvents) {
            dispatch({ id: ev.id, type: ev.type, payload: ev.payload, sessionId: ev.sessionId, channel: ev.channel });
          }
        } catch {}
      } else {
        try {
          const [latest] = await db
            .select({ id: events.id })
            .from(events)
            .where(eq(events.restaurantId, guest.restaurantId))
            .orderBy(sql`${events.id} desc`)
            .limit(1);
          if (latest) lastDispatchedId = latest.id;
        } catch {}
      }

      // 2. In-memory fast bus listener
      const onEvent = (ev: RealtimeEventPayload) => {
        if (ev.restaurantId !== guest.restaurantId) return;
        if (ev.id > lastDispatchedId) {
          dispatch(ev);
        }
      };
      bus.on('event', onEvent);

      // 3. Database delta poller (Cross-instance serverless sync on Vercel)
      const dbPollTimer = setInterval(async () => {
        try {
          const deltaEvents = await db
            .select()
            .from(events)
            .where(
              and(
                eq(events.restaurantId, guest.restaurantId),
                gt(events.id, lastDispatchedId)
              )
            )
            .orderBy(events.id)
            .limit(50);

          for (const ev of deltaEvents) {
            dispatch({ id: ev.id, type: ev.type, payload: ev.payload, sessionId: ev.sessionId, channel: ev.channel });
          }
        } catch {}
      }, 2000);

      // 4. Heartbeat every 15s to keep connection alive
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 15000);

      // 5. Gracefully close stream after 25s so EventSource reconnects cleanly before Vercel timeout
      const closeTimer = setTimeout(() => {
        try {
          controller.enqueue(encoder.encode('retry: 1000\n\n'));
          controller.close();
        } catch {}
      }, 25000);

      // 6. Clean up all resources immediately on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatTimer);
        clearInterval(dbPollTimer);
        clearTimeout(closeTimer);
        bus.off('event', onEvent);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
