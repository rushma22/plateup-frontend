import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap, throwError } from 'rxjs';
import { DEFAULT_PREP_MINUTES } from '../constants';
import {
  ApiOrder,
  ApiOrderStatus,
  CartLine,
  CartLineModifier,
  CreateOrderBody,
  CustomerDetails,
  OrderStatus,
  OrderStatusUpdatedPayload,
  PlacedOrder,
} from '../models/order.models';
import { RestaurantApiService } from './restaurant-api.service';

/** Which restaurant/table/session the guest UI is currently showing. */
export interface OrderScope {
  restaurantSlug: string;
  tableId: string;
  sessionId: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(RestaurantApiService);
  private readonly orders = signal<Map<string, PlacedOrder>>(new Map());
  private readonly scope = signal<OrderScope | null>(null);

  /**
   * Orders for the active restaurant + table + session only.
   * Older visits at the same table never appear here.
   */
  readonly ordersList = computed(() => {
    const scope = this.scope();
    const all = [...this.orders().values()];
    const filtered = scope
      ? all.filter(
          (o) =>
            o.restaurantSlug === scope.restaurantSlug &&
            o.tableId === scope.tableId &&
            o.sessionId === scope.sessionId
        )
      : [];
    return filtered.sort((a, b) => b.placedAt - a.placedAt);
  });

  /** Orders still in the kitchen (not ready / done / cancelled). */
  readonly activeCount = computed(
    () =>
      this.ordersList().filter(
        (o) =>
          o.status !== 'ready' &&
          o.status !== 'completed' &&
          o.status !== 'cancelled'
      ).length
  );

  /** Tell the UI which session’s orders to show. */
  setActiveScope(scope: OrderScope | null): void {
    this.scope.set(scope);
  }

  getActiveScope(): OrderScope | null {
    return this.scope();
  }

  /** Reactive snapshot of a single order for the status screen. */
  selectOrder(orderId: string) {
    return computed(() => this.orders().get(orderId));
  }

  /**
   * Create a real DB order tied to the current table session.
   * Customer name/phone go into order notes because the API body is item-based.
   */
  placeOrder(input: {
    restaurantSlug: string;
    restaurantName?: string;
    tableId: string;
    sessionId: string;
    lines: CartLine[];
    note: string;
    customer: CustomerDetails;
  }): Observable<PlacedOrder> {
    if (!input.sessionId) {
      return throwError(
        () => new Error('A valid table session is required before ordering.')
      );
    }

    const body = this.buildCreateBody(
      input.lines,
      input.note,
      input.customer,
      input.sessionId
    );

    return this.api
      .createOrder(input.restaurantSlug, input.tableId, body)
      .pipe(
        map((apiOrder) =>
          this.mapApiOrder(apiOrder, {
            restaurantSlug: input.restaurantSlug,
            restaurantName: input.restaurantName,
            customer: input.customer,
            sessionId: input.sessionId,
          })
        ),
        tap((order) => this.cacheOrder(order))
      );
  }

  /** Load an order from the API (needed after a page refresh). */
  loadOrder(
    orderId: string,
    context: {
      restaurantSlug: string;
      restaurantName?: string;
      sessionId?: string;
    } = {
      restaurantSlug: '',
    }
  ): Observable<PlacedOrder> {
    return this.api.getOrder(orderId).pipe(
      map((apiOrder) =>
        this.mapApiOrder(apiOrder, {
          restaurantSlug: context.restaurantSlug,
          restaurantName: context.restaurantName,
          sessionId: context.sessionId ?? apiOrder.sessionId ?? '',
        })
      ),
      tap((order) => this.cacheOrder(order))
    );
  }

  /**
   * Replace in-memory orders for a session with the server list.
   * Used after joining a session so refresh recovery shows the right history.
   */
  replaceSessionOrders(
    scope: OrderScope,
    apiOrders: ApiOrder[],
    restaurantName?: string
  ): void {
    this.orders.update((map) => {
      const next = new Map(map);
      for (const [id, order] of next) {
        if (
          order.restaurantSlug === scope.restaurantSlug &&
          order.tableId === scope.tableId &&
          order.sessionId === scope.sessionId
        ) {
          next.delete(id);
        }
      }
      for (const api of apiOrders) {
        const mapped = this.mapApiOrder(api, {
          restaurantSlug: scope.restaurantSlug,
          restaurantName,
          sessionId: api.sessionId ?? scope.sessionId,
        });
        next.set(mapped.id, mapped);
      }
      return next;
    });
    this.setActiveScope(scope);
  }

  /** Remove displayed orders when a session is closed. */
  clearOrdersForSession(sessionId: string): void {
    this.orders.update((map) => {
      const next = new Map(map);
      for (const [id, order] of next) {
        if (order.sessionId === sessionId) {
          next.delete(id);
        }
      }
      return next;
    });
    const scope = this.scope();
    if (scope?.sessionId === sessionId) {
      this.scope.set(null);
    }
  }

  getOrder(orderId: string): PlacedOrder | undefined {
    return this.orders().get(orderId);
  }

  /** Apply a live kitchen status change from Socket.IO. */
  applyStatusUpdate(payload: OrderStatusUpdatedPayload): void {
    this.orders.update((map) => {
      const current = map.get(payload.id);
      if (!current) {
        return map;
      }
      const next = new Map(map);
      next.set(payload.id, {
        ...current,
        status: this.mapApiStatus(payload.status),
        tableId: payload.tableId || current.tableId,
      });
      return next;
    });
  }

  /**
   * Shared mapping: backend status → guest UI status.
   * COMPLETED stays completed (not ready). CANCELLED stays cancelled.
   */
  mapApiStatus(status: ApiOrderStatus): OrderStatus {
    if (status === 'PENDING' || status === 'CONFIRMED') {
      return 'received';
    }
    if (status === 'PREPARING') {
      return 'preparing';
    }
    if (status === 'READY') {
      return 'ready';
    }
    if (status === 'COMPLETED') {
      return 'completed';
    }
    if (status === 'CANCELLED') {
      return 'cancelled';
    }
    return 'received';
  }

  private buildCreateBody(
    lines: CartLine[],
    kitchenNote: string,
    customer: CustomerDetails,
    sessionId: string
  ): CreateOrderBody {
    const guest = `Guest: ${customer.name.trim()}, ${customer.phone.trim()}`;
    const trimmedKitchen = kitchenNote.trim();
    const notes = trimmedKitchen ? `${guest}; ${trimmedKitchen}` : guest;

    return {
      items: lines.map((line) => ({
        menuItemId: line.itemId,
        quantity: line.quantity,
        notes: this.stringifyModifiers(line.modifiers),
      })),
      notes,
      sessionId,
    };
  }

  /** Turn selected modifiers into a short line note for the kitchen. */
  private stringifyModifiers(modifiers: CartLineModifier[]): string {
    if (!modifiers.length) {
      return '';
    }
    return modifiers.map((m) => m.label).join(', ');
  }

  private mapApiOrder(
    api: ApiOrder,
    context: {
      restaurantSlug: string;
      restaurantName?: string;
      customer?: CustomerDetails;
      sessionId?: string;
    }
  ): PlacedOrder {
    const placedAt = Date.parse(api.createdAt) || Date.now();
    const estimatedMinutes = DEFAULT_PREP_MINUTES;
    const parsed = this.parseGuestFromNotes(api.notes);
    const customer: CustomerDetails = context.customer ??
      parsed ?? { name: 'Guest', phone: '' };

    const lines: CartLine[] = (api.items ?? []).map((item) => ({
      key: item.id,
      itemId: item.menuItemId,
      name: item.name,
      unitPrice: Number(item.unitPrice ?? item.price ?? 0),
      quantity: item.quantity,
      imageUrl: '',
      modifiers: this.parseModifiersFromNotes(item.notes),
      prepMinutes: estimatedMinutes,
    }));

    return {
      id: api.id,
      shortCode: api.id.slice(-4).toUpperCase(),
      restaurantSlug: context.restaurantSlug,
      restaurantName:
        context.restaurantName ??
        (context.restaurantSlug
          ? this.titleFromSlug(context.restaurantSlug)
          : 'Restaurant'),
      tableId: api.tableId,
      sessionId: context.sessionId || api.sessionId || '',
      lines,
      note: api.notes ?? '',
      customer,
      subtotal: lines.reduce(
        (sum, line) => sum + line.unitPrice * line.quantity,
        0
      ),
      status: this.mapApiStatus(api.status),
      estimatedMinutes,
      placedAt,
      readyAt: placedAt + estimatedMinutes * 60_000,
    };
  }

  /** Item notes from create-order are comma-separated modifier labels. */
  private parseModifiersFromNotes(notes: string | null): CartLineModifier[] {
    if (!notes?.trim()) {
      return [];
    }
    return notes
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean)
      .map((label, index) => ({
        groupId: 'notes',
        optionId: `${index}-${label}`,
        label,
        priceDelta: 0,
      }));
  }

  /** Read "Guest: Name, phone" from order notes when reloading. */
  private parseGuestFromNotes(
    notes: string | null
  ): CustomerDetails | undefined {
    if (!notes) {
      return undefined;
    }
    const match = notes.match(/^Guest:\s*([^,]+),\s*([^;]+)/i);
    if (!match) {
      return undefined;
    }
    return {
      name: match[1].trim(),
      phone: match[2].trim(),
    };
  }

  private titleFromSlug(slug: string): string {
    return slug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private cacheOrder(order: PlacedOrder): void {
    this.orders.update((map) => {
      const next = new Map(map);
      next.set(order.id, order);
      return next;
    });
  }
}
