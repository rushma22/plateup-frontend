import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { routeParam } from '../../core/utils/route-param';

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
export class TabsPage {
  private readonly route = inject(ActivatedRoute);
  readonly cart = inject(CartService);
  readonly orders = inject(OrderService);

  readonly restaurantSlug = routeParam(this.route, 'restaurantSlug', 'bistro-lane');
  readonly tableId = routeParam(this.route, 'tableId', '1');
}
