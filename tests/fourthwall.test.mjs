import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkoutOrigin, FourthwallError, loadShop } from '../src/lib/fourthwall.ts';

// Entirely synthetic fixtures. These are not real products, credentials or checkout URLs.
const HAT = '11111111-1111-4111-8111-111111111111';
const TEE = '22222222-2222-4222-8222-222222222222';
const VARIANT = '33333333-3333-4333-8333-333333333333';
const SECOND_VARIANT = '44444444-4444-4444-8444-444444444444';
const config = {
  FOURTHWALL_STOREFRONT_TOKEN: 'synthetic-test-only-credential',
  FOURTHWALL_SHOP_URL: 'https://synthetic-test-only.fourthwall.com',
  FOURTHWALL_DAD_HAT_PRODUCT_ID: HAT,
  FOURTHWALL_TEE_PRODUCT_ID: TEE,
};
const shop = { domain: 'synthetic-test-only.fourthwall.com', publicDomain: 'synthetic-test-only.fourthwall.com' };

function fixture(id, overrides = {}) {
  return {
    type: 'PRODUCT', id, name: `Synthetic ${id === HAT ? 'hat' : 'tee'}`,
    slug: 'synthetic-test-only', description: 'Test fixture, not merchandise.',
    access: { type: 'PUBLIC' }, state: { type: 'AVAILABLE' },
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    images: [{ id: VARIANT, url: 'https://images.example.invalid/synthetic.png', transformedUrl: 'https://images.example.invalid/synthetic.png', width: 800, height: 600 }],
    variants: [{
      id: VARIANT, name: 'Synthetic option', sku: 'TEST',
      unitPrice: { value: 25.5, currency: 'USD' },
      stock: { type: 'UNLIMITED' }, images: [], attributes: {}, dimensions: {}, weight: {},
    }],
    ...overrides,
  };
}

function collection(results, pageNumber = 0, hasNextPage = false) {
  return { results, paging: { pageNumber, hasNextPage, pageSize: 50, elementsSize: results.length, elementsTotal: results.length, totalPages: pageNumber + 1 + Number(hasNextPage) } };
}

function mock(responses, calls = []) {
  return async (input, init) => {
    calls.push({ url: new URL(input), init });
    const response = responses.shift();
    assert.notEqual(response, undefined, 'Unexpected request');
    if (response instanceof Error) throw response;
    return response instanceof Response ? response : Response.json(response);
  };
}

async function connected(products, calls = []) {
  return loadShop(config, mock([shop, collection(products)], calls));
}

test('unconfigured mode makes no requests; partial/invalid config fails without echoing values', async () => {
  assert.deepEqual(await loadShop({}, async () => assert.fail('No request allowed')), { connected: false });
  assert.deepEqual(await loadShop(Object.fromEntries(Object.keys(config).map((key) => [key, '']))), { connected: false });
  for (const env of [
    { FOURTHWALL_STOREFRONT_TOKEN: config.FOURTHWALL_STOREFRONT_TOKEN },
    { ...config, FOURTHWALL_DAD_HAT_PRODUCT_ID: 'not-a-uuid' },
    { ...config, FOURTHWALL_TEE_PRODUCT_ID: HAT },
    { ...config, FOURTHWALL_SHOP_URL: 'https://example.invalid' },
  ]) {
    await assert.rejects(loadShop(env), (error) => {
      assert.ok(error instanceof FourthwallError);
      assert.ok(!error.stack.includes(config.FOURTHWALL_STOREFRONT_TOKEN));
      return true;
    });
  }
});

test('loads paginated PUBLIC products in configured order; uses query auth and documented hosted checkout', async () => {
  const calls = [];
  const result = await loadShop(config, mock([
    shop,
    collection([fixture(TEE), fixture('55555555-5555-4555-8555-555555555555', { access: { type: 'PRIVATE' } })], 0, true),
    collection([fixture(HAT)], 1),
  ], calls));
  assert.equal(result.connected, true);
  assert.deepEqual(result.products.map((product) => product.id), [HAT, TEE]);
  assert.equal(result.products[0].priceLabel, 'USD\u00a025.50');
  assert.equal(result.products[0].available, true);
  assert.equal(result.products[0].image.width, 800);
  assert.equal(result.products[0].checkoutAction, `${config.FOURTHWALL_SHOP_URL}/cart/checkout`);
  assert.ok(!JSON.stringify(result).includes(config.FOURTHWALL_STOREFRONT_TOKEN));
  for (const { url, init } of calls) {
    assert.equal(url.origin, 'https://storefront-api.fourthwall.com');
    assert.equal(url.searchParams.get('storefront_token'), config.FOURTHWALL_STOREFRONT_TOKEN);
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.headers.Authorization, undefined);
  }
  assert.equal(calls[1].url.pathname, '/v1/collections/all/products');
  assert.equal(calls[1].url.searchParams.get('size'), '50');
  assert.equal(calls[1].url.searchParams.get('currency'), 'USD');
  assert.equal(calls[2].url.searchParams.get('page'), '1');
});

test('PRIVATE, HIDDEN, ARCHIVED and missing selected products are never successful placeholders', async () => {
  for (const access of ['PRIVATE', 'HIDDEN', 'ARCHIVED']) {
    await assert.rejects(connected([fixture(HAT, { access: { type: access } }), fixture(TEE)]), /missing or not PUBLIC/);
  }
  await assert.rejects(connected([fixture(HAT)]), /missing or not PUBLIC/);
  await assert.rejects(connected([fixture(HAT, { type: 'BUNDLE' }), fixture(TEE)]), /bundles are not supported/);
});

test('availability combines product state and stock; prices are major-unit amounts with currency', async () => {
  for (const overrides of [
    { state: { type: 'SOLD_OUT' } },
    { variants: [{ ...fixture(HAT).variants[0], stock: { type: 'LIMITED', inStock: 0 } }] },
  ]) {
    const result = await connected([fixture(HAT, overrides), fixture(TEE)]);
    assert.equal(result.products[0].available, false);
  }
  for (const [currency, value, expected] of [
    ['CAD', 7.25, 'CAD\u00a07.25'], ['JPY', 2500, 'JPY\u00a02,500'], ['USD', 0, 'USD\u00a00.00'],
  ]) {
    const result = await connected([fixture(HAT, {
      variants: [{ ...fixture(HAT).variants[0], unitPrice: { value, currency }, stock: { type: 'LIMITED', inStock: 2 } }],
    }), fixture(TEE)]);
    assert.equal(result.products[0].priceLabel, expected);
    assert.equal(result.products[0].available, true);
  }
  const variants = [
    { ...fixture(HAT).variants[0], unitPrice: { value: 1, currency: 'USD' }, stock: { type: 'LIMITED', inStock: 0 } },
    { ...fixture(HAT).variants[0], id: SECOND_VARIANT, unitPrice: { value: 30, currency: 'USD' } },
    { ...fixture(HAT).variants[0], id: '55555555-5555-4555-8555-555555555555', unitPrice: { value: 35, currency: 'USD' } },
  ];
  const result = await connected([fixture(HAT, { variants }), fixture(TEE)]);
  assert.equal(result.products[0].priceLabel, 'From USD\u00a030.00');
  assert.equal(result.products[0].variants[0].available, false);
});

test('checkout origin requires HTTPS Fourthwall hosting and matches the API shop', async () => {
  for (const url of [
    'http://synthetic-test-only.fourthwall.com', 'https://fourthwall.com',
    'https://shop.fourthwall.com.evil.invalid', 'https://evil.invalid/?shop.fourthwall.com',
    'https://shop.fourthwall.com/path', 'https://user:password@shop.fourthwall.com',
    'https://shop.fourthwall.com:8443', 'https://shop.fourthwall.com/?token=test',
    'https://shop.fourthwall.com/#fragment', 'javascript:alert(1)',
  ]) assert.throws(() => checkoutOrigin(url), FourthwallError);
  await assert.rejects(loadShop(config, mock([{ ...shop, domain: 'other.fourthwall.com', publicDomain: 'other.fourthwall.com' }])), /checkout shop matching/);
});

test('auth, rate limit, upstream, redirect/network/timeout and malformed errors are explicit and sanitized', async () => {
  for (const status of [401, 403, 404, 429, 500]) {
    await assert.rejects(loadShop(config, mock([new Response(config.FOURTHWALL_STOREFRONT_TOKEN, { status })])), new RegExp(`HTTP ${status}`));
  }
  for (const failure of [
    new Error(`fetch URL includes ${config.FOURTHWALL_STOREFRONT_TOKEN}`),
    new DOMException('Timed out', 'TimeoutError'),
    new TypeError('Redirect refused'),
  ]) {
    await assert.rejects(loadShop(config, mock([failure])), (error) => {
      assert.match(error.message, /failed or timed out/);
      assert.ok(!error.stack.includes(config.FOURTHWALL_STOREFRONT_TOKEN));
      assert.equal(error.cause, undefined);
      return true;
    });
  }
  await assert.rejects(loadShop(config, mock([new Response('not json')])), /malformed JSON/);
});

test('malformed consumed fields fail closed; no unsafe images, prices, stock, IDs or paging', async () => {
  const base = fixture(HAT);
  for (const overrides of [
    { state: { type: 'UNKNOWN' } }, { access: { type: 'UNKNOWN' } },
    { name: '' }, { variants: [] }, { images: [] },
    { name: config.FOURTHWALL_STOREFRONT_TOKEN },
    { images: [{ ...base.images[0], url: 'javascript:alert(1)' }] },
    { images: [{ ...base.images[0], url: `https://images.example.invalid/?storefront_token=${config.FOURTHWALL_STOREFRONT_TOKEN}` }] },
    { images: [{ ...base.images[0], width: 0 }] },
    { variants: [{ ...base.variants[0], id: 'injection:1,other' }] },
    { variants: [{ ...base.variants[0], unitPrice: { value: -1, currency: 'USD' } }] },
    { variants: [{ ...base.variants[0], unitPrice: { value: 5, currency: 'XXX' } }] },
    { variants: [{ ...base.variants[0], stock: { type: 'UNKNOWN' } }] },
    { variants: [{ ...base.variants[0], stock: { type: 'LIMITED', inStock: -1 } }] },
    { variants: [{ ...base.variants[0], stock: { type: 'LIMITED', inStock: 1.5 } }] },
    { variants: [base.variants[0], base.variants[0]] },
    { variants: [base.variants[0], { ...base.variants[0], id: SECOND_VARIANT, unitPrice: { value: 5, currency: 'CAD' } }] },
  ]) await assert.rejects(connected([fixture(HAT, overrides), fixture(TEE)]), FourthwallError);
  for (const data of [
    {}, { results: [], paging: {} }, { results: {}, paging: { pageNumber: 0, hasNextPage: false } },
    { results: [], paging: { pageNumber: 1, hasNextPage: false } },
    { results: [], paging: { pageNumber: 0, hasNextPage: 'false' } },
  ]) await assert.rejects(loadShop(config, mock([shop, data])), FourthwallError);
  await assert.rejects(connected([base, base, fixture(TEE)]), /duplicate selected product/);
});

test('pagination has a hard safety bound and cannot silently truncate products', async () => {
  await assert.rejects(loadShop(config, mock([
    shop, ...Array.from({ length: 100 }, (_, index) => collection([], index, true)),
  ])), /pagination exceeded 100 pages/);
});

test('real Astro builds enforce gate, sanitize output, render hosted variant forms and preserve other pages', { timeout: 120_000 }, () => {
  const root = mkdtempSync(join(tmpdir(), 'bike-bus-shop-build-test-'));
  const env = { ...process.env, ...config };
  // Preload only in this test subprocess: no network and no fixture output in dist/.
  const preloader = `
    const responses = ${JSON.stringify([shop, collection([
      fixture(HAT, { variants: [
        fixture(HAT).variants[0],
        { ...fixture(HAT).variants[0], id: SECOND_VARIANT, name: 'Synthetic sold-out option', stock: { type: 'LIMITED', inStock: 0 } },
      ] }),
      fixture(TEE, { state: { type: 'SOLD_OUT' } }),
    ])])};
    globalThis.fetch = async (input) => {
      if (new URL(input).origin !== 'https://storefront-api.fourthwall.com') throw new Error('Unexpected test request');
      if (!responses.length) throw new Error('Unexpected additional test request');
      return Response.json(responses.shift());
    };
  `;
  function build(name, staged, mockApi = false, settings = env) {
    const directory = join(root, name);
    const args = mockApi ? ['--import', `data:text/javascript,${encodeURIComponent(preloader)}`] : [];
    args.push(join('node_modules', 'astro', 'astro.js'), 'build', '--outDir', directory);
    const result = spawnSync(process.execPath, args, {
      env: { ...settings, SHOP_STAGED: staged }, encoding: 'utf8', timeout: 30_000,
    });
    assert.ok(!`${result.stdout}${result.stderr}`.includes(config.FOURTHWALL_STOREFRONT_TOKEN), 'Credential leaked in build logs');
    return { directory, result };
  }
  try {
    const ordinary = build('ordinary', '0');
    assert.equal(ordinary.result.status, 0, ordinary.result.stderr);
    assert.ok(!readdirSync(ordinary.directory).includes('shop'));
    const partial = build('partial', '1', false, { ...env, FOURTHWALL_TEE_PRODUCT_ID: '' });
    assert.notEqual(partial.result.status, 0);
    assert.match(`${partial.result.stdout}${partial.result.stderr}`, /set FOURTHWALL_STOREFRONT_TOKEN/);
    const connectedBuild = build('connected', '1', true);
    assert.equal(connectedBuild.result.status, 0, connectedBuild.result.stderr);
    const html = readFileSync(join(connectedBuild.directory, 'shop', 'index.html'), 'utf8');
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    assert.match(html, /Synthetic hat/);
    assert.match(html, /images\.example\.invalid\/synthetic\.png/);
    assert.match(html, /USD&nbsp;25\.50|USD\u00a025\.50/);
    assert.match(html, /action="https:\/\/synthetic-test-only\.fourthwall\.com\/cart\/checkout"/);
    assert.match(html, new RegExp(`value="${VARIANT}:1"`));
    assert.match(html, new RegExp(`value="${SECOND_VARIANT}:1" disabled`));
    assert.match(html, /name="currency" value="USD"/);
    assert.equal((html.match(/<form /g) ?? []).length, 1, 'Sold-out product must have no form');
    assert.match(html, /<select[^>]+required/);
    assert.match(html, /<option value="" selected disabled/);
    assert.ok(!html.includes('Product photo coming soon.'));
    assert.ok(!readFileSync(join(connectedBuild.directory, 'sitemap-0.xml'), 'utf8').includes('/shop'));
    function scan(directory, baseline) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        const previous = baseline ? join(baseline, entry.name) : undefined;
        if (entry.isDirectory()) {
          scan(path, previous);
        } else if (/\.(html|js|css|xml)$/.test(entry.name)) {
          const content = readFileSync(path, 'utf8');
          assert.ok(!content.includes(config.FOURTHWALL_STOREFRONT_TOKEN), 'Credential leaked into static output');
          if (entry.name.endsWith('.html') && previous && !path.includes(`${join('shop', 'index.html')}`)) {
            assert.equal(content, readFileSync(previous, 'utf8'), 'Existing public page changed');
          }
        }
      }
    }
    scan(connectedBuild.directory, ordinary.directory);
  } finally {
    rmSync(root, { recursive: true });
  }
});
