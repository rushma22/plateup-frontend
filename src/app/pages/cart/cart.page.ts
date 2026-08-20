import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, removeOutline, trashOutline } from 'ionicons/icons';
import { DEFAULT_RESTAURANT_SLUG } from '../../core/constants';
import { CartService } from '../../core/services/cart.service';
import { guestRouteParams } from '../../core/utils/route-param';
import { SessionClosingBannerComponent } from '../../shared/components/session-closing-banner/session-closing-banner.component';

addIcons({ addOutline, removeOutline, trashOutline });

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  imports: [
    CurrencyPipe,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    SessionClosingBannerComponent,
  ],
})
export class CartPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly cart = inject(CartService);

  private readonly guest = guestRouteParams(
    this.router,
    this.route,
    DEFAULT_RESTAURANT_SLUG
  );
  readonly restaurantSlug = this.guest.restaurantSlug;
  readonly tableId = this.guest.tableId;

  bump(key: string, delta: number): void {
    const line = this.cart.lines().find((l) => l.key === key);
    if (!line) {
      return;
    }
    this.cart.updateQuantity(key, line.quantity + delta);
  }

  remove(key: string): void {
    this.cart.removeLine(key);
  }

  goConfirm(): void {
    const { restaurantSlug, tableId } = guestRouteParams(
      this.router,
      this.route,
      DEFAULT_RESTAURANT_SLUG
    );
    void this.router.navigate(['/o', restaurantSlug, tableId, 'confirm']);
  }

  menuLink(): string[] {
    const { restaurantSlug, tableId } = guestRouteParams(
      this.router,
      this.route,
      DEFAULT_RESTAURANT_SLUG
    );
    return ['/o', restaurantSlug, tableId, 'tabs', 'menu'];
  }
}
