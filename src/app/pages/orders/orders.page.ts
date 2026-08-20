import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { DEFAULT_RESTAURANT_SLUG } from '../../core/constants';
import { OrderStatus } from '../../core/models/order.models';
import { OrderService } from '../../core/services/order.service';
import { TableSessionService } from '../../core/services/table-session.service';
import { guestRouteParams } from '../../core/utils/route-param';
import { SessionClosingBannerComponent } from '../../shared/components/session-closing-banner/session-closing-banner.component';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.page.html',
  styleUrls: ['./orders.page.scss'],
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    SessionClosingBannerComponent,
  ],
})
export class OrdersPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly orderService = inject(OrderService);
  readonly tableSession = inject(TableSessionService);

  private guest() {
    return guestRouteParams(this.router, this.route, DEFAULT_RESTAURANT_SLUG);
  }

  get restaurantSlug(): string {
    return this.guest().restaurantSlug;
  }

  get tableId(): string {
    return this.guest().tableId;
  }

  ngOnInit(): void {
    // Make sure we have a session so order history can load for this visit.
    this.tableSession
      .ensureSession(this.restaurantSlug, this.tableId)
      .subscribe();
  }

  menuLink(): string[] {
    const { restaurantSlug, tableId } = this.guest();
    return ['/o', restaurantSlug, tableId, 'tabs', 'menu'];
  }

  statusLink(orderId: string): string[] {
    const { restaurantSlug, tableId } = this.guest();
    return ['/o', restaurantSlug, tableId, 'status', orderId];
  }

  /** Short badge text for the orders list. */
  statusLabel(status: OrderStatus): string {
    if (status === 'received') {
      return 'Received';
    }
    if (status === 'preparing') {
      return 'Preparing';
    }
    if (status === 'ready') {
      return 'Ready';
    }
    if (status === 'completed') {
      return 'Done';
    }
    if (status === 'cancelled') {
      return 'Cancelled';
    }
    return 'Received';
  }

  statusHint(status: OrderStatus): string {
    if (status === 'ready') {
      return 'Ready · on the way to your table';
    }
    if (status === 'completed') {
      return 'Finished — enjoy your meal';
    }
    if (status === 'cancelled') {
      return 'This order was cancelled';
    }
    return '';
  }
}
