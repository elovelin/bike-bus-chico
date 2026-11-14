import { site } from './site.ts';

export interface ShopProduct {
  name: string;
  description: string;
  image: { src: string; alt: string; width: number; height: number } | null;
  price: { amount: number; currency: string } | null;
  availability: 'coming-soon' | 'available' | 'sold-out';
  purchaseUrl: string | null;
  plannedColors?: readonly string[];
}

export const shopProducts: readonly ShopProduct[] = [
  {
    name: 'Bike Bus Chico Trucker Hat',
    description: 'Details, pricing, and availability will be shared when this product is ready.',
    image: null,
    price: null,
    availability: 'coming-soon',
    purchaseUrl: null,
  },
  {
    name: 'One Mile Bidwell Park Tee',
    description: 'Details, pricing, and availability will be shared when this product is ready.',
    image: null,
    price: null,
    availability: 'coming-soon',
    purchaseUrl: null,
    plannedColors: ['Royal Blue', 'White'],
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
  for (const [index, product] of catalog.entries()) {
    const field = `products[${index}]`;
    if (!product || typeof product !== 'object') throw new ShopConfigurationError(field);
    if (!nonempty(product.name)) throw new ShopConfigurationError(`${field}.name`);
    if (!nonempty(product.description)) throw new ShopConfigurationError(`${field}.description`);
    if (!['coming-soon', 'available', 'sold-out'].includes(product.availability)) {
      throw new ShopConfigurationError(`${field}.availability`);
    }
    if (product.plannedColors !== undefined
        && (!Array.isArray(product.plannedColors) || !product.plannedColors.every(nonempty))) {
      throw new ShopConfigurationError(`${field}.plannedColors`);
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
    if (product.purchaseUrl !== null) {
      if (!nonempty(product.purchaseUrl)) throw new ShopConfigurationError(`${field}.purchaseUrl`);
      const url = httpsUrl(product.purchaseUrl, `${field}.purchaseUrl`);
      if (url.hostname.replace(/^www\./, '').replace(/\.$/, '') === new URL(site.domain).hostname) {
        throw new ShopConfigurationError(`${field}.purchaseUrl (must be an external shop)`);
      }
    }
    if (product.availability === 'available' && (!product.image || !product.price || !product.purchaseUrl)) {
      throw new ShopConfigurationError(`${field} (available products need image, price and purchaseUrl)`);
    }
  }
}

export function formatShopPrice(price: NonNullable<ShopProduct['price']>): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: price.currency, currencyDisplay: 'code',
  }).format(price.amount);
}
