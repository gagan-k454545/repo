import { EventEmitter } from 'events';
import { db } from '@/db/client';
import { events } from '@/db/schema';
import { gt, eq, and, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export interface RealtimeEventPayload {
  id: number;
  restaurantId: string;
  channel: string;
  type: string;
  sessionId?: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export class RealtimeBus extends EventEmitter {
  private lastDispatchedId = 0;
  private isPolling = false;
  private pollerTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setMaxListeners(500);
  }

  public init() {
    if (this.pollerTimer) return;
    logger.info('Initializing Realtime Event Bus...');

    // Poll every 1 second as safety fallback
    this.pollerTimer = setInterval(() => {
      this.poll().catch((err) => {
        logger.error({ err }, 'Realtime poll error');
      });
    }, 1000);
  }

  public wake() {
    setImmediate(() => {
      this.poll().catch((err) => {
        logger.error({ err }, 'Realtime wake poll error');
      });
    });
  }

  private async poll() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      // Find latest events > lastDispatchedId
      const newEvents = await db
        .select()
        .from(events)
        .where(gt(events.id, this.lastDispatchedId))
        .orderBy(events.id)
        .limit(100);

      for (const ev of newEvents) {
        if (ev.id > this.lastDispatchedId) {
          this.lastDispatchedId = ev.id;
        }

        const eventData: RealtimeEventPayload = {
          id: ev.id,
          restaurantId: ev.restaurantId,
          channel: ev.channel,
          type: ev.type,
          sessionId: ev.sessionId,
          payload: ev.payload as Record<string, unknown>,
          createdAt: ev.createdAt,
        };

        // Emit globally and to specific channels
        this.emit('event', eventData);
        this.emit(`channel:${ev.channel}`, eventData);
        if (ev.sessionId) {
          this.emit(`session:${ev.sessionId}`, eventData);
        }
      }
    } catch (err) {
      // Transient DB errors during shutdown or connection drop
    } finally {
      this.isPolling = false;
    }
  }

  public stop() {
    if (this.pollerTimer) {
      clearInterval(this.pollerTimer);
      this.pollerTimer = null;
    }
  }
}

// Ensure singleton instance on globalThis
const globalForRealtime = globalThis as unknown as {
  realtimeBus?: RealtimeBus;
};

export const bus = globalForRealtime.realtimeBus || new RealtimeBus();

if (process.env.NODE_ENV !== 'production') {
  globalForRealtime.realtimeBus = bus;
}
