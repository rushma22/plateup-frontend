import { Injectable, computed, signal } from '@angular/core';
import {
  CartLine,
  CartLineModifier,
  MenuItem,
} from '../models/order.models';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly linesSignal = signal<CartLine[]>([]);
  private noteSignal = signal('');

  readonly lines = this.linesSignal.asReadonly();
  readonly note = this.noteSignal.asReadonly();

  readonly itemCount = computed(() =>
    this.linesSignal().reduce((sum, line) => sum + line.quantity, 0)
  );

  readonly subtotal = computed(() =>
    this.linesSignal().reduce(
      (sum, line) => sum + line.unitPrice * line.quantity,
      0
    )
  );

  readonly estimatedPrepMinutes = computed(() => {
    const lines = this.linesSignal();
    if (!lines.length) {
      return 0;
    }
    return Math.max(...lines.map((line) => line.prepMinutes));
  });

  quantityForItem(itemId: string): number {
    return this.linesSignal()
      .filter((line) => line.itemId === itemId)
      .reduce((sum, line) => sum + line.quantity, 0);
  }

  setNote(note: string): void {
    this.noteSignal.set(note);
  }

  addItem(
    item: MenuItem,
    quantity: number,
    modifiers: CartLineModifier[] = []
  ): void {
    const modifierTotal = modifiers.reduce((sum, m) => sum + m.priceDelta, 0);
    const unitPrice = item.price + modifierTotal;
    const key = this.buildKey(item.id, modifiers);

    this.linesSignal.update((lines) => {
      const existing = lines.find((line) => line.key === key);
      if (existing) {
        return lines.map((line) =>
          line.key === key
            ? { ...line, quantity: line.quantity + quantity }
            : line
        );
      }
      return [
        ...lines,
        {
          key,
          itemId: item.id,
          name: item.name,
          unitPrice,
          quantity,
          imageUrl: item.imageUrl,
          modifiers,
          prepMinutes: item.prepMinutes,
        },
      ];
    });
  }

  updateQuantity(key: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeLine(key);
      return;
    }
    this.linesSignal.update((lines) =>
      lines.map((line) => (line.key === key ? { ...line, quantity } : line))
    );
  }

  removeLine(key: string): void {
    this.linesSignal.update((lines) => lines.filter((line) => line.key !== key));
  }

  clear(): void {
    this.linesSignal.set([]);
    this.noteSignal.set('');
  }

  private buildKey(itemId: string, modifiers: CartLineModifier[]): string {
    const modPart = modifiers
      .map((m) => `${m.groupId}:${m.optionId}`)
      .sort()
      .join('|');
    return `${itemId}::${modPart}`;
  }
}
