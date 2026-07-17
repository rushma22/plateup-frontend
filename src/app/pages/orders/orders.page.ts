import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { OrderStatus } from '../../core/models/order.models';
import { OrderService } from '../../core/services/order.service';
import { routeParam } from '../../core/utils/route-param';

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
  ],
})
export class OrdersPage {
  private readonly route = inject(ActivatedRoute);
  readonly orderService = inject(OrderService);

  readonly restaurantSlug = routeParam(this.route, 'restaurantSlug', 'bistro-lane');
  readonly tableId = routeParam(this.route, 'tableId', '1');

  menuLink(): string[] {
    return ['/o', this.restaurantSlug, this.tableId, 'tabs', 'menu'];
  }

  statusLink(orderId: string): string[] {
    return ['/o', this.restaurantSlug, this.tableId, 'status', orderId];
  }

  statusLabel(status: OrderStatus): string {
    if (status === 'received') {
      return 'Received';
    }
    if (status === 'preparing') {
      return 'Preparing';
    }
    return 'Ready';
  }
}
