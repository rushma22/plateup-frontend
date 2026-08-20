import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { catchError, of } from 'rxjs';
import { DEFAULT_RESTAURANT_SLUG } from '../../core/constants';
import { CartLineModifier, MenuItem } from '../../core/models/order.models';
import { CartService } from '../../core/services/cart.service';
import { RestaurantApiService } from '../../core/services/restaurant-api.service';
import { guestRouteParams } from '../../core/utils/route-param';
import { CartBarComponent } from '../../shared/components/cart-bar/cart-bar.component';
import { ItemSheetComponent } from '../../shared/components/item-sheet/item-sheet.component';
import { SessionClosingBannerComponent } from '../../shared/components/session-closing-banner/session-closing-banner.component';

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
    SessionClosingBannerComponent,
  ],
})
export class MenuPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly restaurantApi = inject(RestaurantApiService);
  readonly cart = inject(CartService);

  private readonly guest = guestRouteParams(
    this.router,
    this.route,
    DEFAULT_RESTAURANT_SLUG
  );
  readonly restaurantSlug = this.guest.restaurantSlug;
  readonly tableId = this.guest.tableId;

  readonly menuError = signal('');

  /** Live menu from GET /restaurants/:slug/menu. */
  readonly menu = toSignal(
    this.restaurantApi.getMenu(this.restaurantSlug).pipe(
      catchError((error: unknown) => {
        this.menuError.set(
          error instanceof HttpErrorResponse && error.status === 0
            ? 'Cannot reach the restaurant server. Please check that the backend is running and that this device is using the correct server address.'
            : 'Could not load the menu. Please try again.'
        );
        return of(undefined);
      })
    )
  );

  readonly restaurantName = computed(
    () => this.menu()?.restaurant.name ?? 'PlateUp'
  );
  readonly categories = computed(() => this.menu()?.categories ?? []);
  readonly items = computed(() => this.menu()?.items ?? []);

  /** Follows the first category when the menu loads. */
  readonly activeCategory = linkedSignal(
    () => this.categories()[0]?.id ?? ''
  );
  readonly selectedItem = signal<MenuItem | null>(null);

  readonly visibleItems = computed(() =>
    this.items().filter((item) => item.categoryId === this.activeCategory())
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
    const { restaurantSlug, tableId } = guestRouteParams(
      this.router,
      this.route,
      DEFAULT_RESTAURANT_SLUG
    );
    void this.router.navigate(['/o', restaurantSlug, tableId, 'tabs', 'cart']);
  }
}
