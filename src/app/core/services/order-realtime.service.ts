import { Injectable, NgZone, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import {
  OrderStatusUpdatedPayload,
  SessionClosedPayload,
  SessionClosingPayload,
} from '../models/order.models';

export interface TableSessionWatchHandlers {
  onOrderStatusUpdated: (payload: OrderStatusUpdatedPayload) => void;
  onSessionClosing: (payload: SessionClosingPayload) => void;
  onSessionClosed: (payload: SessionClosedPayload) => void;
  /** Optional: session went back to OPEN (e.g. new order during countdown). */
  onSessionReopened?: (payload: {
    sessionId: string;
    tableId: string;
  }) => void;
  onReconnect?: () => void;
}

/**
 * Live updates via Socket.IO.
 * One shared connection — pages release their watch without killing it
 * while another page (or the session service) still needs it.
 */
@Injectable({ providedIn: 'root' })
export class OrderRealtimeService {
  private readonly zone = inject(NgZone);
  private socket: Socket | null = null;
  /** How many active watchers are using the shared socket. */
  private refCount = 0;

  /**
   * Join an order room and listen for status changes.
   * Returns a cleanup function (call on page leave).
   */
  watchOrder(
    orderId: string,
    onUpdate: (payload: OrderStatusUpdatedPayload) => void,
    onReconnect: () => void
  ): () => void {
    const socket = this.acquire();
    let hasConnected = false;
    let active = true;

    const handler = (payload: OrderStatusUpdatedPayload) => {
      if (!payload?.id || payload.id !== orderId) {
        return;
      }
      this.zone.run(() => onUpdate(payload));
    };

    /** Backend expects the raw order id string, not { orderId }. */
    const join = (): void => {
      socket.emit('joinOrder', orderId, (response: unknown) => {
        if (active) {
          console.log('[Order socket] Join response:', response);
        }
      });

      if (hasConnected) {
        this.zone.run(onReconnect);
      }
      hasConnected = true;
    };

    socket.on('orderStatusUpdated', handler);
    socket.on('connect', join);
    if (socket.connected) {
      join();
    } else {
      socket.connect();
    }

    return () => {
      active = false;
      socket.off('orderStatusUpdated', handler);
      socket.off('connect', join);
      this.release();
    };
  }

  /**
   * Join the table/session room for this visit.
   * Handles orderStatusUpdated + sessionClosing + sessionClosed.
   */
  watchTableSession(
    context: { restaurantSlug: string; tableId: string; sessionId: string },
    handlers: TableSessionWatchHandlers
  ): () => void {
    const socket = this.acquire();
    let hasConnected = false;
    let active = true;

    const onOrder = (payload: OrderStatusUpdatedPayload) => {
      if (!payload?.id) {
        return;
      }
      if (payload.tableId && payload.tableId !== context.tableId) {
        return;
      }
      this.zone.run(() => handlers.onOrderStatusUpdated(payload));
    };

    const onClosing = (payload: SessionClosingPayload) => {
      if (!payload?.sessionId || payload.sessionId !== context.sessionId) {
        return;
      }
      this.zone.run(() => handlers.onSessionClosing(payload));
    };

    const onClosed = (payload: SessionClosedPayload) => {
      if (!payload?.sessionId || payload.sessionId !== context.sessionId) {
        return;
      }
      this.zone.run(() => handlers.onSessionClosed(payload));
    };

    const onReopened = (payload: {
      sessionId: string;
      tableId: string;
      status?: string;
    }) => {
      if (!payload?.sessionId || payload.sessionId !== context.sessionId) {
        return;
      }
      if (payload.status && payload.status !== 'OPEN') {
        return;
      }
      this.zone.run(() => handlers.onSessionReopened?.(payload));
    };

    const join = (): void => {
      // Table room (existing backend) + session room (session events).
      socket.emit(
        'joinTable',
        {
          slug: context.restaurantSlug,
          tableId: context.tableId,
          sessionId: context.sessionId,
        },
        (response: unknown) => {
          if (active) {
            console.log('[Session socket] joinTable response:', response);
          }
        }
      );
      socket.emit(
        'joinSession',
        {
          sessionId: context.sessionId,
          slug: context.restaurantSlug,
          tableId: context.tableId,
        },
        (response: unknown) => {
          if (active) {
            console.log('[Session socket] joinSession response:', response);
          }
        }
      );

      if (hasConnected) {
        this.zone.run(() => handlers.onReconnect?.());
      }
      hasConnected = true;
    };

    socket.on('orderStatusUpdated', onOrder);
    socket.on('sessionClosing', onClosing);
    socket.on('sessionClosed', onClosed);
    // Some backends may emit sessionUpdated / sessionReopened when reopened.
    socket.on('sessionReopened', onReopened);
    socket.on('sessionUpdated', onReopened);
    socket.on('connect', join);

    if (socket.connected) {
      join();
    } else {
      socket.connect();
    }

    return () => {
      active = false;
      socket.off('orderStatusUpdated', onOrder);
      socket.off('sessionClosing', onClosing);
      socket.off('sessionClosed', onClosed);
      socket.off('sessionReopened', onReopened);
      socket.off('sessionUpdated', onReopened);
      socket.off('connect', join);
      this.release();
    };
  }

  private acquire(): Socket {
    this.refCount += 1;
    return this.getSocket();
  }

  /** Drop one watcher; only disconnect when nobody is listening. */
  private release(): void {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0 && this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private getSocket(): Socket {
    if (!this.socket) {
      this.socket = io(environment.apiUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: false,
      });
    }
    return this.socket;
  }
}
