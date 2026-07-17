import { MenuCategory, MenuItem, Restaurant } from '../models/order.models';

export const MOCK_RESTAURANT: Restaurant = {
  slug: 'bistro-lane',
  name: 'Bistro Lane',
  tagline: 'Seasonal plates, ready when you are',
  tables: [1, 2, 3, 4, 5, 8, 12],
};

export const MOCK_CATEGORIES: MenuCategory[] = [
  { id: 'starters', name: 'Starters' },
  { id: 'mains', name: 'Mains' },
  { id: 'sides', name: 'Sides' },
  { id: 'drinks', name: 'Drinks' },
  { id: 'desserts', name: 'Desserts' },
];

export const MOCK_ITEMS: MenuItem[] = [
  {
    id: 'tomato-soup',
    categoryId: 'starters',
    name: 'Roasted Tomato Soup',
    description: 'Charred tomato, basil oil, grilled sourdough.',
    details:
      'Slow-roasted vine tomatoes blended until silky, finished with bright basil oil and a side of grilled sourdough for dipping. Comforting, lightly smoky, and great to share before the mains.',
    price: 7.5,
    imageUrl:
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80',
    prepMinutes: 8,
    modifiers: [
      {
        id: 'spice',
        name: 'Heat',
        required: false,
        options: [
          { id: 'mild', label: 'Mild', priceDelta: 0 },
          { id: 'medium', label: 'Medium', priceDelta: 0 },
          { id: 'hot', label: 'Hot', priceDelta: 0 },
        ],
      },
    ],
  },
  {
    id: 'burrata',
    categoryId: 'starters',
    name: 'Burrata & Peach',
    description: 'Creamy burrata, ripe peach, cracked pepper, mint.',
    details:
      'Soft, creamy burrata paired with sweet seasonal peach, cracked black pepper, and fresh mint. A light, fresh starter that balances rich cheese with bright fruit.',
    price: 12,
    imageUrl:
      'https://images.unsplash.com/photo-1608897013039-887f21d8c41e?w=800&q=80',
    prepMinutes: 6,
  },
  {
    id: 'steak-frites',
    categoryId: 'mains',
    name: 'Steak Frites',
    description: 'Seared strip, herb butter, shoestring fries.',
    details:
      'A seared strip steak cooked to your preferred doneness, topped with melting herb butter and served with a generous pile of crisp shoestring fries. A classic bistro plate, hearty and satisfying.',
    price: 28,
    imageUrl:
      'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80',
    prepMinutes: 22,
    modifiers: [
      {
        id: 'doneness',
        name: 'Doneness',
        required: true,
        options: [
          { id: 'medium-rare', label: 'Medium rare', priceDelta: 0 },
          { id: 'medium', label: 'Medium', priceDelta: 0 },
          { id: 'well', label: 'Well done', priceDelta: 0 },
        ],
      },
      {
        id: 'steak-extras',
        name: 'Extras',
        required: false,
        multi: true,
        options: [
          { id: 'peppercorn', label: 'Peppercorn sauce', priceDelta: 2 },
          { id: 'garlic-butter', label: 'Extra garlic butter', priceDelta: 1.5 },
          { id: 'fried-egg', label: 'Fried egg', priceDelta: 2.5 },
        ],
      },
    ],
  },
  {
    id: 'mushroom-risotto',
    categoryId: 'mains',
    name: 'Wild Mushroom Risotto',
    description: 'Arborio rice, thyme, parmesan, roasted mushrooms.',
    details:
      'Creamy arborio rice slowly cooked with thyme and finished with parmesan, then folded with roasted wild mushrooms. Earthy, rich, and vegetarian-friendly.',
    price: 19,
    imageUrl:
      'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&q=80',
    prepMinutes: 18,
    modifiers: [
      {
        id: 'risotto-extras',
        name: 'Extras',
        required: false,
        multi: true,
        options: [
          { id: 'extra-parmesan', label: 'Extra parmesan', priceDelta: 1.5 },
          { id: 'truffle-oil', label: 'Truffle oil', priceDelta: 3 },
          { id: 'poached-egg', label: 'Poached egg', priceDelta: 2.5 },
        ],
      },
    ],
  },
  {
    id: 'grilled-salmon',
    categoryId: 'mains',
    name: 'Grilled Salmon',
    description: 'Citrus glaze, fennel salad, lemon oil.',
    details:
      'Grilled salmon fillet brushed with a citrus glaze, served over a crisp fennel salad and finished with lemon oil. Clean flavors, light but filling.',
    price: 24,
    imageUrl:
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80',
    prepMinutes: 16,
    modifiers: [
      {
        id: 'salmon-extras',
        name: 'Extras',
        required: false,
        multi: true,
        options: [
          { id: 'extra-sauce', label: 'Extra citrus glaze', priceDelta: 1 },
          { id: 'avocado', label: 'Sliced avocado', priceDelta: 2.5 },
        ],
      },
    ],
  },
  {
    id: 'fries',
    categoryId: 'sides',
    name: 'Shoestring Fries',
    description: 'Crispy, sea salt, aioli.',
    details:
      'Thin-cut fries fried until golden and crisp, tossed with sea salt and served with house aioli. Perfect for sharing or next to a main.',
    price: 5,
    imageUrl:
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80',
    prepMinutes: 10,
    modifiers: [
      {
        id: 'fries-extras',
        name: 'Extras',
        required: false,
        multi: true,
        options: [
          { id: 'extra-aioli', label: 'Extra aioli', priceDelta: 1 },
          { id: 'parmesan', label: 'Parmesan & herbs', priceDelta: 1.5 },
          { id: 'truffle', label: 'Truffle salt', priceDelta: 2 },
        ],
      },
    ],
  },
  {
    id: 'green-salad',
    categoryId: 'sides',
    name: 'Market Greens',
    description: 'Seasonal leaves, mustard vinaigrette.',
    details:
      'A mix of seasonal market greens dressed in a sharp mustard vinaigrette. Fresh, crunchy, and a good balance to richer plates.',
    price: 6.5,
    imageUrl:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
    prepMinutes: 5,
  },
  {
    id: 'lemonade',
    categoryId: 'drinks',
    name: 'House Lemonade',
    description: 'Fresh lemon, mint, lightly sparkling.',
    details:
      'Freshly squeezed lemon with mint and a light sparkling finish. Bright and refreshing — choose large if you want a taller glass.',
    price: 4.5,
    imageUrl:
      'https://images.unsplash.com/photo-1523677011780-c54aa0ac2b5a?w=800&q=80',
    prepMinutes: 3,
    modifiers: [
      {
        id: 'size',
        name: 'Size',
        required: true,
        options: [
          { id: 'regular', label: 'Regular', priceDelta: 0 },
          { id: 'large', label: 'Large', priceDelta: 1.5 },
        ],
      },
    ],
  },
  {
    id: 'espresso',
    categoryId: 'drinks',
    name: 'Espresso',
    description: 'Double shot, rich and short.',
    details:
      'A double shot of espresso pulled short and rich. Bold coffee flavor in a small cup — ideal after a meal or as a quick pick-me-up.',
    price: 3.5,
    imageUrl:
      'https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?w=800&q=80',
    prepMinutes: 4,
  },
  {
    id: 'chocolate-tart',
    categoryId: 'desserts',
    name: 'Dark Chocolate Tart',
    description: 'Sea salt, whipped cream, cocoa nib.',
    details:
      'A smooth dark chocolate tart with a pinch of sea salt, soft whipped cream, and crunchy cocoa nibs. Rich without being overly sweet.',
    price: 9,
    imageUrl:
      'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80',
    prepMinutes: 5,
  },
];

export function getRestaurantBySlug(slug: string): Restaurant | undefined {
  return MOCK_RESTAURANT.slug === slug ? MOCK_RESTAURANT : undefined;
}

export function getItemsByCategory(categoryId: string): MenuItem[] {
  return MOCK_ITEMS.filter((item) => item.categoryId === categoryId);
}

export function getItemById(id: string): MenuItem | undefined {
  return MOCK_ITEMS.find((item) => item.id === id);
}
