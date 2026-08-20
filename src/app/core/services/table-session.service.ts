import { HttpErrorResponse } from '@angular/common/http';
import {
  Injectable,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import {
  TableSession,
  TableSessionStatus,
} from '../models/order.models';
import {
  formatCountdown,
  msUntilAutoClose,
} from '../utils/session-countdown';
import { CartService } from './cart.service';
import { OrderRealtimeService } from './order-realtime.service';
import { OrderService } from './order.service';
import { RestaurantApiService } from './restaurant-api.service';

interface StoredSessionRef {
  sessionId: string;
}

/**
 * Owns the guest’s current table visit (session).
 * Creates/validates the session, keeps sessionId in sessionStorage,
 * and reacts to closing / closed / reopened WebSocket events.
 */
@Injectable({ providedIn: 'root' })
export class TableSessionService implements OnDestroy {
  private readonly api = inject(RestaurantApiService);
  private readonly orders = inject(OrderService);
  private readonly cart = inject(CartService);
  private readonly realtime = inject(OrderRealtimeService);

  private readonly sessionSignal = signal<TableSession | null>(null);
  private readonly reviewUrlSignal = signal<string | null>(null);
  private readonly restaurantNameSignal = signal<string>('');
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal('');
  /** True after sessionClosed on this open page — do not auto-join again. */
  private readonly endedSignal = signal(false);
  private readonly nowSignal = signal(Date.now());

  private restaurantSlug = '';
  private tableId = '';
  private ensureInFlight: Observable<TableSession | null> | null = null;
  private stopWatching: (() => void) | null = null;
  private countdownTick: ReturnType<typeof setInterval> | null = null;

  readonly session = this.sessionSignal.asReadonly();
  readonly reviewUrl = this.reviewUrlSignal.asReadonly();
  readonly restaurantName = this.restaurantNameSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly sessionEnded = this.endedSignal.asReadonly();

  readonly sessionId = computed(() => this.sessionSignal()?.id ?? '');
  readonly status = computed(
    () => this.sessionSignal()?.status ?? null
  );
  readonly isClosing = computed(
    () => this.sessionSignal()?.status === 'CLOSING' && !this.endedSignal()
  );
  readonly isClosed = computed(() => this.endedSignal());
  readonly isReady = computed(
    () =>
      !!this.sessionSignal()?.id &&
      !this.endedSignal() &&
      this.sessionSignal()?.status !== 'CLOSED'
  );

  /** Milliseconds left until backend autoCloseAt (0 when not closing). */
  readonly msRemaining = computed(() => {
    if (!this.isClosing()) {
      return 0;
    }
    return msUntilAutoClose(
      this.sessionSignal()?.autoCloseAt,
      this.nowSignal()
    );
  });

  readonly countdownLabel = computed(() =>
    formatCountdown(this.msRemaining())
  );

  ngOnDestroy(): void {
    this.teardownWatch();
    this.stopCountdownTicker();
  }

  /**
   * Create or recover the table session for this QR visit.
   * Safe to call from multiple pages — shares one in-flight request.
   */
  ensureSession(
    restaurantSlug: string,
    tableId: string
  ): Observable<TableSession | null> {
    if (!restaurantSlug || !tableId) {
      return throwError(() => new Error('Missing restaurant or table.'));
    }

    // Same table already loaded and still valid.
    const current = this.sessionSignal();
    if (
      current &&
      !this.endedSignal() &&
      this.restaurantSlug === restaurantSlug &&
      this.tableId === tableId &&
      current.status !== 'CLOSED'
    ) {
      return of(current);
    }

    // After sessionClosed on this page — stay on the “cleared” screen.
    if (
      this.endedSignal() &&
      this.restaurantSlug === restaurantSlug &&
      this.tableId === tableId
    ) {
      return of(null);
    }

    if (
      this.ensureInFlight &&
      this.restaurantSlug === restaurantSlug &&
      this.tableId === tableId
    ) {
      return this.ensureInFlight;
    }

    this.restaurantSlug = restaurantSlug;
    this.tableId = tableId;
    this.endedSignal.set(false);
    this.errorSignal.set('');
    this.loadingSignal.set(true);

    this.ensureInFlight = this.loadRestaurantMeta(restaurantSlug).pipe(
      switchMap(() => this.resolveSession(restaurantSlug, tableId)),
      tap((session) => {
        if (session) {
          this.applySession(session, restaurantSlug, tableId);
          this.loadSessionOrders(restaurantSlug, tableId, session.id);
          this.startRealtime(restaurantSlug, tableId, session.id);
        }
      }),
      catchError((err: unknown) => {
        this.errorSignal.set(this.messageForSessionError(err));
        return of(null);
      }),
      finalize(() => {
        this.loadingSignal.set(false);
        this.ensureInFlight = null;
      }),
      // Multiple pages may call ensureSession at once — share one HTTP round-trip.
      shareReplay({ bufferSize: 1, refCount: true })
    );

    return this.ensureInFlight;
  }

  /** After a successful order — refresh session (may reopen from CLOSING). */
  refreshAfterOrder(): Observable<TableSession | null> {
    const session = this.sessionSignal();
    if (!session || !this.restaurantSlug || !this.tableId) {
      return of(null);
    }
    return this.api
      .getSession(this.restaurantSlug, this.tableId, session.id)
      .pipe(
        tap((fresh) => this.applySession(fresh, this.restaurantSlug, this.tableId)),
        catchError(() => of(session))
      );
  }

  /** Storage key so a refresh can find the same visit. */
  storageKey(restaurantSlug: string, tableId: string): string {
    return `plateup.tableSession.${restaurantSlug}.${tableId}`;
  }

  readStoredSessionId(
    restaurantSlug: string,
    tableId: string
  ): string | null {
    try {
      const raw = sessionStorage.getItem(
        this.storageKey(restaurantSlug, tableId)
      );
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as StoredSessionRef;
      return parsed.sessionId || null;
    } catch {
      return null;
    }
  }

  private writeStoredSessionId(
    restaurantSlug: string,
    tableId: string,
    sessionId: string
  ): void {
    const payload: StoredSessionRef = { sessionId };
    sessionStorage.setItem(
      this.storageKey(restaurantSlug, tableId),
      JSON.stringify(payload)
    );
  }

  private clearStoredSession(
    restaurantSlug: string,
    tableId: string
  ): void {
    sessionStorage.removeItem(this.storageKey(restaurantSlug, tableId));
  }

  private resolveSession(
    restaurantSlug: string,
    tableId: string
  ): Observable<TableSession | null> {
    const storedId = this.readStoredSessionId(restaurantSlug, tableId);
    if (!storedId) {
      return this.api.createOrGetSession(restaurantSlug, tableId);
    }

    return this.api.getSession(restaurantSlug, tableId, storedId).pipe(
      switchMap((session) => {
        if (session.status === 'CLOSED') {
          // Stale id after a closed visit — start fresh for the next guest.
          this.clearStoredSession(restaurantSlug, tableId);
          return this.api.createOrGetSession(restaurantSlug, tableId);
        }
        return of(session);
      }),
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          this.clearStoredSession(restaurantSlug, tableId);
          return this.api.createOrGetSession(restaurantSlug, tableId);
        }
        return throwError(() => err);
      })
    );
  }

  private loadRestaurantMeta(slug: string): Observable<void> {
    return this.api.getRestaurant(slug).pipe(
      tap((restaurant) => {
        this.restaurantNameSignal.set(restaurant.name ?? '');
        const url = restaurant.reviewUrl?.trim() || null;
        this.reviewUrlSignal.set(url);
      }),
      map(() => undefined),
      catchError(() => {
        // Review link is optional — session can still work without it.
        return of(undefined);
      })
    );
  }

  private applySession(
    session: TableSession,
    restaurantSlug: string,
    tableId: string
  ): void {
    this.sessionSignal.set(session);
    this.writeStoredSessionId(restaurantSlug, tableId, session.id);
    this.orders.setActiveScope({
      restaurantSlug,
      tableId,
      sessionId: session.id,
    });

    if (session.status === 'CLOSING' && session.autoCloseAt) {
      this.startCountdownTicker();
    } else {
      this.stopCountdownTicker();
    }

    if (session.status === 'OPEN') {
      // New order (or refresh) may have reopened the session.
      this.stopCountdownTicker();
    }
  }

  private loadSessionOrders(
    restaurantSlug: string,
    tableId: string,
    sessionId: string
  ): void {
    this.api
      .getSessionOrders(restaurantSlug, tableId, sessionId)
      .subscribe({
        next: (apiOrders) => {
          this.orders.replaceSessionOrders(
            { restaurantSlug, tableId, sessionId },
            apiOrders,
            this.restaurantNameSignal()
          );
        },
        error: () => {
          // Keep any in-memory orders if the list endpoint fails.
          this.orders.setActiveScope({
            restaurantSlug,
            tableId,
            sessionId,
          });
        },
      });
  }

  private startRealtime(
    restaurantSlug: string,
    tableId: string,
    sessionId: string
  ): void {
    this.teardownWatch();
    this.stopWatching = this.realtime.watchTableSession(
      { restaurantSlug, tableId, sessionId },
      {
        onOrderStatusUpdated: (payload) =>
          this.orders.applyStatusUpdate(payload),
        onSessionClosing: (payload) => {
          const current = this.sessionSignal();
          if (!current || current.id !== payload.sessionId) {
            return;
          }
          this.sessionSignal.set({
            ...current,
            status: 'CLOSING' as TableSessionStatus,
            autoCloseAt: payload.autoCloseAt,
          });
          this.startCountdownTicker();
        },
        onSessionClosed: (payload) => {
          this.handleSessionClosed(payload.sessionId);
        },
        onSessionReopened: () => {
          this.markSessionOpen();
        },
        onReconnect: () => {
          const current = this.sessionSignal();
          if (!current) {
            return;
          }
          this.api
            .getSession(restaurantSlug, tableId, current.id)
            .subscribe({
              next: (fresh) => {
                if (fresh.status === 'CLOSED') {
                  this.handleSessionClosed(fresh.id);
                  return;
                }
                this.applySession(fresh, restaurantSlug, tableId);
              },
            });
        },
      }
    );
  }

  /** Hide countdown when the session is OPEN again. */
  markSessionOpen(): void {
    const current = this.sessionSignal();
    if (!current || this.endedSignal()) {
      return;
    }
    this.sessionSignal.set({
      ...current,
      status: 'OPEN',
      autoCloseAt: null,
    });
    this.stopCountdownTicker();
  }

  /** Called when the backend ends this table visit. */
  handleSessionClosed(sessionId: string): void {
    if (this.endedSignal()) {
      return;
    }
    this.endedSignal.set(true);
    this.stopCountdownTicker();
    this.teardownWatch();
    this.cart.clear();
    this.orders.clearOrdersForSession(sessionId);
    if (this.restaurantSlug && this.tableId) {
      this.clearStoredSession(this.restaurantSlug, this.tableId);
    }
    const current = this.sessionSignal();
    if (current) {
      this.sessionSignal.set({
        ...current,
        status: 'CLOSED',
        autoCloseAt: null,
      });
    }
  }

  private startCountdownTicker(): void {
    if (this.countdownTick) {
      return;
    }
    this.nowSignal.set(Date.now());
    this.countdownTick = setInterval(() => {
      this.nowSignal.set(Date.now());
    }, 1000);
  }

  private stopCountdownTicker(): void {
    if (this.countdownTick) {
      clearInterval(this.countdownTick);
      this.countdownTick = null;
    }
  }

  private teardownWatch(): void {
    this.stopWatching?.();
    this.stopWatching = null;
  }

  private messageForSessionError(err: unknown): string {
    const http = err instanceof HttpErrorResponse ? err : null;
    if (http?.status === 0) {
      return 'Cannot reach the restaurant server. Check that the backend is running.';
    }
    const apiMessage =
      typeof http?.error?.message === 'string' ? http.error.message : '';
    return apiMessage || 'Could not start your table session. Please try again.';
  }
}
