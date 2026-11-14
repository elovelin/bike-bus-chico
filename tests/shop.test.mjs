import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { formatShopPrice, shopProducts, ShopConfigurationError, validateShopProducts } from '../src/data/shop.ts';

// Synthetic test-only details; never supplied as merchandise or written into dist/.
const available = {
  name: 'Synthetic available product', description: 'Test fixture, not merchandise.',
  image: { src: 'https://images.example.invalid/synthetic.png', alt: 'Synthetic test image', width: 800, height: 600 },
  price: { amount: 25.5, currency: 'USD' },
  availability: 'available', purchaseUrl: 'https://external-shop.example.invalid/products/synthetic',
};
const unavailable = {
  ...available, name: 'Synthetic unavailable product', availability: 'sold-out',
};

test('initial catalog is exactly two honest non-purchasable products with planned tee colors', () => {
  validateShopProducts(shopProducts);
  assert.deepEqual(shopProducts.map((product) => product.name), ['Bike Bus Chico Trucker Hat', 'One Mile Bidwell Park Tee']);
  assert.deepEqual(shopProducts[1].plannedColors, ['Royal Blue', 'White']);
  for (const product of shopProducts) {
    assert.equal(product.availability, 'coming-soon');
    assert.equal(product.image, null);
    assert.equal(product.price, null);
    assert.equal(product.purchaseUrl, null);
  }
});

test('accepts provider-independent HTTPS links, verified image data and explicit availability', () => {
  for (const availability of ['coming-soon', 'available', 'sold-out']) {
    validateShopProducts([{ ...available, availability }]);
  }
  validateShopProducts([{ ...available, purchaseUrl: 'https://another-shop.example.invalid/item?color=white#details' }]);
  validateShopProducts([{ ...available, image: { ...available.image, src: '/photos/supplied-image.png' } }]);
  validateShopProducts([{ ...unavailable, image: null, price: null, purchaseUrl: null }]);
  for (const field of ['image', 'price', 'purchaseUrl']) {
    assert.throws(() => validateShopProducts([{ ...available, [field]: null }]), /available products need/);
  }
});

test('malformed/unsafe URLs, missing fields and invalid availability fail explicitly', () => {
  for (const purchaseUrl of [
    '', 'not a URL', '//example.invalid', '/shop/', 'http://external-shop.example.invalid',
    'javascript:alert(1)', 'data:text/html,invalid', 'https://user:password@example.invalid',
    'https:example.invalid/product', 'https:///example.invalid/product',
    ' https://example.invalid', 'https://example.invalid\\path',
    'https://bikebuschico.org/shop/', 'https://www.bikebuschico.org/shop/',
    'https://bikebuschico.org./shop/',
  ]) {
    assert.throws(() => validateShopProducts([{ ...available, purchaseUrl }]), ShopConfigurationError);
  }
  for (const overrides of [
    { name: '' }, { description: ' ' }, { availability: 'unknown' }, { purchaseUrl: undefined },
    { image: undefined }, { price: undefined }, { plannedColors: 'Royal Blue' }, { plannedColors: [''] },
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
  ]) assert.throws(() => validateShopProducts([{ ...available, ...overrides }]), ShopConfigurationError);
  assert.throws(() => validateShopProducts([]), ShopConfigurationError);
});

test('explicit prices use major units and their currency, including zero and zero-decimal currencies', () => {
  for (const [amount, currency, expected] of [
    [25.5, 'USD', 'USD\u00a025.50'], [7.25, 'CAD', 'CAD\u00a07.25'],
    [2500, 'JPY', 'JPY\u00a02,500'], [0, 'USD', 'USD\u00a00.00'],
  ]) {
    validateShopProducts([{ ...available, price: { amount, currency } }]);
    assert.equal(formatShopPrice({ amount, currency }), expected);
  }
});

test('real Astro builds enforce stage/noindex/sitemap, render safe external links, reject incomplete data and preserve public pages', { timeout: 120_000 }, () => {
  const root = mkdtempSync(join(tmpdir(), 'bike-bus-shop-test-'));
  const baseConfig = pathToFileURL(resolve('astro.config.mjs')).href;
  function build(name, staged, fixtures) {
    const directory = join(root, name);
    const args = [
      '--import', 'data:text/javascript,globalThis.fetch%20%3D%20()%20%3D%3E%20%7B%20throw%20new%20Error(%22Unexpected%20build-time%20network%20request%22)%3B%20%7D',
      join('node_modules', 'astro', 'astro.js'), 'build', '--outDir', directory,
    ];
    if (fixtures) {
      const configPath = join(root, `${name}.config.mjs`);
      writeFileSync(configPath, `
        import base from ${JSON.stringify(baseConfig)};
        export default {
          ...base,
          vite: { plugins: [{
            name: 'synthetic-shop-test-fixture', enforce: 'pre',
            transform(code, id) {
              if (!id.endsWith('/src/data/shop.ts')) return;
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
    assert.ok(!readdirSync(ordinary.directory).includes('shop'));
    const staged = build('staged', '1');
    assert.equal(staged.result.status, 0, staged.result.stderr);
    const initialHtml = readFileSync(join(staged.directory, 'shop', 'index.html'), 'utf8');
    assert.match(initialHtml, /name="robots" content="noindex, nofollow"/);
    assert.match(initialHtml, /One Mile Bidwell Park Tee/);
    assert.match(initialHtml, /Royal Blue and White/);
    assert.match(initialHtml, /id="merch-heading"/);
    assert.ok(!initialHtml.includes('For the ride.'));
    assert.ok(!initialHtml.includes('And the everyday.'));
    assert.ok(!initialHtml.includes('<form'));
    assert.ok(!initialHtml.includes('Buy in external shop'));
    const external = build('external', '1', [
      { ...available, plannedColors: ['Synthetic planned color'] },
      unavailable,
      { ...available, name: 'Synthetic upcoming product', availability: 'coming-soon' },
    ]);
    assert.equal(external.result.status, 0, external.result.stderr);
    const html = readFileSync(join(external.directory, 'shop', 'index.html'), 'utf8');
    assert.match(html, /href="https:\/\/external-shop\.example\.invalid\/products\/synthetic" rel="external"/);
    assert.equal((html.match(/Buy in external shop/g) ?? []).length, 1, 'Sold-out/coming-soon products must not have purchase links');
    assert.match(html, /USD&nbsp;25\.50|USD\u00a025\.50/);
    assert.match(html, /Synthetic test image/);
    assert.match(html, /Purchases are completed in the external shop, not on this website/);
    assert.ok(!html.includes('Planned colors:'));
    assert.ok(!html.includes('<form'));
    const invalid = build('invalid', '1', [{ ...available, purchaseUrl: null }]);
    assert.notEqual(invalid.result.status, 0);
    assert.match(`${invalid.result.stdout}${invalid.result.stderr}`, /available products need image, price and purchaseUrl/);
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
