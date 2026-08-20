import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DEFAULT_MENU_IMAGE_URL,
  DEFAULT_PREP_MINUTES,
} from '../constants';
import {
  ApiMenuResponse,
  ApiOrder,
  CreateOrderBody,
  GuestMenu,
  MenuItem,
  Restaurant,
  RestaurantTable,
  TableSession,
} from '../models/order.models';

@Injectable({ providedIn: 'root' })
export class RestaurantApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** GET /restaurants/:slug — restaurant details including tables + reviewUrl. */
  getRestaurant(slug: string): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${this.baseUrl}/restaurants/${slug}`);
  }

  /** GET /restaurants/:slug/tables — table list for a restaurant. */
  getTables(slug: string): Observable<RestaurantTable[]> {
    return this.http
      .get<{ tables: RestaurantTable[] }>(
        `${this.baseUrl}/restaurants/${slug}/tables`
      )
      .pipe(map((res) => res.tables));
  }

  /** GET /restaurants/:slug/menu — categories and items for the guest menu. */
  getMenu(slug: string): Observable<GuestMenu> {
    return this.http
      .get<ApiMenuResponse>(`${this.baseUrl}/restaurants/${slug}/menu`)
      .pipe(map((res) => this.mapMenu(res)));
  }

  /**
   * POST /restaurants/:slug/tables/:tableId/sessions
   * Create or obtain the current open table session for this visit.
   */
  createOrGetSession(slug: string, tableId: string): Observable<TableSession> {
    return this.http.post<TableSession>(
      `${this.baseUrl}/restaurants/${slug}/tables/${tableId}/sessions`,
      {}
    );
  }

  /** GET /restaurants/:slug/tables/:tableId/sessions/:sessionId */
  getSession(
    slug: string,
    tableId: string,
    sessionId: string
  ): Observable<TableSession> {
    return this.http.get<TableSession>(
      `${this.baseUrl}/restaurants/${slug}/tables/${tableId}/sessions/${sessionId}`
    );
  }

  /**
   * GET /restaurants/:slug/tables/:tableId/sessions/:sessionId/orders
   * Only orders for this table visit (not older sessions).
   */
  getSessionOrders(
    slug: string,
    tableId: string,
    sessionId: string
  ): Observable<ApiOrder[]> {
    return this.http
      .get<ApiOrder[] | { orders: ApiOrder[] }>(
        `${this.baseUrl}/restaurants/${slug}/tables/${tableId}/sessions/${sessionId}/orders`
      )
      .pipe(
        map((res) => (Array.isArray(res) ? res : (res.orders ?? [])))
      );
  }

  /** POST /restaurants/:slug/tables/:tableId/orders — create a kitchen order. */
  createOrder(
    slug: string,
    tableId: string,
    body: CreateOrderBody
  ): Observable<ApiOrder> {
    return this.http.post<ApiOrder>(
      `${this.baseUrl}/restaurants/${slug}/tables/${tableId}/orders`,
      body
    );
  }

  /** GET /orders/:orderId — load one order (works after refresh). */
  getOrder(orderId: string): Observable<ApiOrder> {
    return this.http.get<ApiOrder>(`${this.baseUrl}/orders/${orderId}`);
  }

  /** Turn the API menu into the flat category/item models the UI already uses. */
  private mapMenu(res: ApiMenuResponse): GuestMenu {
    const categories = [...res.categories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((category) => ({
        id: category.id,
        name: category.name,
      }));

    const items: MenuItem[] = [];
    for (const category of [...res.categories].sort(
      (a, b) => a.sortOrder - b.sortOrder
    )) {
      for (const item of [...category.items].sort(
        (a, b) => a.sortOrder - b.sortOrder
      )) {
        items.push({
          id: item.id,
          categoryId: category.id,
          name: item.name,
          description: item.description ?? '',
          details: item.description ?? '',
          price: item.price,
          imageUrl: item.imageUrl ?? DEFAULT_MENU_IMAGE_URL,
          prepMinutes: DEFAULT_PREP_MINUTES,
          modifiers: [],
        });
      }
    }

    return {
      restaurant: res.restaurant,
      categories,
      items,
    };
  }
}
