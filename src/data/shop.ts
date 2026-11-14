import { site } from './site.ts';

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  image: { src: string; alt: string; width: number; height: number } | null;
  price: { amount: number; currency: string } | null;
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
    description: 'A youth T-shirt featuring the One Mile Bidwell Park Bike Bus Chico design.',
    image: { src: '/shop/one-mile-bidwell-park-tee-34402078.jpg', alt: 'White youth tee with the Bike Bus Chico rider crossing a Bidwell Park bridge design.', width: 2048, height: 2048 },
    price: { amount: 9.99, currency: 'USD' },
    status: 'coming_soon',
    category: 'Youth T-shirt',
    displayOrder: 1,
    productUrl: 'https://bike-bus-chico.printify.me/product/34402078',
    productUrlVerified: true,
    purchaseVerified: false,
  },
  {
    id: '34402305',
    name: 'Bike Bus Chico Trucker Hat',
    description: 'A trucker hat featuring the Bike Bus Chico rider and wordmark.',
    image: { src: '/shop/bike-bus-chico-trucker-hat-34402305.png', alt: 'Navy trucker hat with a white and orange Bike Bus Chico rider and wordmark.', width: 2000, height: 2000 },
    price: { amount: 24.99, currency: 'USD' },
    status: 'coming_soon',
    category: 'Hat',
    displayOrder: 2,
    productUrl: 'https://bike-bus-chico.printify.me/product/34402305',
    productUrlVerified: true,
    purchaseVerified: false,
  },
  {
    id: '34402616',
    name: "Bike Bus Chico Kids' Crewneck Sweatshirt",
    description: 'A youth crewneck sweatshirt featuring the bicycle-shaped Bike Bus Chico wordmark.',
    image: { src: '/shop/bike-bus-chico-kids-crewneck-34402616.jpg', alt: 'White kids crewneck sweatshirt with the blue and orange bicycle-shaped Bike Bus Chico wordmark.', width: 2048, height: 2048 },
    price: { amount: 24.99, currency: 'USD' },
    status: 'coming_soon',
    category: 'Youth sweatshirt',
    displayOrder: 3,
    productUrl: 'https://bike-bus-chico.printify.me/product/34402616',
    productUrlVerified: true,
    purchaseVerified: false,
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
    if (typeof product.productUrlVerified !== 'boolean' || typeof product.purchaseVerified !== 'boolean') {
      throw new ShopConfigurationError(`${field}.productUrlVerified/purchaseVerified`);
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
          || price.amount < 0 || !Intl.supportedValuesOf('currency').includes(price.currency)) {
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
    if (product.status === 'available' && (!product.image || !product.price)) {
      throw new ShopConfigurationError(`${field} (available products need image and price)`);
    }
  }
}

export function canPurchaseProduct(product: ShopProduct): boolean {
  return product.status === 'available' && product.purchaseVerified && canViewProductDetails(product);
}

export function canViewProductDetails(product: ShopProduct): boolean {
  return product.productUrlVerified && product.productUrl !== null;
}

export function orderShopProducts(products: readonly ShopProduct[]): ShopProduct[] {
  return [...products].sort((a, b) => a.displayOrder - b.displayOrder);
}

export function formatShopPrice(price: NonNullable<ShopProduct['price']>): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: price.currency, currencyDisplay: 'code',
  }).format(price.amount);
}
