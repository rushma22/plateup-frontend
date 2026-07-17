import { CurrencyPipe } from '@angular/common';
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
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { routeParam } from '../../core/utils/route-param';

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
  ],
})
export class ConfirmPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly cart = inject(CartService);
  private readonly orders = inject(OrderService);

  readonly restaurantSlug = routeParam(this.route, 'restaurantSlug', 'bistro-lane');
  readonly tableId = routeParam(this.route, 'tableId', '1');

  note = this.cart.note();
  placing = false;

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
      !this.placing
    );
  });

  readonly nameInvalid = computed(
    () => this.attemptedSubmit() && this.customerName().trim().length < 2
  );

  readonly phoneInvalid = computed(
    () =>
      this.attemptedSubmit() &&
      !this.isPhoneValid(this.customerPhone().trim())
  );

  ngOnInit(): void {
    if (this.cart.lines().length === 0) {
      void this.router.navigate(
        ['/o', this.restaurantSlug, this.tableId, 'tabs', 'menu'],
        { replaceUrl: true }
      );
    }
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
    if (!this.canPlace()) {
      return;
    }
    this.placing = true;

    const email = this.customerEmail().trim();
    const order = this.orders.placeOrder({
      restaurantSlug: this.restaurantSlug,
      tableId: this.tableId,
      lines: this.cart.lines(),
      note: this.cart.note(),
      customer: {
        name: this.customerName().trim(),
        phone: this.customerPhone().trim(),
        ...(email ? { email } : {}),
      },
      estimatedMinutes: Math.max(12, this.cart.estimatedPrepMinutes() + 4),
    });

    this.cart.clear();

    void this.router.navigate([
      '/o',
      this.restaurantSlug,
      this.tableId,
      'status',
      order.id,
    ]);
  }

  private isPhoneValid(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  }
}
