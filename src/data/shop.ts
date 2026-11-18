import { site } from './site.ts';

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  image: { src: string; alt: string; width: number; height: number } | null;
  price: { amount: number; currency: string; maxAmount?: number } | null;
  priceVerified: boolean;
  status: 'coming_soon' | 'available' | 'sold-out';
  category: string;
  displayOrder: number;
  productUrl: string | null;
  productUrlVerified: boolean;
  purchaseVerified: boolean;
}

export const shopProducts: readonly ShopProduct[] = [
  {
    id: '34402078',
    name: 'One Mile Bidwell Park Tee',
    description: "Celebrate Chico's One Mile Recreation Area with this colorful youth tee featuring a Bike Bus ride through Bidwell Park.",
    image: { src: '/shop/one-mile-bidwell-park-tee-34402078.jpg', alt: 'White youth tee with the Bike Bus Chico rider crossing a Bidwell Park bridge design.', width: 2048, height: 2048 },
    price: { amount: 9.99, currency: 'USD' },
    priceVerified: true,
    status: 'available',
    category: 'Youth T-shirt',
    displayOrder: 1,
    productUrl: 'https://bike-bus-chico.printify.me/product/34402078',
    productUrlVerified: true,
    purchaseVerified: true,
  },
  {
    id: '34402305',
    name: 'Bike Bus Chico Trucker Hat',
    description: 'Show your Bike Bus Chico pride on the school ride and beyond with our classic trucker hat.',
    image: { src: '/shop/bike-bus-chico-trucker-hat-34402305.png', alt: 'Navy trucker hat with a white and orange Bike Bus Chico rider and wordmark.', width: 2000, height: 2000 },
    price: { amount: 24.99, currency: 'USD' },
    priceVerified: true,
    status: 'available',
    category: 'Hat',
    displayOrder: 2,
    productUrl: 'https://bike-bus-chico.printify.me/product/34402305',
    productUrlVerified: true,
    purchaseVerified: true,
  },
  {
    id: '34402616',
    name: "Kids' Bike Bus Crewneck",
    description: 'A cozy layer for chilly school mornings, featuring our bicycle-inspired Bike Bus Chico wordmark.',
    image: { src: '/shop/bike-bus-chico-kids-crewneck-34402616.jpg', alt: 'White kids crewneck sweatshirt with the blue and orange bicycle-shaped Bike Bus Chico wordmark.', width: 2048, height: 2048 },
    price: { amount: 24.99, currency: 'USD' },
    priceVerified: true,
    status: 'available',
    category: 'Youth sweatshirt',
    displayOrder: 3,
    productUrl: 'https://bike-bus-chico.printify.me/product/34402616',
    productUrlVerified: true,
    purchaseVerified: true,
  },
  {
    id: '34413817',
    name: 'Bike Bus Chico Retro Ride Tee',
    description: 'Celebrate riding together with retro racing stripes and our signature cyclist graphic.',
    image: { src: '/shop/bike-bus-chico-retro-ride-tee-navy-34413817.jpg', alt: 'True Navy tee with blue and orange retro racing stripes, a cream cyclist and Bike Bus Chico lettering.', width: 2048, height: 2048 },
    price: { amount: 16.99, maxAmount: 19.99, currency: 'USD' },
    priceVerified: true,
    status: 'available',
    category: 'T-shirt',
    displayOrder: 4,
    productUrl: 'https://bike-bus-chico.printify.me/product/34413817',
    productUrlVerified: true,
    purchaseVerified: true,
  },
  {
    id: '34621182',
    name: 'Chico Rides Youth Tee - CCDS',
    description: 'Celebrate Chico Country Day School with school-inspired lettering, a colorful bicycle wheel and the Bike Bus Chico logo.',
    image: { src: '/shop/chico-rides-youth-tee-ccds-34621182.jpg', alt: 'Navy youth tee with white CCDS Rides lettering, an orange bicycle wheel and the Bike Bus Chico logo.', width: 2048, height: 2048 },
    price: { amount: 9.99, currency: 'USD' },
    priceVerified: true,
    status: 'available',
    category: 'Youth T-shirt',
    displayOrder: 5,
    productUrl: 'https://bike-bus-chico.printify.me/product/34621182',
    productUrlVerified: true,
    purchaseVerified: true,
  },
  {
    id: '34621292',
    name: 'Chico Rides Youth Tee - Parkview',
    description: 'Celebrate Parkview Elementary with school-inspired lettering, a colorful bicycle wheel and the Bike Bus Chico logo.',
    image: { src: '/shop/chico-rides-youth-tee-parkview-34621292.jpg', alt: 'Forest Green youth tee with white Parkview Rides lettering, a yellow bicycle wheel and the Bike Bus Chico logo.', width: 2048, height: 2048 },
    price: { amount: 9.99, currency: 'USD' },
    priceVerified: true,
    status: 'available',
    category: 'Youth T-shirt',
    displayOrder: 6,
    productUrl: 'https://bike-bus-chico.printify.me/product/34621292',
    productUrlVerified: true,
    purchaseVerified: true,
  },
];

export class ShopConfigurationError extends Error {
  constructor(field: string) {
    super(`Shop configuration: invalid or missing ${field}. Supply verified product details before rebuilding.`);
    this.name = 'ShopConfigurationError';
  }
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function httpsUrl(value: string, field: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ShopConfigurationError(field);
  }
  if (!/^https:\/\/[^/]/i.test(value) || value !== value.trim() || /[\u0000-\u001f\\]/.test(value)
      || url.protocol !== 'https:' || url.username || url.password) {
    throw new ShopConfigurationError(field);
  }
  return url;
}

export function validateShopProducts(products: readonly ShopProduct[]): void {
  const catalog: readonly ShopProduct[] = products;
  if (!Array.isArray(products) || !products.length) throw new ShopConfigurationError('products');
  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const [index, product] of catalog.entries()) {
    const field = `products[${index}]`;
    if (!product || typeof product !== 'object') throw new ShopConfigurationError(field);
    if (!nonempty(product.id) || ids.has(product.id)) throw new ShopConfigurationError(`${field}.id (must be unique)`);
    ids.add(product.id);
    if (!nonempty(product.name)) throw new ShopConfigurationError(`${field}.name`);
    if (!nonempty(product.description)) throw new ShopConfigurationError(`${field}.description`);
    if (!nonempty(product.category)) throw new ShopConfigurationError(`${field}.category`);
    if (!Number.isInteger(product.displayOrder) || product.displayOrder < 1 || orders.has(product.displayOrder)) {
      throw new ShopConfigurationError(`${field}.displayOrder (must be a unique positive integer)`);
    }
    orders.add(product.displayOrder);
    if (!['coming_soon', 'available', 'sold-out'].includes(product.status)) {
      throw new ShopConfigurationError(`${field}.status`);
    }
    if (typeof product.productUrlVerified !== 'boolean' || typeof product.purchaseVerified !== 'boolean'
        || typeof product.priceVerified !== 'boolean') {
      throw new ShopConfigurationError(`${field}.productUrlVerified/purchaseVerified/priceVerified`);
    }
    if (product.image !== null) {
      const image = product.image;
      if (!image || !nonempty(image.src) || !nonempty(image.alt)
          || !Number.isInteger(image.width) || image.width <= 0
          || !Number.isInteger(image.height) || image.height <= 0) {
        throw new ShopConfigurationError(`${field}.image`);
      }
      if (image.src !== image.src.trim() || /[\u0000-\u001f\\]/.test(image.src)) {
        throw new ShopConfigurationError(`${field}.image.src`);
      }
      if (image.src.startsWith('/') && !image.src.startsWith('//') && !image.src.includes('\\')) {
        if (image.src.split('/').some((segment) => segment === '..' || segment === '.')) {
          throw new ShopConfigurationError(`${field}.image.src`);
        }
      } else {
        httpsUrl(image.src, `${field}.image.src`);
      }
    }
    if (product.price !== null) {
      const price = product.price;
      if (!price || typeof price.amount !== 'number' || !Number.isFinite(price.amount)
          || price.amount < 0 || !Intl.supportedValuesOf('currency').includes(price.currency)
          || (price.maxAmount !== undefined && (!Number.isFinite(price.maxAmount) || price.maxAmount < price.amount))) {
        throw new ShopConfigurationError(`${field}.price`);
      }
    }
    if (product.productUrl !== null) {
      if (!nonempty(product.productUrl)) throw new ShopConfigurationError(`${field}.productUrl`);
      const url = httpsUrl(product.productUrl, `${field}.productUrl`);
      if (url.hostname.replace(/^www\./, '').replace(/\.$/, '') === new URL(site.domain).hostname) {
        throw new ShopConfigurationError(`${field}.productUrl (must be an external shop)`);
      }
    }
    if (product.productUrlVerified && !product.productUrl) {
      throw new ShopConfigurationError(`${field}.productUrl (verification requires a supplied URL)`);
    }
    if (product.purchaseVerified && (!product.productUrlVerified || !product.productUrl)) {
      throw new ShopConfigurationError(`${field}.purchaseVerified (requires a verified product URL)`);
    }
    if (product.priceVerified && !product.price) {
      throw new ShopConfigurationError(`${field}.priceVerified (requires a supplied price)`);
    }
    if (product.status === 'available' && !product.image) {
      throw new ShopConfigurationError(`${field} (available products need image)`);
    }
  }
}

export function canPurchaseProduct(product: ShopProduct): boolean {
  return product.status === 'available' && product.purchaseVerified && product.priceVerified && canViewProductDetails(product);
}

export function canViewProductDetails(product: ShopProduct): boolean {
  return product.productUrlVerified && product.productUrl !== null;
}

export function orderShopProducts(products: readonly ShopProduct[]): ShopProduct[] {
  return [...products].sort((a, b) => a.displayOrder - b.displayOrder);
}

export function formatShopPrice(price: NonNullable<ShopProduct['price']>): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: price.currency, currencyDisplay: 'symbol',
  }).format(price.amount);
  return price.maxAmount !== undefined && price.maxAmount > price.amount ? `From ${formatted}` : formatted;
}
