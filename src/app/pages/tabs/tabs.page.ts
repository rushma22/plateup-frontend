import { Component, OnInit, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import {
  IonBadge,
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bagHandleOutline,
  receiptOutline,
  restaurantOutline,
} from 'ionicons/icons';
import { filter, map, startWith } from 'rxjs';
import { DEFAULT_RESTAURANT_SLUG } from '../../core/constants';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { TableSessionService } from '../../core/services/table-session.service';
import { guestRouteParams } from '../../core/utils/route-param';

addIcons({ restaurantOutline, bagHandleOutline, receiptOutline });

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    IonBadge,
  ],
})
export class TabsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly cart = inject(CartService);
  readonly orders = inject(OrderService);
  readonly tableSession = inject(TableSessionService);

  /** Re-read slug/table from the URL whenever navigation happens (Ionic tabs). */
  private readonly guestParams = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() =>
        guestRouteParams(this.router, this.route, DEFAULT_RESTAURANT_SLUG)
      )
    ),
    {
      initialValue: guestRouteParams(
        this.router,
        this.route,
        DEFAULT_RESTAURANT_SLUG
      ),
    }
  );

  get restaurantSlug(): string {
    return this.guestParams().restaurantSlug;
  }

  get tableId(): string {
    return this.guestParams().tableId;
  }

  ngOnInit(): void {
    // Start (or recover) the table session as soon as the guest enters tabs.
    this.tableSession
      .ensureSession(this.restaurantSlug, this.tableId)
      .subscribe();
  }
}
