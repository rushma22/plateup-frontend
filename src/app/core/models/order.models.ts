/** Guest-facing order status (includes completed/cancelled separately). */
export type OrderStatus =
  | 'received'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

/** Backend table-session lifecycle. */
export type TableSessionStatus = 'OPEN' | 'CLOSING' | 'CLOSED';

/** One dining visit at a table (from QR scan until auto-close). */
export interface TableSession {
  id: string;
  tableId: string;
  restaurantId?: string;
  status: TableSessionStatus;
  /** ISO time when the backend will auto-close (set while CLOSING). */
  autoCloseAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Socket.IO: kitchen finished; table will clear soon. */
export interface SessionClosingPayload {
  sessionId: string;
  tableId: string;
  autoCloseAt: string;
  status?: TableSessionStatus;
}

/** Socket.IO: table session ended and was cleared. */
export interface SessionClosedPayload {
  sessionId: string;
  tableId: string;
  status?: TableSessionStatus;
}

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

/** Raw category item from GET /restaurants/:slug/menu. */
export interface ApiMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  sortOrder: number;
}

/** Raw category from GET /restaurants/:slug/menu. */
export interface ApiMenuCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  items: ApiMenuItem[];
}

/** Raw payload from GET /restaurants/:slug/menu. */
export interface ApiMenuResponse {
  restaurant: {
    id: string;
    slug: string;
    name: string;
  };
  categories: ApiMenuCategory[];
}

/** Menu mapped into existing UI models. */
export interface GuestMenu {
  restaurant: ApiMenuResponse['restaurant'];
  categories: MenuCategory[];
  items: MenuItem[];
}

/** Table shape from the restaurant API (and local mock). */
export interface RestaurantTable {
  id: string;
  label: string;
  capacity: number;
}

export interface Restaurant {
  id?: string;
  slug: string;
  name: string;
  /** Guest-facing short line; may be absent from the API. */
  tagline?: string;
  description?: string;
  address?: string;
  phone?: string;
  /** Optional Google/Tripadvisor (etc.) review link from public restaurant data. */
  reviewUrl?: string | null;
  tables: RestaurantTable[];
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
  /** Ties this order to the current table visit. */
  sessionId: string;
  lines: CartLine[];
  note: string;
  customer: CustomerDetails;
  subtotal: number;
  status: OrderStatus;
  estimatedMinutes: number;
  placedAt: number;
  readyAt: number;
}

/** Backend order status values. */
export type ApiOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface CreateOrderItemBody {
  menuItemId: string;
  quantity: number;
  notes: string;
}

export interface CreateOrderBody {
  items: CreateOrderItemBody[];
  notes: string;
  /** Required — kitchen orders belong to an open table session. */
  sessionId: string;
}

export interface ApiOrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  /** Snapshot price per item from the kitchen API. */
  unitPrice?: number;
  /** Some payloads use `price` instead of `unitPrice`. */
  price?: number;
  notes: string | null;
}

export interface ApiOrder {
  id: string;
  restaurantId?: string;
  tableId: string;
  sessionId?: string;
  status: ApiOrderStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: ApiOrderItem[];
}

/** Socket.IO payload for orderStatusUpdated. */
export interface OrderStatusUpdatedPayload {
  id: string;
  tableId: string;
  status: ApiOrderStatus;
  updatedAt: string;
}
