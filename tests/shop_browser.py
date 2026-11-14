"""Check the real staged Printify catalog. Screenshot artifacts stay outside the site."""
import argparse
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


def run(url, artifacts):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="msedge", headless=True)
        for width in [320, 390, 768, 1440]:
            for javascript in [False, True]:
                context = browser.new_context(
                    viewport={"width": width, "height": 900},
                    java_script_enabled=javascript, reduced_motion="reduce",
                )
                page = context.new_page()
                assert page.goto(f"{url}/shop/").ok
                expect(page.locator("h1")).to_have_text("Wear the ride.")
                expect(page.locator("#merch-heading")).to_have_text("Bike Bus Chico merchandise")
                expect(page.locator("#merch-heading")).to_have_class("sr-only")
                expect(page.locator(".shop-section .section-head")).to_have_count(0)
                expect(page.locator(".lede")).to_have_text(
                    "Bike Bus Chico gear for kids, families, ride leaders, and supporters. Made for the school ride and wherever the road takes you."
                )
                expect(page.locator('meta[name="robots"]')).to_have_attribute("content", "noindex, nofollow")
                expect(page.locator(".site-header")).to_have_count(1)
                expect(page.locator(".site-footer")).to_have_count(1)
                expect(page.locator(".shop-card")).to_have_count(3)
                expect(page.locator(".shop-card h3")).to_have_text([
                    "One Mile Bidwell Park Tee", "Bike Bus Chico Trucker Hat", "Bike Bus Chico Kids' Crewneck Sweatshirt",
                ])
                expect(page.locator(".shop-planned-colors")).to_have_count(0)
                expect(page.locator(".shop-placeholder")).to_have_count(0)
                expect(page.locator(".shop-card .status")).to_have_text(["Available"] * 3)
                expect(page.locator(".shop-card form, .shop-card select")).to_have_count(0)
                expect(page.locator(".shop-buy")).to_have_count(3)
                expect(page.locator(".shop-price")).to_have_text(["USD\u00a09.99", "USD\u00a024.99", "USD\u00a024.99"])
                expect(page.locator(".shop-shipping")).to_have_text(["Shipping calculated at checkout"] * 3)
                expect(page.locator(".shop-action")).to_have_text(["Choose options & buy ↗"] * 3)
                expect(page.locator(".shop-card img")).to_have_count(3)
                for image, dimension in zip(page.locator(".shop-card img").all(), [2048, 2000, 2048]):
                    image.scroll_into_view_if_needed()
                    expect(image).to_have_js_property("naturalWidth", dimension)
                    expect(image).to_have_js_property("naturalHeight", dimension)
                links = page.locator(".shop-card a")
                expect(links).to_have_count(3)
                for link, product_id in zip(links.all(), ["34402078", "34402305", "34402616"]):
                    expect(link).to_have_attribute("href", f"https://bike-bus-chico.printify.me/product/{product_id}")
                    assert link.get_attribute("target") is None
                    expect(link.locator("a, button, input, select, [tabindex]")).to_have_count(0)
                expect(page.locator("#shop-community-heading")).to_have_text("More than merchandise.")
                expect(page.locator(".shop-community > p:not(.eyebrow)")).to_have_text(
                    "We're building a community where more kids can ride to school safely, confidently, and together. Wearing Bike Bus Chico gear helps spread the word."
                )
                expect(page.locator('.site-header a[href^="/shop"], .site-footer a[href^="/shop"]')).to_have_count(0)
                assert "storefront_token" not in page.content()
                assert "fourthwall" not in page.content().lower()
                assert "charitable" not in page.locator("main").inner_text().lower()
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
                notice = page.locator(".shop-notice").bounding_box()
                grid = page.locator(".shop-grid").bounding_box()
                gap = grid["y"] - notice["y"] - notice["height"]
                assert 16 <= gap <= 24, f"Excess hero-grid gap at {width}px: {gap}"
                cards = [card.bounding_box() for card in page.locator(".shop-card").all()]
                if width <= 760:
                    assert cards[1]["y"] >= cards[0]["y"] + cards[0]["height"]
                    assert cards[2]["y"] >= cards[1]["y"] + cards[1]["height"]
                else:
                    assert abs(cards[0]["y"] - cards[1]["y"]) < 1
                    if width > 1100:
                        assert abs(cards[0]["y"] - cards[2]["y"]) < 1
                    else:
                        assert cards[2]["y"] >= cards[0]["y"] + cards[0]["height"]
                page.keyboard.press("Tab")
                expect(page.locator(".skip")).to_be_focused()
                page.keyboard.press("Enter")
                expect(page.locator("#main")).to_be_focused()
                links.first.focus()
                assert links.first.evaluate("e => getComputedStyle(e).outlineStyle !== 'none'")
                for link in links.all()[1:]:
                    page.keyboard.press("Tab")
                    expect(link).to_be_focused()
                page.keyboard.press("Tab")
                expect(page.locator(".shop-community .text-link")).to_be_focused()
                about = page.locator(".shop-community .text-link")
                about.focus()
                assert about.evaluate("e => getComputedStyle(e).outlineStyle !== 'none'")
                page.keyboard.press("Enter")
                expect(page).to_have_url(f"{url}/about/")
                if javascript and width == 390:
                    page.goto(f"{url}/shop/")
                    toggle = page.locator(".menu-toggle")
                    toggle.focus()
                    page.keyboard.press("Enter")
                    expect(toggle).to_have_attribute("aria-expanded", "true")
                    page.keyboard.press("Tab")
                    expect(page.locator(".nav a").first).to_be_focused()
                if javascript:
                    page.goto(f"{url}/shop/")
                    page.evaluate("document.fonts.ready")
                    for image in page.locator(".shop-card img").all():
                        image.scroll_into_view_if_needed()
                        expect(image).to_have_js_property("complete", True)
                    page.evaluate("scrollTo(0, 0)")
                    page.screenshot(path=str(artifacts / f"shop-{width}.png"), full_page=True)
                if width == 320 and javascript:
                    page.evaluate("document.documentElement.style.fontSize = '200%'")
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
                context.close()
        browser.close()
    print("PASS: exact staged catalog/order/verified prices, genuine decoded mockups, available Choose options & buy controls, same-tab single-anchor cards, shared layout, staging, responsive spacing, keyboard and no-JS content.")


def run_fixture(html_path):
    """Exercise real built HTML using synthetic product data without a supplier or preview deployment."""
    html = html_path.read_text(encoding="utf-8")
    assets = html_path.parent.parent / "_astro"
    with sync_playwright() as playwright:
        print("Launching synthetic configured-card browser checks.", flush=True)
        browser = playwright.chromium.launch(channel="msedge", headless=True)
        for width in [320, 390, 768, 1440]:
            for javascript in [False, True]:
                print(f"Checking configured card at {width}px, JavaScript={javascript}.", flush=True)
                context = browser.new_context(viewport={"width": width, "height": 900}, java_script_enabled=javascript)
                context.route("https://**/*", lambda route: route.abort())
                context.route("http://shop-fixture.test/shop/", lambda route: route.fulfill(content_type="text/html", body=html))
                context.route("http://shop-fixture.test/_astro/*", lambda route: route.fulfill(
                    path=assets / route.request.url.rsplit("/", 1)[1].split("?", 1)[0],
                ))
                context.route("https://images.example.invalid/**", lambda route: route.fulfill(
                    content_type="image/svg+xml", body='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"/>',
                ))
                context.route("https://external-shop.example.invalid/**", lambda route: route.fulfill(
                    content_type="text/html", body="<h1>Synthetic external product page</h1>",
                ))
                page = context.new_page()
                page.set_default_timeout(10000)
                page.goto("http://shop-fixture.test/shop/", timeout=10000)
                links = page.locator(".shop-card a")
                expect(links).to_have_count(6)
                link = links.first
                expect(link).to_have_attribute("aria-label", "Choose options & buy Synthetic available product on Printify")
                assert link.get_attribute("target") is None
                expect(link.locator("a, button, input, select, [tabindex]")).to_have_count(0)
                expect(link.locator(".shop-buy")).to_have_text("Choose options & buy ↗")
                expect(page.locator(".shop-card").filter(has_text="Synthetic unverified product").locator("a, .shop-buy")).to_have_count(0)
                expect(page.locator(".shop-card").filter(has_text="Synthetic URL-pending product").locator("a, .shop-buy")).to_have_count(0)
                placeholder = page.locator(".shop-card").filter(has_text="Synthetic placeholder product")
                expect(placeholder.locator("a, img, .shop-price, .shop-shipping, .shop-buy")).to_have_count(0)
                expect(placeholder.locator(".shop-placeholder")).to_have_text("Coming soon Product photo coming soon.")
                for name in ["Synthetic unverified-price product", "Synthetic missing-price product"]:
                    card = page.locator(".shop-card").filter(has_text=name)
                    expect(card.locator(".shop-price, .shop-shipping, .shop-buy")).to_have_count(0)
                    expect(card.locator(".shop-action")).to_have_text("View details ↗")
                for name in ["Synthetic unavailable product", "Synthetic upcoming product", "Synthetic purchase-unverified product"]:
                    card = page.locator(".shop-card").filter(has_text=name)
                    expect(card.locator(".shop-buy")).to_have_count(0)
                    expect(card.locator("a")).to_have_count(1)
                    expect(card.locator(".shop-action")).to_have_text("View details ↗")
                for details in links.all()[1:]:
                    assert details.get_attribute("target") is None
                    expect(details.locator("a, button, input, select, [tabindex]")).to_have_count(0)
                expect(link.locator(".shop-pricing .shop-shipping")).to_have_text("Shipping calculated at checkout")
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
                link.focus()
                assert link.evaluate("e => getComputedStyle(e).outlineStyle !== 'none'")
                for details in links.all()[1:]:
                    page.keyboard.press("Tab")
                    expect(details).to_be_focused()
                page.keyboard.press("Tab")
                expect(page.locator(".shop-community .text-link")).to_be_focused()
                link.focus()
                page.keyboard.press("Enter")
                expect(page).to_have_url("https://external-shop.example.invalid/products/synthetic")
                assert len(context.pages) == 1
                page.goto("http://shop-fixture.test/shop/", timeout=10000)
                page.locator(".shop-card h3").first.click()
                expect(page).to_have_url("https://external-shop.example.invalid/products/synthetic")
                assert len(context.pages) == 1
                page.goto("http://shop-fixture.test/shop/", timeout=10000)
                page.locator(".shop-card").filter(has_text="Synthetic upcoming product").locator("h3").click()
                expect(page).to_have_url("https://external-shop.example.invalid/products/synthetic")
                assert len(context.pages) == 1
                context.close()
        browser.close()
    print("PASS: verified clickable card, single keyboard stop, same-tab keyboard/card activation, no unverified/missing URL links, shipping near real price and mobile/no-JS rendering.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--url")
    source.add_argument("--fixture-html", type=Path)
    parser.add_argument("--artifacts", type=Path)
    args = parser.parse_args()
    if args.fixture_html:
        run_fixture(args.fixture_html.resolve())
    else:
        if args.artifacts is None:
            parser.error("--artifacts is required with --url")
        args.artifacts.mkdir(parents=True, exist_ok=True)
        run(args.url.rstrip("/"), args.artifacts)
