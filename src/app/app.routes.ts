import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/entry/entry.page').then((m) => m.EntryPage),
  },
  {
    path: 'o/:restaurantSlug/:tableId',
    children: [
      {
        path: '',
        redirectTo: 'tabs/menu',
        pathMatch: 'full',
      },
      {
        path: 'tabs',
        loadComponent: () =>
          import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
        children: [
          {
            path: 'menu',
            loadComponent: () =>
              import('./pages/menu/menu.page').then((m) => m.MenuPage),
          },
          {
            path: 'cart',
            loadComponent: () =>
              import('./pages/cart/cart.page').then((m) => m.CartPage),
          },
          {
            path: 'orders',
            loadComponent: () =>
              import('./pages/orders/orders.page').then((m) => m.OrdersPage),
          },
          {
            path: '',
            redirectTo: 'menu',
            pathMatch: 'full',
          },
        ],
      },
      {
        path: 'confirm',
        loadComponent: () =>
          import('./pages/confirm/confirm.page').then((m) => m.ConfirmPage),
      },
      {
        path: 'status/:orderId',
        loadComponent: () =>
          import('./pages/status/status.page').then((m) => m.StatusPage),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
