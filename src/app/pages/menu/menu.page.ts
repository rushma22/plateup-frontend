import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline } from 'ionicons/icons';
import {
  MOCK_CATEGORIES,
  MOCK_ITEMS,
  getRestaurantBySlug,
} from '../../core/mocks/menu.mock';
import { CartLineModifier, MenuItem } from '../../core/models/order.models';
import { CartService } from '../../core/services/cart.service';
import { routeParam } from '../../core/utils/route-param';
import { CartBarComponent } from '../../shared/components/cart-bar/cart-bar.component';
import { ItemSheetComponent } from '../../shared/components/item-sheet/item-sheet.component';

addIcons({ addOutline });

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
  imports: [
    CurrencyPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonModal,
    CartBarComponent,
    ItemSheetComponent,
  ],
})
export class MenuPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly cart = inject(CartService);

  readonly restaurantSlug = routeParam(this.route, 'restaurantSlug', 'bistro-lane');
  readonly tableId = routeParam(this.route, 'tableId', '1');
  readonly restaurant = getRestaurantBySlug(this.restaurantSlug);

  readonly categories = MOCK_CATEGORIES;
  readonly activeCategory = signal(MOCK_CATEGORIES[0]?.id ?? '');
  readonly selectedItem = signal<MenuItem | null>(null);

  readonly visibleItems = computed(() =>
    MOCK_ITEMS.filter((item) => item.categoryId === this.activeCategory())
  );

  selectCategory(id: string): void {
    this.activeCategory.set(id);
  }

  openItem(item: MenuItem): void {
    this.selectedItem.set(item);
  }

  closeItem(): void {
    this.selectedItem.set(null);
  }

  onAdd(payload: { quantity: number; modifiers: CartLineModifier[] }): void {
    const item = this.selectedItem();
    if (!item) {
      return;
    }
    this.cart.addItem(item, payload.quantity, payload.modifiers);
    this.closeItem();
  }

  quickAdd(event: Event, item: MenuItem): void {
    event.stopPropagation();
    if (item.modifiers?.length) {
      this.openItem(item);
      return;
    }
    this.cart.addItem(item, 1);
  }

  goToCart(): void {
    void this.router.navigate([
      '/o',
      this.restaurantSlug,
      this.tableId,
      'tabs',
      'cart',
    ]);
  }
}
