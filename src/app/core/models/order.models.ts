export type OrderStatus = 'received' | 'preparing' | 'ready';

export interface ModifierOption {
  id: string;
  label: string;
  priceDelta: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  /** When true, multiple options can be selected (e.g. extras). */
  multi?: boolean;
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  /** Longer copy shown in the item modal. */
  details: string;
  price: number;
  imageUrl: string;
  prepMinutes: number;
  modifiers?: ModifierGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
}

export interface Restaurant {
  slug: string;
  name: string;
  tagline: string;
  tables: number[];
}

export interface CartLineModifier {
  groupId: string;
  optionId: string;
  label: string;
  priceDelta: number;
}

export interface CartLine {
  key: string;
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
  modifiers: CartLineModifier[];
  prepMinutes: number;
}

/** Guest details collected at checkout (no auth). */
export interface CustomerDetails {
  name: string;
  phone: string;
  email?: string;
}

export interface PlacedOrder {
  id: string;
  shortCode: string;
  restaurantSlug: string;
  restaurantName: string;
  tableId: string;
  lines: CartLine[];
  note: string;
  customer: CustomerDetails;
  subtotal: number;
  status: OrderStatus;
  estimatedMinutes: number;
  placedAt: number;
  readyAt: number;
}
