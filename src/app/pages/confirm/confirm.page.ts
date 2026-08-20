import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { DEFAULT_RESTAURANT_SLUG } from '../../core/constants';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { TableSessionService } from '../../core/services/table-session.service';
import { guestRouteParams } from '../../core/utils/route-param';
import { SessionClosingBannerComponent } from '../../shared/components/session-closing-banner/session-closing-banner.component';

@Component({
  selector: 'app-confirm',
  templateUrl: './confirm.page.html',
  styleUrls: ['./confirm.page.scss'],
  imports: [
    CurrencyPipe,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonInput,
    IonTextarea,
    IonButton,
    SessionClosingBannerComponent,
  ],
})
export class ConfirmPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly cart = inject(CartService);
  private readonly orders = inject(OrderService);
  readonly tableSession = inject(TableSessionService);

  private readonly guest = guestRouteParams(
    this.router,
    this.route,
    DEFAULT_RESTAURANT_SLUG
  );
  readonly restaurantSlug = this.guest.restaurantSlug;
  readonly tableId = this.guest.tableId;

  note = this.cart.note();
  placing = false;
  placeError = '';

  readonly customerName = signal('');
  readonly customerPhone = signal('');
  readonly customerEmail = signal('');
  readonly attemptedSubmit = signal(false);

  readonly canPlace = computed(() => {
    const name = this.customerName().trim();
    const phone = this.customerPhone().trim();
    return (
      name.length >= 2 &&
      this.isPhoneValid(phone) &&
      this.cart.lines().length > 0 &&
      this.tableSession.isReady() &&
      !this.tableSession.isClosed() &&
      !this.placing
    );
  });

  readonly nameInvalid = computed(
    () => this.attemptedSubmit() && this.customerName().trim().length < 2
  );

  readonly phoneInvalid = computed(
    () =>
      this.attemptedSubmit() && !this.isPhoneValid(this.customerPhone().trim())
  );

  ngOnInit(): void {
    if (this.cart.lines().length === 0) {
      void this.router.navigate(
        ['/o', this.restaurantSlug, this.tableId, 'tabs', 'menu'],
        { replaceUrl: true }
      );
      return;
    }

    this.tableSession
      .ensureSession(this.restaurantSlug, this.tableId)
      .subscribe();
  }

  onNoteChange(value: string | null | undefined): void {
    const note = value ?? '';
    this.note = note;
    this.cart.setNote(note);
  }

  onNameChange(value: string | null | undefined): void {
    this.customerName.set(value ?? '');
  }

  onPhoneChange(value: string | null | undefined): void {
    this.customerPhone.set(value ?? '');
  }

  onEmailChange(value: string | null | undefined): void {
    this.customerEmail.set(value ?? '');
  }

  placeOrder(): void {
    this.attemptedSubmit.set(true);
    this.placeError = '';
    if (!this.canPlace()) {
      if (!this.tableSession.isReady()) {
        this.placeError =
          'Your table session is still loading. Please wait a moment and try again.';
      }
      return;
    }
    this.placing = true;

    const email = this.customerEmail().trim();
    const { restaurantSlug, tableId } = guestRouteParams(
      this.router,
      this.route,
      DEFAULT_RESTAURANT_SLUG
    );
    const sessionId = this.tableSession.sessionId();

    if (!tableId) {
      this.placing = false;
      this.placeError =
        'This table link is outdated. Go home and pick your table again (e.g. T1).';
      return;
    }

    if (!sessionId) {
      this.placing = false;
      this.placeError =
        'Your table session is not ready yet. Please wait a moment and try again.';
      return;
    }

    this.orders
      .placeOrder({
        restaurantSlug,
        restaurantName: this.tableSession.restaurantName() || undefined,
        tableId,
        sessionId,
        lines: this.cart.lines(),
        note: this.cart.note(),
        customer: {
          name: this.customerName().trim(),
          phone: this.customerPhone().trim(),
          ...(email ? { email } : {}),
        },
      })
      .subscribe({
        next: (order) => {
          this.cart.clear();
          // If we ordered during the closing countdown, backend may reopen OPEN.
          this.tableSession.refreshAfterOrder().subscribe({
            next: (session) => {
              if (session?.status === 'OPEN') {
                this.tableSession.markSessionOpen();
              }
            },
          });
          void this.router.navigate([
            '/o',
            restaurantSlug,
            tableId,
            'status',
            order.id,
          ]);
        },
        error: (err: unknown) => {
          this.placing = false;
          this.placeError = this.messageForPlaceError(err);
        },
      });
  }

  /** Explain common API failures in plain language. */
  private messageForPlaceError(err: unknown): string {
    const http = err instanceof HttpErrorResponse ? err : null;
    const apiMessage =
      typeof http?.error?.message === 'string' ? http.error.message : '';

    if (http?.status === 404 || /table not found/i.test(apiMessage)) {
      return 'This table link is outdated. Go home and pick your table again (e.g. T1).';
    }
    if (/session/i.test(apiMessage)) {
      return 'Your table session expired. Scan the QR code again to start a new visit.';
    }
    return apiMessage || 'Could not place order. Please try again.';
  }

  private isPhoneValid(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  }
}
