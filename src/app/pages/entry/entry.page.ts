import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { DEFAULT_RESTAURANT_SLUG } from '../../core/constants';
import { RestaurantApiService } from '../../core/services/restaurant-api.service';

@Component({
  selector: 'app-entry',
  templateUrl: './entry.page.html',
  styleUrls: ['./entry.page.scss'],
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent],
})
export class EntryPage {
  private readonly restaurantApi = inject(RestaurantApiService);

  /** Live restaurant + tables from GET /restaurants/demo-bistro. */
  readonly restaurant = toSignal(
    this.restaurantApi.getRestaurant(DEFAULT_RESTAURANT_SLUG)
  );
}
