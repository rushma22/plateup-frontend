import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CartService } from './cart.service';
import { OrderRealtimeService } from './order-realtime.service';
import { OrderService } from './order.service';
import { TableSessionService } from './table-session.service';

describe('TableSessionService', () => {
  let service: TableSessionService;
  let http: HttpTestingController;
  let cart: CartService;
  let orders: OrderService;
  let stopWatch: jasmine.Spy;

  const slug = 'demo-bistro';
  const tableId = 'seed_table_t1';
  const sessionId = 'sess-123';

  beforeEach(() => {
    sessionStorage.clear();
    stopWatch = jasmine.createSpy('stopWatch');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TableSessionService,
        OrderService,
        CartService,
        {
          provide: OrderRealtimeService,
          useValue: {
            watchTableSession: () => stopWatch,
            watchOrder: () => () => undefined,
          },
        },
      ],
    });

    service = TestBed.inject(TableSessionService);
    http = TestBed.inject(HttpTestingController);
    cart = TestBed.inject(CartService);
    orders = TestBed.inject(OrderService);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function expectRestaurantMeta(): void {
    const req = http.expectOne(
      `${environment.apiUrl}/restaurants/${slug}`
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      slug,
      name: 'Demo Bistro',
      reviewUrl: 'https://reviews.example/demo',
      tables: [],
    });
  }

  it('creates a session on first visit and stores the id', () => {
    let resolvedId = '';
    service.ensureSession(slug, tableId).subscribe((session) => {
      resolvedId = session?.id ?? '';
    });

    expectRestaurantMeta();

    const create = http.expectOne(
      `${environment.apiUrl}/restaurants/${slug}/tables/${tableId}/sessions`
    );
    expect(create.request.method).toBe('POST');
    create.flush({
      id: sessionId,
      tableId,
      status: 'OPEN',
      autoCloseAt: null,
    });

    const ordersReq = http.expectOne(
      `${environment.apiUrl}/restaurants/${slug}/tables/${tableId}/sessions/${sessionId}/orders`
    );
    ordersReq.flush([]);

    expect(resolvedId).toBe(sessionId);
    expect(service.sessionId()).toBe(sessionId);
    expect(service.readStoredSessionId(slug, tableId)).toBe(sessionId);
    expect(service.reviewUrl()).toBe('https://reviews.example/demo');
  });

  it('recovers a stored session on refresh instead of creating a new one', () => {
    sessionStorage.setItem(
      service.storageKey(slug, tableId),
      JSON.stringify({ sessionId })
    );

    service.ensureSession(slug, tableId).subscribe();

    expectRestaurantMeta();

    const get = http.expectOne(
      `${environment.apiUrl}/restaurants/${slug}/tables/${tableId}/sessions/${sessionId}`
    );
    expect(get.request.method).toBe('GET');
    get.flush({
      id: sessionId,
      tableId,
      status: 'CLOSING',
      autoCloseAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    });

    http
      .expectOne(
        `${environment.apiUrl}/restaurants/${slug}/tables/${tableId}/sessions/${sessionId}/orders`
      )
      .flush([]);

    expect(service.isClosing()).toBeTrue();
    expect(service.msRemaining()).toBeGreaterThan(0);
  });

  it('clears cart, orders, storage and countdown on sessionClosed', () => {
    // Seed an open session first.
    service.ensureSession(slug, tableId).subscribe();
    expectRestaurantMeta();
    http
      .expectOne(
        `${environment.apiUrl}/restaurants/${slug}/tables/${tableId}/sessions`
      )
      .flush({
        id: sessionId,
        tableId,
        status: 'OPEN',
        autoCloseAt: null,
      });
    http
      .expectOne(
        `${environment.apiUrl}/restaurants/${slug}/tables/${tableId}/sessions/${sessionId}/orders`
      )
      .flush([
        {
          id: 'order-1',
          tableId,
          sessionId,
          status: 'READY',
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: [
            {
              id: 'li-1',
              menuItemId: 'item-1',
              name: 'Soup',
              quantity: 1,
              unitPrice: 5,
              notes: null,
            },
          ],
        },
      ]);

    cart.addItem(
      {
        id: 'item-1',
        categoryId: 'c1',
        name: 'Soup',
        description: '',
        details: '',
        price: 5,
        imageUrl: '',
        prepMinutes: 10,
      },
      1
    );
    expect(cart.itemCount()).toBe(1);
    expect(orders.ordersList().length).toBe(1);

    // Simulate closing then closed.
    service.handleSessionClosed(sessionId);

    expect(cart.itemCount()).toBe(0);
    expect(orders.ordersList().length).toBe(0);
    expect(service.readStoredSessionId(slug, tableId)).toBeNull();
    expect(service.isClosed()).toBeTrue();
    expect(service.isClosing()).toBeFalse();
    expect(stopWatch).toHaveBeenCalled();
  });

  it('cancels the countdown when the session reopens', () => {
    service.ensureSession(slug, tableId).subscribe();
    expectRestaurantMeta();
    http
      .expectOne(
        `${environment.apiUrl}/restaurants/${slug}/tables/${tableId}/sessions`
      )
      .flush({
        id: sessionId,
        tableId,
        status: 'CLOSING',
        autoCloseAt: new Date(Date.now() + 8 * 60_000).toISOString(),
      });
    http
      .expectOne(
        `${environment.apiUrl}/restaurants/${slug}/tables/${tableId}/sessions/${sessionId}/orders`
      )
      .flush([]);

    expect(service.isClosing()).toBeTrue();

    service.markSessionOpen();

    expect(service.isClosing()).toBeFalse();
    expect(service.status()).toBe('OPEN');
    expect(service.msRemaining()).toBe(0);
  });

  it('does not auto-join a new session after sessionClosed on the same page', () => {
    service.ensureSession(slug, tableId).subscribe();
    expectRestaurantMeta();
    http
      .expectOne(
        `${environment.apiUrl}/restaurants/${slug}/tables/${tableId}/sessions`
      )
      .flush({
        id: sessionId,
        tableId,
        status: 'OPEN',
        autoCloseAt: null,
      });
    http
      .expectOne(
        `${environment.apiUrl}/restaurants/${slug}/tables/${tableId}/sessions/${sessionId}/orders`
      )
      .flush([]);

    service.handleSessionClosed(sessionId);

    let result: unknown = 'unset';
    service.ensureSession(slug, tableId).subscribe((session) => {
      result = session;
    });

    expect(result).toBeNull();
    http.expectNone(
      `${environment.apiUrl}/restaurants/${slug}/tables/${tableId}/sessions`
    );
  });
});
