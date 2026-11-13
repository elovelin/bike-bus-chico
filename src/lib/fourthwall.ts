// Build-time only. API contract: https://docs.fourthwall.com/openapi/storefront.json
const API_BASE = 'https://storefront-api.fourthwall.com/v1/';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CURRENCIES = ['USD', 'EUR', 'CAD', 'GBP', 'AUD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'INR', 'JPY', 'MYR', 'SGD', 'MXN', 'BRL', 'CHF'];

export class FourthwallError extends Error {
  constructor(message: string) {
    super(`Fourthwall: ${message}`);
    this.name = 'FourthwallError';
  }
}

export interface ShopEnvironment {
  FOURTHWALL_STOREFRONT_TOKEN?: string;
  FOURTHWALL_SHOP_URL?: string;
  FOURTHWALL_DAD_HAT_PRODUCT_ID?: string;
  FOURTHWALL_TEE_PRODUCT_ID?: string;
}

interface ShopConfig {
  token: string;
  shopUrl: string;
  productIds: [string, string];
}

export interface ShopVariant {
  id: string;
  name: string;
  price: number;
  currency: string;
  available: boolean;
}

export interface ShopProduct {
  id: string;
  name: string;
  image: { url: string; width: number; height: number };
  variants: ShopVariant[];
  available: boolean;
  priceLabel: string;
  checkoutAction: string;
}

export type ShopData = { connected: false } | { connected: true; products: ShopProduct[] };

function invalid(field: string): never {
  throw new FourthwallError(`invalid or missing ${field}. Check configuration and the Storefront API response.`);
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(field);
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) invalid(field);
  return value;
}

function uuid(value: unknown, field: string): string {
  const result = text(value, field);
  if (!UUID.test(result)) invalid(field);
  return result;
}

function nonnegative(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) invalid(field);
  return value;
}

function httpsUrl(value: unknown, field: string): URL {
  const source = text(value, field);
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return invalid(field);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) invalid(field);
  return url;
}

export function checkoutOrigin(value: unknown): string {
  const url = httpsUrl(value, 'FOURTHWALL_SHOP_URL');
  // Use the existing Fourthwall-hosted shop; custom domains need separate verification.
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.fourthwall\.com$/i.test(url.hostname)
      || url.port || url.pathname !== '/' || url.search) invalid('FOURTHWALL_SHOP_URL');
  return url.origin;
}

function configuration(env: ShopEnvironment): ShopConfig | null {
  const values = [
    env.FOURTHWALL_STOREFRONT_TOKEN,
    env.FOURTHWALL_SHOP_URL,
    env.FOURTHWALL_DAD_HAT_PRODUCT_ID,
    env.FOURTHWALL_TEE_PRODUCT_ID,
  ];
  if (values.every((value) => value === undefined || value === '')) return null;
  if (values.some((value) => !value?.trim())) {
    throw new FourthwallError('set FOURTHWALL_STOREFRONT_TOKEN, FOURTHWALL_SHOP_URL, FOURTHWALL_DAD_HAT_PRODUCT_ID and FOURTHWALL_TEE_PRODUCT_ID together.');
  }
  const productIds: [string, string] = [
    uuid(env.FOURTHWALL_DAD_HAT_PRODUCT_ID, 'FOURTHWALL_DAD_HAT_PRODUCT_ID'),
    uuid(env.FOURTHWALL_TEE_PRODUCT_ID, 'FOURTHWALL_TEE_PRODUCT_ID'),
  ];
  if (productIds[0].toLowerCase() === productIds[1].toLowerCase()) invalid('distinct product IDs');
  return {
    token: text(env.FOURTHWALL_STOREFRONT_TOKEN, 'FOURTHWALL_STOREFRONT_TOKEN'),
    shopUrl: checkoutOrigin(env.FOURTHWALL_SHOP_URL),
    productIds,
  };
}

export function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'code' }).format(value);
}

function variant(value: unknown): ShopVariant {
  const source = record(value, 'variant');
  const money = record(source.unitPrice, 'variant.unitPrice');
  const currency = text(money.currency, 'variant.unitPrice.currency');
  if (!CURRENCIES.includes(currency)) invalid('variant.unitPrice.currency');
  const stock = record(source.stock, 'variant.stock');
  let available: boolean;
  if (stock.type === 'UNLIMITED') {
    available = true;
  } else if (stock.type === 'LIMITED') {
    const inStock = nonnegative(stock.inStock, 'variant.stock.inStock');
    if (!Number.isInteger(inStock)) invalid('variant.stock.inStock');
    available = inStock > 0;
  } else {
    return invalid('variant.stock.type');
  }
  return {
    id: uuid(source.id, 'variant.id'),
    name: text(source.name, 'variant.name'),
    price: nonnegative(money.value, 'variant.unitPrice.value'),
    currency,
    available,
  };
}

function product(source: Record<string, unknown>, config: ShopConfig): ShopProduct {
  if (source.type !== 'PRODUCT') invalid('selected product type (bundles are not supported)');
  const state = record(source.state, 'product.state');
  if (state.type !== 'AVAILABLE' && state.type !== 'SOLD_OUT') invalid('product.state.type');
  if (!Array.isArray(source.variants) || !source.variants.length) invalid('product.variants');
  const variants = source.variants.map(variant);
  if (new Set(variants.map((item) => item.id.toLowerCase())).size !== variants.length) invalid('unique variant IDs');
  if (variants.some((item) => item.currency !== variants[0].currency)) invalid('consistent variant currency');
  if (!Array.isArray(source.images) || !source.images.length) invalid('published product image');
  const image = record(source.images[0], 'product.images[0]');
  const imageUrl = httpsUrl(image.url, 'product image URL');
  // Media URLs must not carry Storefront authentication into the generated site.
  if (imageUrl.searchParams.has('storefront_token') || imageUrl.href.includes(config.token)) invalid('product image URL');
  const width = nonnegative(image.width, 'image.width');
  const height = nonnegative(image.height, 'image.height');
  if (!Number.isInteger(width) || !Number.isInteger(height) || !width || !height) invalid('image dimensions');
  const available = state.type === 'AVAILABLE' && variants.some((item) => item.available);
  const pricedVariants = available ? variants.filter((item) => item.available) : variants;
  const minimum = Math.min(...pricedVariants.map((item) => item.price));
  const varying = pricedVariants.some((item) => item.price !== minimum);
  return {
    id: uuid(source.id, 'product.id'),
    name: text(source.name, 'product.name'),
    image: { url: imageUrl.href, width, height },
    variants,
    available,
    priceLabel: `${varying ? 'From ' : ''}${formatPrice(minimum, variants[0].currency)}`,
    checkoutAction: new URL('/cart/checkout', config.shopUrl).href,
  };
}

async function request(path: string, config: ShopConfig, fetcher: typeof fetch): Promise<unknown> {
  const url = new URL(path, API_BASE);
  url.searchParams.set('storefront_token', config.token);
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    });
  } catch {
    // Never propagate fetch's URL/cause: the documented query auth contains the token.
    throw new FourthwallError('Storefront request failed or timed out. Check connectivity and retry the build.');
  }
  if (!response.ok) {
    throw new FourthwallError(`Storefront returned HTTP ${response.status}. Check authentication, published products and rate limits.`);
  }
  try {
    return await response.json();
  } catch {
    throw new FourthwallError('Storefront returned malformed JSON.');
  }
}

export async function loadShop(env: ShopEnvironment, fetcher: typeof fetch = fetch): Promise<ShopData> {
  const config = configuration(env);
  if (!config) return { connected: false };
  const selected = new Map<string, ShopProduct>();
  // Check the configured checkout shop belongs to this token, not another Fourthwall shop.
  const shop = record(await request('shop', config, fetcher), 'shop');
  const domains = [text(shop.domain, 'shop.domain'), text(shop.publicDomain, 'shop.publicDomain')];
  if (!domains.some((domain) => {
    const url = httpsUrl(domain.includes('://') ? domain : `https://${domain}`, 'shop domain');
    return url.origin === config.shopUrl && url.pathname === '/' && !url.search;
  })) invalid('checkout shop matching Storefront token');

  for (let page = 0; page < 100; page++) {
    const data = record(await request(`collections/all/products?page=${page}&size=50&currency=USD`, config, fetcher), 'collection response');
    if (!Array.isArray(data.results)) invalid('collection.results');
    const paging = record(data.paging, 'collection.paging');
    if (typeof paging.hasNextPage !== 'boolean' || paging.pageNumber !== page) invalid('collection.paging');
    for (const entry of data.results) {
      const source = record(entry, 'collection product');
      const access = record(source.access, 'product.access');
      if (!['PUBLIC', 'HIDDEN', 'PRIVATE', 'ARCHIVED'].includes(text(access.type, 'product.access.type'))) invalid('product.access.type');
      if (access.type !== 'PUBLIC') continue;
      const id = uuid(source.id, 'product.id').toLowerCase();
      if (!config.productIds.some((selectedId) => selectedId.toLowerCase() === id)) continue;
      if (selected.has(id)) invalid('duplicate selected product');
      const parsed = product(source, config);
      if (JSON.stringify(parsed).includes(config.token)) invalid('product data containing Storefront authentication');
      selected.set(id, parsed);
    }
    if (!paging.hasNextPage) {
      const products = config.productIds.map((id) => selected.get(id.toLowerCase()));
      if (products.some((item) => !item)) {
        throw new FourthwallError('a selected product is missing or not PUBLIC in the all collection. Publish both products and verify their product IDs.');
      }
      return { connected: true, products: products.map((item) => {
        if (!item) return invalid('selected product');
        return item;
      }) };
    }
  }
  throw new FourthwallError('collection pagination exceeded 100 pages. Review the catalog before rebuilding.');
}
