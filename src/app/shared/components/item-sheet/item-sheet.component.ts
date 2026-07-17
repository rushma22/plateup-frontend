import { CurrencyPipe } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  computed,
  signal,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, removeOutline } from 'ionicons/icons';
import {
  CartLineModifier,
  MenuItem,
  ModifierOption,
} from '../../../core/models/order.models';

addIcons({ addOutline, closeOutline, removeOutline });

@Component({
  selector: 'app-item-sheet',
  standalone: true,
  imports: [CurrencyPipe, IonIcon],
  templateUrl: './item-sheet.component.html',
  styleUrls: ['./item-sheet.component.scss'],
})
export class ItemSheetComponent implements OnChanges {
  @Input({ required: true }) item!: MenuItem;
  @Output() readonly dismiss = new EventEmitter<void>();
  @Output() readonly add = new EventEmitter<{
    quantity: number;
    modifiers: CartLineModifier[];
  }>();

  private readonly itemSignal = signal<MenuItem | null>(null);
  readonly quantity = signal(1);
  /** Single-select: one option id; multi-select: list of option ids. */
  readonly selections = signal<Record<string, string | string[]>>({});

  readonly currentItem = this.itemSignal.asReadonly();

  readonly lineTotal = computed(() => {
    const item = this.itemSignal();
    if (!item) {
      return 0;
    }
    const mods = this.selectedModifiers();
    const delta = mods.reduce((sum, m) => sum + m.priceDelta, 0);
    return (item.price + delta) * this.quantity();
  });

  readonly canAdd = computed(() => {
    const groups = this.itemSignal()?.modifiers ?? [];
    const selected = this.selections();
    return groups
      .filter((g) => g.required)
      .every((g) => {
        const value = selected[g.id];
        if (g.multi) {
          return Array.isArray(value) && value.length > 0;
        }
        return typeof value === 'string' && Boolean(value);
      });
  });

  ngOnChanges(): void {
    const item = this.item;
    this.itemSignal.set(item ?? null);
    this.quantity.set(1);
    const defaults: Record<string, string | string[]> = {};
    for (const group of item?.modifiers ?? []) {
      if (group.multi) {
        defaults[group.id] = [];
      } else if (group.required && group.options[0]) {
        defaults[group.id] = group.options[0].id;
      }
    }
    this.selections.set(defaults);
  }

  selectOption(groupId: string, option: ModifierOption): void {
    const group = this.itemSignal()?.modifiers?.find((g) => g.id === groupId);
    if (!group) {
      return;
    }

    if (group.multi) {
      this.selections.update((current) => {
        const existing = current[groupId];
        const selected = Array.isArray(existing) ? existing : [];
        const next = selected.includes(option.id)
          ? selected.filter((id) => id !== option.id)
          : [...selected, option.id];
        return { ...current, [groupId]: next };
      });
      return;
    }

    this.selections.update((current) => ({
      ...current,
      [groupId]: option.id,
    }));
  }

  isSelected(groupId: string, optionId: string): boolean {
    const value = this.selections()[groupId];
    if (Array.isArray(value)) {
      return value.includes(optionId);
    }
    return value === optionId;
  }

  bump(delta: number): void {
    this.quantity.update((q) => Math.max(1, q + delta));
  }

  confirm(): void {
    if (!this.canAdd() || !this.itemSignal()) {
      return;
    }
    this.add.emit({
      quantity: this.quantity(),
      modifiers: this.selectedModifiers(),
    });
  }

  private selectedModifiers(): CartLineModifier[] {
    const selected = this.selections();
    const result: CartLineModifier[] = [];
    for (const group of this.itemSignal()?.modifiers ?? []) {
      const value = selected[group.id];
      const optionIds = Array.isArray(value)
        ? value
        : value
          ? [value]
          : [];
      for (const optionId of optionIds) {
        const option = group.options.find((o) => o.id === optionId);
        if (!option) {
          continue;
        }
        result.push({
          groupId: group.id,
          optionId: option.id,
          label: option.label,
          priceDelta: option.priceDelta,
        });
      }
    }
    return result;
  }
}
