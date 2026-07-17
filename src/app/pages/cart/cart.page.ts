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
import { CartService } from '../../core/services/cart.service';
import { routeParam } from '../../core/utils/route-param';

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
  ],
})
export class CartPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly cart = inject(CartService);

  readonly restaurantSlug = routeParam(this.route, 'restaurantSlug', 'bistro-lane');
  readonly tableId = routeParam(this.route, 'tableId', '1');

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
    void this.router.navigate([
      '/o',
      this.restaurantSlug,
      this.tableId,
      'confirm',
    ]);
  }

  menuLink(): string[] {
    return ['/o', this.restaurantSlug, this.tableId, 'tabs', 'menu'];
  }
}
