import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { canPurchaseProduct, canViewProductDetails, formatShopPrice, orderShopProducts, shopProducts, ShopConfigurationError, validateShopProducts } from '../src/data/shop.ts';
import { nav, headerCta, site } from '../src/data/site.ts';

// Synthetic test-only details; never supplied as merchandise or written into dist/.
const available = {
  id: 'synthetic-available', name: 'Synthetic available product', description: 'Test fixture, not merchandise.',
  image: { src: 'https://images.example.invalid/synthetic.png', alt: 'Synthetic test image', width: 800, height: 600 },
  price: { amount: 25.5, currency: 'USD' },
  priceVerified: true,
  status: 'available', category: 'Synthetic category', displayOrder: 1,
  productUrl: 'https://external-shop.example.invalid/products/synthetic', productUrlVerified: true, purchaseVerified: true,
};
const unavailable = {
  ...available, id: 'synthetic-unavailable', name: 'Synthetic unavailable product', status: 'sold-out', displayOrder: 2,
};

test('catalog matches the four products, current verified prices and independently verified purchase paths', () => {
  assert.equal(site.shopPublished, true);
  assert.deepEqual(nav.map(({ label, href }) => [label, href]), [
    ['Find a Bike Bus', '/routes/'], ['Ride With Us', '/ride/'],
    ['Start a Bike Bus', '/start-a-route/'], ['Shop', '/shop'], ['About', '/about/'],
  ]);
  assert.deepEqual(headerCta, { label: 'Find your ride', href: '/routes/' });
  validateShopProducts(shopProducts);
  assert.deepEqual(shopProducts.map((product) => product.name), [
    'One Mile Bidwell Park Tee', 'Bike Bus Chico Trucker Hat', "Kids' Bike Bus Crewneck",
    'Bike Bus Chico Retro Ride Tee',
  ]);
  assert.deepEqual(shopProducts.map((product) => product.description), [
    "Celebrate Chico's One Mile Recreation Area with this colorful youth tee featuring a Bike Bus ride through Bidwell Park.",
    'Show your Bike Bus Chico pride on the school ride and beyond with our classic trucker hat.',
    'A cozy layer for chilly school mornings, featuring our bicycle-inspired Bike Bus Chico wordmark.',
    'Celebrate riding together with retro racing stripes and our signature cyclist graphic.',
  ]);
  assert.deepEqual(shopProducts.map((product) => product.id), ['34402078', '34402305', '34402616', '34413817']);
  assert.deepEqual(shopProducts.map((product) => product.category), ['Youth T-shirt', 'Hat', 'Youth sweatshirt', 'T-shirt']);
  assert.deepEqual(shopProducts.map((product) => product.displayOrder), [1, 2, 3, 4]);
  assert.deepEqual(shopProducts.map((product) => product.price), [
    { amount: 9.99, currency: 'USD' }, { amount: 24.99, currency: 'USD' }, { amount: 24.99, currency: 'USD' },
    { amount: 16.99, maxAmount: 19.99, currency: 'USD' },
  ]);
  assert.deepEqual(shopProducts.map((product) => product.productUrl), [
    'https://bike-bus-chico.printify.me/product/34402078',
    'https://bike-bus-chico.printify.me/product/34402305',
    'https://bike-bus-chico.printify.me/product/34402616',
    'https://bike-bus-chico.printify.me/product/34413817',
  ]);
  assert.deepEqual(orderShopProducts([...shopProducts].reverse()), shopProducts);
  for (const product of shopProducts) {
    assert.equal(product.status, 'available');
    assert.ok(product.image);
    assert.ok(existsSync(join('public', product.image.src.slice(1))));
    assert.equal(product.productUrlVerified, true);
    assert.equal(product.purchaseVerified, true);
    assert.equal(product.priceVerified, true);
    assert.equal(canViewProductDetails(product), true);
    assert.equal(canPurchaseProduct(product), true);
    assert.ok(!('plannedColors' in product));
  }
});

test('accepts safe external links but only explicit verification and availability enable purchasing', () => {
  for (const status of ['coming_soon', 'available', 'sold-out']) {
    const product = { ...available, status };
    validateShopProducts([product]);
    assert.equal(canPurchaseProduct(product), status === 'available');
  }
  validateShopProducts([{ ...available, productUrl: 'https://another-shop.example.invalid/item?color=white#details' }]);
  validateShopProducts([{ ...available, image: { ...available.image, src: '/photos/supplied-image.png' } }]);
  validateShopProducts([{ ...unavailable, image: null, price: null, priceVerified: false, productUrl: null, productUrlVerified: false, purchaseVerified: false }]);
  const detailsOnly = { ...available, purchaseVerified: false };
  validateShopProducts([detailsOnly]);
  assert.equal(canViewProductDetails(detailsOnly), true);
  assert.equal(canPurchaseProduct(detailsOnly), false);
  for (const productUrl of [available.productUrl, null]) {
    const pendingVerification = { ...available, productUrl, productUrlVerified: false, purchaseVerified: false };
    validateShopProducts([pendingVerification]);
    assert.equal(canPurchaseProduct(pendingVerification), false);
    assert.equal(canViewProductDetails(pendingVerification), false);
  }
  assert.throws(() => validateShopProducts([{ ...available, productUrlVerified: false }]), /purchaseVerified/);
  assert.throws(() => validateShopProducts([{ ...available, productUrl: null }]), /verification requires a supplied URL/);
  assert.throws(() => validateShopProducts([{ ...available, image: null }]), /available products need/);
  assert.throws(() => validateShopProducts([{ ...available, price: null }]), /priceVerified/);
  for (const price of [available.price, null]) {
    const unverifiedPrice = { ...available, price, priceVerified: false };
    validateShopProducts([unverifiedPrice]);
    assert.equal(canViewProductDetails(unverifiedPrice), true);
    assert.equal(canPurchaseProduct(unverifiedPrice), false);
  }
});

test('malformed/unsafe URLs, missing fields and invalid availability fail explicitly', () => {
  for (const productUrl of [
    '', 'not a URL', '//example.invalid', '/shop/', 'http://external-shop.example.invalid',
    'javascript:alert(1)', 'data:text/html,invalid', 'https://user:password@example.invalid',
    'https:example.invalid/product', 'https:///example.invalid/product',
    ' https://example.invalid', 'https://example.invalid\\path',
    'https://bikebuschico.org/shop/', 'https://www.bikebuschico.org/shop/',
    'https://bikebuschico.org./shop/',
  ]) {
    assert.throws(() => validateShopProducts([{ ...available, productUrl }]), ShopConfigurationError);
  }
  for (const overrides of [
    { id: '' }, { name: '' }, { description: ' ' }, { status: 'unknown' }, { productUrl: undefined },
    { category: '' }, { displayOrder: 0 }, { displayOrder: 1.5 }, { displayOrder: '1' },
    { image: undefined }, { price: undefined }, { productUrlVerified: undefined }, { productUrlVerified: 'true' },
    { purchaseVerified: undefined }, { purchaseVerified: 'true' },
    { priceVerified: undefined }, { priceVerified: 'true' },
    { image: { ...available.image, src: 'javascript:alert(1)' } },
    { image: { ...available.image, src: '//example.invalid/image.png' } },
    { image: { ...available.image, src: '/../private.png' } },
    { image: { ...available.image, src: '/\t/example.invalid/image.png' } },
    { image: { ...available.image, src: '/image.png ' } },
    { image: { ...available.image, alt: '' } },
    { image: { ...available.image, width: 0 } },
    { image: { ...available.image, height: 1.5 } },
    { price: { amount: -1, currency: 'USD' } },
    { price: { amount: Infinity, currency: 'USD' } },
    { price: { amount: NaN, currency: 'USD' } },
    { price: { amount: '25', currency: 'USD' } },
    { price: { amount: 25, currency: 'XXX' } },
    { price: { amount: 25, maxAmount: 24, currency: 'USD' } },
    { price: { amount: 25, maxAmount: NaN, currency: 'USD' } },
    { price: { amount: 25, maxAmount: '30', currency: 'USD' } },
  ]) assert.throws(() => validateShopProducts([{ ...available, ...overrides }]), ShopConfigurationError);
  assert.throws(() => validateShopProducts([]), ShopConfigurationError);
  assert.throws(() => validateShopProducts([available, { ...unavailable, id: available.id }]), /id.*unique/);
  assert.throws(() => validateShopProducts([available, { ...unavailable, displayOrder: available.displayOrder }]), /displayOrder/);
});

test('explicit prices use major units and their currency, including zero and zero-decimal currencies', () => {
  assert.equal(formatShopPrice({ amount: 16.99, maxAmount: 19.99, currency: 'USD' }), 'From $16.99');
  assert.equal(formatShopPrice({ amount: 16.99, maxAmount: 16.99, currency: 'USD' }), '$16.99');
  for (const [amount, currency, expected] of [
    [25.5, 'USD', '$25.50'], [7.25, 'CAD', 'CA$7.25'],
    [2500, 'JPY', '\u00a52,500'], [0, 'USD', '$0.00'],
  ]) {
    validateShopProducts([{ ...available, price: { amount, currency } }]);
    assert.equal(formatShopPrice({ amount, currency }), expected);
  }
});

test('real Astro builds enforce staging and explicit launch boundaries, render safe external links and preserve public pages', { timeout: 120_000 }, () => {
  const root = mkdtempSync(join(tmpdir(), 'bike-bus-shop-test-'));
  const baseConfig = pathToFileURL(resolve('astro.config.mjs')).href;
  function build(name, staged, fixtures, published = true) {
    const directory = join(root, name);
    const args = [
      '--import', 'data:text/javascript,globalThis.fetch%20%3D%20()%20%3D%3E%20%7B%20throw%20new%20Error(%22Unexpected%20build-time%20network%20request%22)%3B%20%7D',
      join('node_modules', 'astro', 'astro.js'), 'build', '--outDir', directory,
    ];
    if (fixtures || !published) {
      const configPath = join(root, `${name}.config.mjs`);
      writeFileSync(configPath, `
        import base from ${JSON.stringify(baseConfig)};
        export default {
          ...base,
          vite: { plugins: [{
            name: 'synthetic-shop-test-fixture', enforce: 'pre',
            transform(code, id) {
              if (id.endsWith('/src/data/site.ts') && ${!published}) {
                return code.replace('shopPublished: true', 'shopPublished: false');
              }
              if (!id.endsWith('/src/data/shop.ts')) return;
              if (!${Boolean(fixtures)}) return;
              const start = code.indexOf('export const shopProducts:');
              const end = code.indexOf('\\n];', start) + 3;
              if (start < 0 || end < 3) throw new Error('Test catalog replacement failed');
              return code.slice(0, start) + ${JSON.stringify(`export const shopProducts: readonly ShopProduct[] = ${JSON.stringify(fixtures)};`)} + code.slice(end);
            }
          }] }
        };
      `);
      args.push('--config', relative(resolve(), configPath));
    }
    const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' };
    if (staged === undefined) delete env.SHOP_STAGED;
    else env.SHOP_STAGED = staged;
    const result = spawnSync(process.execPath, args, {
      env, encoding: 'utf8', timeout: 30_000,
    });
    return { directory, result };
  }
  try {
    const ordinary = build('ordinary');
    assert.equal(ordinary.result.status, 0, ordinary.result.stderr);
    const productionHtml = readFileSync(join(ordinary.directory, 'shop', 'index.html'), 'utf8');
    assert.ok(!productionHtml.includes('Staged preview.'));
    assert.ok(!productionHtml.includes('name="robots"'));
    assert.match(productionHtml, /href="\/shop" aria-current="page">\s*Shop/);
    assert.ok(readFileSync(join(ordinary.directory, 'sitemap-0.xml'), 'utf8').includes('/shop/'));
    assert.ok(!existsSync(join(ordinary.directory, 'review')));
    const hidden = build('unpublished-fixture', undefined, undefined, false);
    assert.equal(hidden.result.status, 0, hidden.result.stderr);
    assert.ok(!existsSync(join(hidden.directory, 'shop', 'index.html')));
    assert.ok(!readFileSync(join(hidden.directory, 'index.html'), 'utf8').includes('href="/shop"'));
    const staged = build('staged', '1');
    assert.equal(staged.result.status, 0, staged.result.stderr);
    const initialHtml = readFileSync(join(staged.directory, 'shop', 'index.html'), 'utf8');
    assert.match(initialHtml, /name="robots" content="noindex, nofollow"/);
    assert.match(initialHtml, /One Mile Bidwell Park Tee/);
    assert.match(initialHtml, /Kids&#39; Bike Bus Crewneck|Kids' Bike Bus Crewneck/);
    assert.ok(!initialHtml.includes('class="shop-category"'));
    assert.match(initialHtml, /Staged preview\./);
    assert.ok(!initialHtml.includes('Planned colors:'));
    assert.match(initialHtml, /id="merch-heading"/);
    assert.ok(!initialHtml.includes('For the ride.'));
    assert.ok(!initialHtml.includes('And the everyday.'));
    assert.ok(!initialHtml.includes('<form'));
    assert.equal((initialHtml.match(/class="button shop-action shop-buy"/g) ?? []).length, 4);
    assert.equal((initialHtml.match(/>Choose options &amp; buy /g) ?? []).length, 4);
    assert.equal((initialHtml.match(/Shipping calculated at checkout/g) ?? []).length, 4);
    assert.equal((initialHtml.match(/>Available<\/span>/g) ?? []).length, 4);
    assert.match(initialHtml, />From \$16\.99<\/p>/);
    assert.ok(!initialHtml.includes('>View details '));
    assert.ok(!initialHtml.includes('Products are currently coming soon'));
    assert.ok(!initialHtml.includes('target="_blank"'));
    assert.match(initialHtml, /Made for the ride\. Priced for our families\./);
    assert.match(initialHtml, /Made for the school ride and wherever the road takes you\./);
    assert.match(initialHtml, /Our gear helps celebrate the families, friendships, and community that make Bike Bus Chico possible\./);
    assert.match(initialHtml, />\$9\.99<\/p>/);
    assert.equal((productionHtml.match(/class="button shop-action shop-buy"/g) ?? []).length, 4);
    for (const product of shopProducts) {
      assert.ok(initialHtml.includes(product.productUrl));
      assert.deepEqual(readFileSync(join(staged.directory, product.image.src.slice(1))), readFileSync(join('public', product.image.src.slice(1))), 'Mockups must remain unchanged in staged output');
    }
    const external = build('external', '1', [
      available,
      unavailable,
      { ...available, id: 'synthetic-upcoming', name: 'Synthetic upcoming product', status: 'coming_soon', displayOrder: 3 },
      { ...available, id: 'synthetic-unverified', name: 'Synthetic unverified product', productUrlVerified: false, purchaseVerified: false, displayOrder: 4 },
      { ...available, id: 'synthetic-pending', name: 'Synthetic URL-pending product', productUrl: null, productUrlVerified: false, purchaseVerified: false, displayOrder: 5 },
      { ...available, id: 'synthetic-details', name: 'Synthetic purchase-unverified product', purchaseVerified: false, displayOrder: 6 },
      { ...available, id: 'synthetic-placeholder', name: 'Synthetic placeholder product', status: 'coming_soon', image: null, price: null, priceVerified: false, productUrl: null, productUrlVerified: false, purchaseVerified: false, displayOrder: 7 },
      { ...available, id: 'synthetic-stale-price', name: 'Synthetic unverified-price product', priceVerified: false, displayOrder: 8 },
      { ...available, id: 'synthetic-missing-price', name: 'Synthetic missing-price product', price: null, priceVerified: false, displayOrder: 9 },
    ]);
    assert.equal(external.result.status, 0, external.result.stderr);
    const html = readFileSync(join(external.directory, 'shop', 'index.html'), 'utf8');
    assert.match(html, /href="https:\/\/external-shop\.example\.invalid\/products\/synthetic" rel="external"/);
    assert.equal((html.match(/class="button shop-action shop-buy"/g) ?? []).length, 1, 'Only a purchase-verified available product can have a purchasing CTA');
    assert.ok(!html.includes('target="_blank"'));
    assert.match(html, />\$25\.50<\/p>/);
    assert.match(html, /Synthetic test image/);
    assert.match(html, /Shipping calculated at checkout/);
    assert.match(html, /Product details open in our Printify Pop-Up Store/);
    assert.equal((html.match(/Product photo coming soon\./g) ?? []).length, 1);
    assert.ok(!html.includes('Planned colors:'));
    assert.ok(!html.includes('<form'));
    const browser = spawnSync('python', ['-u', join('tests', 'shop_browser.py'), '--fixture-html', join(external.directory, 'shop', 'index.html')], {
      encoding: 'utf8', timeout: 60_000,
    });
    assert.equal(browser.status, 0, `${browser.error ?? ''}${browser.stdout}${browser.stderr}`);
    const invalid = build('invalid', '1', [{ ...available, productUrl: null }]);
    assert.notEqual(invalid.result.status, 0);
    assert.match(`${invalid.result.stdout}${invalid.result.stderr}`, /verification requires a supplied URL/);
    for (const directory of [staged.directory, external.directory]) {
      assert.ok(!readFileSync(join(directory, 'sitemap-0.xml'), 'utf8').includes('/shop'));
    }
    function scan(directory, baseline) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        const previous = join(baseline, entry.name);
        if (entry.isDirectory()) {
          scan(path, previous);
        } else if (/\.(html|js|css|xml)$/.test(entry.name)) {
          const content = readFileSync(path, 'utf8');
          assert.ok(!/fourthwall|storefront_token|FOURTHWALL_|\/cart\/checkout/i.test(content));
          if (entry.name.endsWith('.html') && !path.endsWith(join('shop', 'index.html'))) {
            assert.equal(content, readFileSync(previous, 'utf8'), 'Existing public page changed');
          }
        }
      }
    }
    scan(staged.directory, ordinary.directory);
    scan(external.directory, ordinary.directory);
  } finally {
    rmSync(root, { recursive: true });
  }
});
