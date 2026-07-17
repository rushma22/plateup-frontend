import { Injectable, computed, signal } from '@angular/core';
import {
  CartLine,
  CustomerDetails,
  OrderStatus,
  PlacedOrder,
} from '../models/order.models';
import { getRestaurantBySlug } from '../mocks/menu.mock';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly orders = signal<Map<string, PlacedOrder>>(new Map());
  private timers = new Map<string, ReturnType<typeof setInterval>>();

  /** All placed orders, newest first. */
  readonly ordersList = computed(() =>
    [...this.orders().values()].sort((a, b) => b.placedAt - a.placedAt)
  );

  /** Orders still in kitchen (not ready yet). */
  readonly activeCount = computed(
    () => this.ordersList().filter((o) => o.status !== 'ready').length
  );

  /** Reactive snapshot of a single order for the status screen. */
  selectOrder(orderId: string) {
    return computed(() => this.orders().get(orderId));
  }

  placeOrder(input: {
    restaurantSlug: string;
    tableId: string;
    lines: CartLine[];
    note: string;
    customer: CustomerDetails;
    estimatedMinutes: number;
  }): PlacedOrder {
    const restaurant = getRestaurantBySlug(input.restaurantSlug);
    const id = `ord_${Date.now().toString(36)}`;
    const shortCode = this.makeShortCode();
    const estimatedMinutes = Math.max(10, input.estimatedMinutes || 15);
    const placedAt = Date.now();
    const customer: CustomerDetails = {
      name: input.customer.name.trim(),
      phone: input.customer.phone.trim(),
      ...(input.customer.email?.trim()
        ? { email: input.customer.email.trim() }
        : {}),
    };

    const order: PlacedOrder = {
      id,
      shortCode,
      restaurantSlug: input.restaurantSlug,
      restaurantName: restaurant?.name ?? 'Restaurant',
      tableId: input.tableId,
      lines: input.lines.map((line) => ({ ...line })),
      note: input.note,
      customer,
      subtotal: input.lines.reduce(
        (sum, line) => sum + line.unitPrice * line.quantity,
        0
      ),
      status: 'received',
      estimatedMinutes,
      placedAt,
      readyAt: placedAt + estimatedMinutes * 60_000,
    };

    this.orders.update((map) => {
      const next = new Map(map);
      next.set(id, order);
      return next;
    });

    this.startMockProgression(id);
    return order;
  }

  getOrder(orderId: string): PlacedOrder | undefined {
    return this.orders().get(orderId);
  }

  private startMockProgression(orderId: string): void {
    this.clearTimer(orderId);

    const timer = setInterval(() => {
      const order = this.orders().get(orderId);
      if (!order) {
        this.clearTimer(orderId);
        return;
      }

      const nextStatus = this.nextStatus(order.status);
      if (!nextStatus) {
        this.clearTimer(orderId);
        return;
      }

      this.orders.update((map) => {
        const current = map.get(orderId);
        if (!current) {
          return map;
        }
        const next = new Map(map);
        next.set(orderId, { ...current, status: nextStatus });
        return next;
      });

      if (nextStatus === 'ready') {
        this.clearTimer(orderId);
      }
    }, 8_000);

    this.timers.set(orderId, timer);
  }

  private nextStatus(status: OrderStatus): OrderStatus | null {
    if (status === 'received') {
      return 'preparing';
    }
    if (status === 'preparing') {
      return 'ready';
    }
    return null;
  }

  private clearTimer(orderId: string): void {
    const timer = this.timers.get(orderId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(orderId);
    }
  }

  private makeShortCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
  }
}
