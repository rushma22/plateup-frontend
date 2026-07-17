import { CurrencyPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bagHandleOutline } from 'ionicons/icons';

addIcons({ bagHandleOutline });

@Component({
  selector: 'app-cart-bar',
  standalone: true,
  imports: [IonIcon, CurrencyPipe],
  templateUrl: './cart-bar.component.html',
  styleUrls: ['./cart-bar.component.scss'],
})
export class CartBarComponent {
  readonly itemCount = input.required<number>();
  readonly subtotal = input.required<number>();
  readonly viewCart = output<void>();
}
