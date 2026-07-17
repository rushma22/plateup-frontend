import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { OrderService } from '../../core/services/order.service';
import { routeParam } from '../../core/utils/route-param';
import { StatusStepsComponent } from '../../shared/components/status-steps/status-steps.component';

@Component({
  selector: 'app-status',
  templateUrl: './status.page.html',
  styleUrls: ['./status.page.scss'],
  imports: [
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
  ],
})
export class StatusPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  readonly restaurantSlug = routeParam(this.route, 'restaurantSlug', 'bistro-lane');
  readonly tableId = routeParam(this.route, 'tableId', '1');
  readonly orderId = routeParam(this.route, 'orderId', '');

  readonly order = this.orderService.selectOrder(this.orderId);
  readonly now = signal(Date.now());

  readonly minutesLeft = computed(() => {
    const order = this.order();
    if (!order) {
      return 0;
    }
    if (order.status === 'ready') {
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
    return 'Ready — on the way to your table';
  });

  private tick?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.tick = setInterval(() => this.now.set(Date.now()), 15_000);
  }

  ngOnDestroy(): void {
    if (this.tick) {
      clearInterval(this.tick);
    }
  }

  menuLink(): string[] {
    return ['/o', this.restaurantSlug, this.tableId, 'tabs', 'menu'];
  }

  ordersHref(): string {
    return `/o/${this.restaurantSlug}/${this.tableId}/tabs/orders`;
  }
}
