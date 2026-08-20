import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CartLine } from '../models/order.models';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;
  let http: HttpTestingController;

  const line: CartLine = {
    key: 'item-1::',
    itemId: 'item-1',
    name: 'Burger',
    unitPrice: 12,
    quantity: 2,
    imageUrl: '',
    modifiers: [],
    prepMinutes: 15,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(OrderService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('includes sessionId in the create-order request body', () => {
    service
      .placeOrder({
        restaurantSlug: 'demo-bistro',
        tableId: 'table-1',
        sessionId: 'sess-abc',
        lines: [line],
        note: '',
        customer: { name: 'Alex', phone: '5551234567' },
      })
      .subscribe();

    const req = http.expectOne(
      `${environment.apiUrl}/restaurants/demo-bistro/tables/table-1/orders`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body.sessionId).toBe('sess-abc');
    expect(req.request.body.items.length).toBe(1);

    req.flush({
      id: 'order-1',
      tableId: 'table-1',
      sessionId: 'sess-abc',
      status: 'PENDING',
      notes: 'Guest: Alex, 5551234567',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        {
          id: 'li-1',
          menuItemId: 'item-1',
          name: 'Burger',
          quantity: 2,
          unitPrice: 12,
          notes: null,
        },
      ],
    });
  });

  it('rejects placeOrder when sessionId is missing', (done) => {
    service
      .placeOrder({
        restaurantSlug: 'demo-bistro',
        tableId: 'table-1',
        sessionId: '',
        lines: [line],
        note: '',
        customer: { name: 'Alex', phone: '5551234567' },
      })
      .subscribe({
        next: () => fail('should not succeed'),
        error: (err: Error) => {
          expect(err.message).toContain('session');
          done();
        },
      });
  });

  it('displays only orders for the current session scope', () => {
    service.replaceSessionOrders(
      {
        restaurantSlug: 'demo-bistro',
        tableId: 'table-1',
        sessionId: 'sess-current',
      },
      [
        {
          id: 'order-new',
          tableId: 'table-1',
          sessionId: 'sess-current',
          status: 'PREPARING',
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: [
            {
              id: 'li-1',
              menuItemId: 'item-1',
              name: 'Burger',
              quantity: 1,
              unitPrice: 12,
              notes: null,
            },
          ],
        },
      ]
    );

    // Manually cache an older-session order (should not appear in list).
    service.replaceSessionOrders(
      {
        restaurantSlug: 'demo-bistro',
        tableId: 'table-1',
        sessionId: 'sess-old',
      },
      [
        {
          id: 'order-old',
          tableId: 'table-1',
          sessionId: 'sess-old',
          status: 'COMPLETED',
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: [
            {
              id: 'li-2',
              menuItemId: 'item-2',
              name: 'Fries',
              quantity: 1,
              unitPrice: 4,
              notes: null,
            },
          ],
        },
      ]
    );

    // Switch UI back to the current session.
    service.setActiveScope({
      restaurantSlug: 'demo-bistro',
      tableId: 'table-1',
      sessionId: 'sess-current',
    });

    const ids = service.ordersList().map((o) => o.id);
    expect(ids).toContain('order-new');
    expect(ids).not.toContain('order-old');
  });

  it('maps COMPLETED to completed (not ready) and CANCELLED separately', () => {
    expect(service.mapApiStatus('READY')).toBe('ready');
    expect(service.mapApiStatus('COMPLETED')).toBe('completed');
    expect(service.mapApiStatus('CANCELLED')).toBe('cancelled');
    expect(service.mapApiStatus('PENDING')).toBe('received');
  });

  it('clears orders for a closed session', () => {
    service.replaceSessionOrders(
      {
        restaurantSlug: 'demo-bistro',
        tableId: 'table-1',
        sessionId: 'sess-1',
      },
      [
        {
          id: 'order-1',
          tableId: 'table-1',
          sessionId: 'sess-1',
          status: 'READY',
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: [
            {
              id: 'li-1',
              menuItemId: 'item-1',
              name: 'Burger',
              quantity: 1,
              unitPrice: 12,
              notes: null,
            },
          ],
        },
      ]
    );

    expect(service.ordersList().length).toBe(1);
    service.clearOrdersForSession('sess-1');
    expect(service.ordersList().length).toBe(0);
  });
});
