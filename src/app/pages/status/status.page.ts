import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { DEFAULT_RESTAURANT_SLUG } from '../../core/constants';
import { OrderRealtimeService } from '../../core/services/order-realtime.service';
import { OrderService } from '../../core/services/order.service';
import { TableSessionService } from '../../core/services/table-session.service';
import { guestRouteParams, routeParam } from '../../core/utils/route-param';
import { SessionClosingBannerComponent } from '../../shared/components/session-closing-banner/session-closing-banner.component';
import { StatusStepsComponent } from '../../shared/components/status-steps/status-steps.component';

@Component({
  selector: 'app-status',
  templateUrl: './status.page.html',
  styleUrls: ['./status.page.scss'],
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonButton,
    StatusStepsComponent,
    SessionClosingBannerComponent,
  ],
})
export class StatusPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly realtime = inject(OrderRealtimeService);
  readonly tableSession = inject(TableSessionService);

  private readonly guest = guestRouteParams(
    this.router,
    this.route,
    DEFAULT_RESTAURANT_SLUG
  );
  readonly restaurantSlug = this.guest.restaurantSlug;
  readonly tableId = this.guest.tableId;
  readonly orderId = routeParam(this.route, 'orderId', '');

  readonly order = this.orderService.selectOrder(this.orderId);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly now = signal(Date.now());

  readonly minutesLeft = computed(() => {
    const order = this.order();
    if (!order) {
      return 0;
    }
    if (
      order.status === 'ready' ||
      order.status === 'completed' ||
      order.status === 'cancelled'
    ) {
      return 0;
    }
    return Math.max(0, Math.ceil((order.readyAt - this.now()) / 60_000));
  });

  readonly statusMessage = computed(() => {
    const order = this.order();
    if (!order) {
      return 'Looking up your order…';
    }
    if (order.status === 'received') {
      return 'Kitchen got your order';
    }
    if (order.status === 'preparing') {
      return 'They’re cooking it now';
    }
    if (order.status === 'ready') {
      return 'Ready — on the way to your table';
    }
    if (order.status === 'completed') {
      return 'All done — enjoy your meal';
    }
    if (order.status === 'cancelled') {
      return 'This order was cancelled';
    }
    return 'Kitchen got your order';
  });

  /** Only for ETA clock display — not for advancing order status. */
  private etaTick?: ReturnType<typeof setInterval>;
  private stopWatching?: () => void;
  private pageActive = false;

  ngOnInit(): void {
    this.tableSession
      .ensureSession(this.restaurantSlug, this.tableId)
      .subscribe({
        next: () => this.startPage(),
        error: () => this.startPage(),
      });
  }

  ionViewWillEnter(): void {
    this.startPage();
  }

  ionViewDidLeave(): void {
    this.stopPage();
  }

  ngOnDestroy(): void {
    this.stopPage();
  }

  private startPage(): void {
    if (this.pageActive) {
      return;
    }
    this.pageActive = true;
    this.etaTick = setInterval(() => this.now.set(Date.now()), 15_000);
    this.fetchOrder();
    this.listenForKitchenUpdates();
  }

  private stopPage(): void {
    if (!this.pageActive) {
      return;
    }
    this.pageActive = false;
    if (this.etaTick) {
      clearInterval(this.etaTick);
      this.etaTick = undefined;
    }
    this.stopWatching?.();
    this.stopWatching = undefined;
  }

  menuLink(): string[] {
    const { restaurantSlug, tableId } = guestRouteParams(
      this.router,
      this.route,
      DEFAULT_RESTAURANT_SLUG
    );
    return ['/o', restaurantSlug, tableId, 'tabs', 'menu'];
  }

  ordersHref(): string {
    const { restaurantSlug, tableId } = guestRouteParams(
      this.router,
      this.route,
      DEFAULT_RESTAURANT_SLUG
    );
    return `/o/${restaurantSlug}/${tableId}/tabs/orders`;
  }

  /** Initial load + refresh support via GET /orders/:id. */
  private fetchOrder(): void {
    if (!this.orderId) {
      this.loading.set(false);
      this.loadError.set(true);
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);
    this.orderService
      .loadOrder(this.orderId, {
        restaurantSlug: this.restaurantSlug,
        restaurantName: this.tableSession.restaurantName() || undefined,
        sessionId: this.tableSession.sessionId() || undefined,
      })
      .subscribe({
        next: () => this.loading.set(false),
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }

  /**
   * Live updates: joinOrder(orderId) then orderStatusUpdated.
   * Shared socket — leaving this page does not kill table-session listeners.
   */
  private listenForKitchenUpdates(): void {
    if (!this.orderId) {
      return;
    }

    this.stopWatching = this.realtime.watchOrder(
      this.orderId,
      (payload) => this.orderService.applyStatusUpdate(payload),
      () => this.fetchOrder()
    );
  }
}
