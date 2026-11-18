"""Check the real staged Printify catalog. Screenshot artifacts stay outside the site."""
import argparse
import re
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


def contrast_ratio(foreground, background):
    def luminance(color):
        channels = [int(value) / 255 for value in re.findall(r"\d+", color)[:3]]
        linear = [value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4 for value in channels]
        return sum(value * weight for value, weight in zip(linear, [0.2126, 0.7152, 0.0722]))
    light, dark = sorted([luminance(foreground), luminance(background)], reverse=True)
    return (light + 0.05) / (dark + 0.05)


def run(url, artifacts, production=False):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="msedge", headless=True)
        for width in [320, 375, 390, 768, 1440]:
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
                if production:
                    expect(page.locator('meta[name="robots"], .shop-notice')).to_have_count(0)
                else:
                    expect(page.locator('meta[name="robots"]')).to_have_attribute("content", "noindex, nofollow")
                expect(page.locator(".site-header")).to_have_count(1)
                expect(page.locator(".site-footer")).to_have_count(1)
                expect(page.locator(".shop-card")).to_have_count(6)
                expect(page.locator(".shop-card h3")).to_have_text([
                    "One Mile Bidwell Park Youth Tee", "Bike Bus Chico Trucker Hat", "Bike Bus Crewneck Youth",
                    "Bike Bus Chico Retro Ride Tee",
                    "Chico Rides Youth Tee - CCDS", "Chico Rides Youth Tee - Parkview",
                ])
                expect(page.locator(".shop-category")).to_have_count(0)
                expect(page.locator(".shop-description")).to_have_text([
                    "Celebrate Chico's One Mile Recreation Area with this colorful youth tee featuring a Bike Bus ride through Bidwell Park.",
                    "Show your Bike Bus Chico pride on the school ride and beyond with our classic trucker hat.",
                    "A cozy layer for chilly school mornings, featuring our bicycle-inspired Bike Bus Chico wordmark.",
                    "Celebrate riding together with retro racing stripes and our signature cyclist graphic.",
                    "Celebrate Chico Country Day School with school-inspired lettering, a colorful bicycle wheel and the Bike Bus Chico logo.",
                    "Celebrate Parkview Elementary with school-inspired lettering, a colorful bicycle wheel and the Bike Bus Chico logo.",
                ])
                expect(page.locator(".shop-planned-colors")).to_have_count(0)
                expect(page.locator(".shop-placeholder")).to_have_count(0)
                expect(page.locator(".shop-card .status")).to_have_text(["Available"] * 6)
                expect(page.locator(".shop-card form, .shop-card select")).to_have_count(0)
                expect(page.locator(".shop-buy")).to_have_count(6)
                expect(page.locator(".shop-price")).to_have_text(["$9.99", "$24.99", "$24.99", "From $16.99", "$9.99", "$9.99"])
                expect(page.locator(".shop-shipping")).to_have_text(["Shipping calculated at checkout"] * 6)
                expect(page.locator(".shop-action")).to_have_text(["Choose options & buy ↗"] * 6)
                expect(page.locator(".shop-card img")).to_have_count(6)
                for image, dimension in zip(page.locator(".shop-card img").all(), [2048, 2000, 2048, 2048, 2048, 2048]):
                    expect(image).to_have_attribute("loading", "lazy")
                    expect(image).to_have_attribute("width", str(dimension))
                    expect(image).to_have_attribute("height", str(dimension))
                    assert image.get_attribute("alt").strip()
                    assert image.evaluate("e => getComputedStyle(e).objectFit") == "contain"
                    image.scroll_into_view_if_needed()
                    expect(image).to_have_js_property("naturalWidth", dimension)
                    expect(image).to_have_js_property("naturalHeight", dimension)
                links = page.locator(".shop-card a")
                expect(links).to_have_count(6)
                for link, product_id in zip(links.all(), ["34402078", "34402305", "34402616", "34413817", "34621182", "34621292"]):
                    expect(link).to_have_attribute("href", f"https://bike-bus-chico.printify.me/product/{product_id}")
                    assert link.get_attribute("target") is None
                    expect(link.locator("a, button, input, select, [tabindex]")).to_have_count(0)
                expect(page.locator("#shop-community-heading")).to_have_text("Made for the ride. Priced for our families.")
                expect(page.locator(".shop-community > p:not(.eyebrow)")).to_have_text(
                    "We believe more kids should experience the joy of biking to school. Our gear helps celebrate the families, friendships, and community that make Bike Bus Chico possible."
                )
                expect(page.locator(".nav > a")).to_have_text([
                    "Find a Bike Bus", "Ride With Us", "Start a Bike Bus", "Shop", "About", "Find your ride ↗",
                ])
                expect(page.locator('.site-header a[href="/shop"]')).to_have_count(1)
                expect(page.locator('.site-header a[href="/shop"]')).to_have_attribute("aria-current", "page")
                expect(page.locator('.site-footer a[href^="/shop"]')).to_have_count(0)
                assert "storefront_token" not in page.content()
                assert "fourthwall" not in page.content().lower()
                assert "charitable" not in page.locator("main").inner_text().lower()
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
                for element in page.locator(".shop-card h3, .shop-description, .shop-price, .shop-shipping, .shop-action, .shop-card .status, .shop-community h2, .shop-community p, .shop-community a").all():
                    colors = element.evaluate("""e => {
                        const style = getComputedStyle(e);
                        let parent = e;
                        while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
                        return {fg: style.color, bg: getComputedStyle(parent).backgroundColor, size: parseFloat(style.fontSize)};
                    }""")
                    assert contrast_ratio(colors["fg"], colors["bg"]) >= (3 if colors["size"] >= 24 else 4.5), colors
                for card in page.locator(".shop-card").all():
                    action = card.locator(".shop-action").bounding_box()
                    content = card.locator(".shop-card-content").bounding_box()
                    assert 44 <= action["height"] <= 60, f"Wrapped or undersized action at {width}px: {action}"
                    assert abs(action["width"] - (content["width"] - 2 * (30 if width >= 761 else 24))) < 1
                    assert card.evaluate("e => getComputedStyle(e).transitionDuration") == "0s"
                    assert card.locator(".shop-action").evaluate("e => getComputedStyle(e).transform") == "none"
                notice = page.locator(".lede" if production else ".shop-notice").bounding_box()
                grid = page.locator(".shop-grid").bounding_box()
                gap = grid["y"] - notice["y"] - notice["height"]
                assert 12 <= gap <= 20, f"Excess hero-grid gap at {width}px: {gap}"
                if javascript and width <= 760:
                    assert grid["y"] < 600, f"Product collection starts too low at {width}px: {grid}"
                cards = [card.bounding_box() for card in page.locator(".shop-card").all()]
                if width <= 760:
                    for previous, following in zip(cards, cards[1:]):
                        assert following["y"] >= previous["y"] + previous["height"]
                else:
                    columns = 3 if width > 1100 else 2
                    for start in range(0, len(cards), columns):
                        row = cards[start:start + columns]
                        assert max(card["y"] for card in row) - min(card["y"] for card in row) < 1
                        assert max(card["height"] for card in row) - min(card["height"] for card in row) < 1
                        if start:
                            assert row[0]["y"] >= cards[start - columns]["y"] + cards[start - columns]["height"]
                        for selector in [".shop-price", ".shop-action"]:
                            positions = [element.bounding_box()["y"] for element in page.locator(selector).all()[start:start + columns]]
                            assert max(positions) - min(positions) < 1, f"Unaligned {selector}: {positions}"
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
                if javascript and width in [375, 390, 768]:
                    page.goto(f"{url}/shop/")
                    toggle = page.locator(".menu-toggle")
                    if width <= 760:
                        toggle.focus()
                        page.keyboard.press("Enter")
                        expect(toggle).to_have_attribute("aria-expanded", "true")
                        page.keyboard.press("Tab")
                        expect(page.locator(".nav a").first).to_be_focused()
                        toggle.focus()
                        page.keyboard.press("Enter")
                        expect(toggle).to_have_attribute("aria-expanded", "false")
                        toggle.click()
                        page.locator('.nav a[href="/shop"]').click()
                        expect(page).to_have_url(re.compile(re.escape(url) + r"/shop/?$"))
                    else:
                        expect(page.locator(".nav a").first).to_be_visible()
                if javascript:
                    page.goto(f"{url}/shop/")
                    page.evaluate("document.fonts.ready")
                    for image in page.locator(".shop-card img").all():
                        image.scroll_into_view_if_needed()
                        expect(image).to_have_js_property("complete", True)
                    page.evaluate("scrollTo(0, 0)")
                    page.screenshot(path=str(artifacts / f"shop-{width}.png"), full_page=True)
                if width == 320 and javascript:
                    page.evaluate("""() => {
                        const sizes = [...document.querySelectorAll('main *')].map(e => [e, parseFloat(getComputedStyle(e).fontSize)]);
                        sizes.forEach(([e, size]) => e.style.fontSize = `${size * 2}px`);
                    }""")
                    assert page.locator(".shop-card h3").first.evaluate("e => parseFloat(getComputedStyle(e).fontSize)") == 56
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
                context.close()
        for motion in ["no-preference", "reduce"]:
            context = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion=motion)
            page = context.new_page()
            page.goto(f"{url}/shop/")
            page.evaluate("document.fonts.ready")
            card = page.locator(".shop-card").first
            page.locator(".shop-card h3").first.scroll_into_view_if_needed()
            before = card.bounding_box()
            page.locator(".shop-card h3").first.hover()
            page.wait_for_timeout(200)
            expect(card).to_have_css("border-top-color", "rgb(26, 86, 200)")
            expect(card.locator(".shop-action")).to_have_css("background-color", "rgb(18, 48, 110)")
            assert card.bounding_box() == before, "Hover must not move or resize the card"
            assert card.locator(".shop-action").evaluate("e => getComputedStyle(e).transform") == "none"
            if motion == "reduce":
                expect(card).to_have_css("transition-duration", "0s")
                expect(card.locator(".shop-action")).to_have_css("transition-duration", "0s")
            else:
                assert card.evaluate("e => getComputedStyle(e).transitionDuration") != "0s"
            for image in page.locator(".shop-card img").all():
                frame = image.locator("..").bounding_box()
                image.evaluate("e => e.removeAttribute('src')")
                expect(image).to_have_js_property("naturalWidth", 0)
                assert image.locator("..").bounding_box() == frame, "Image dimensions must reserve the frame before mockups load"
            context.close()
        browser.close()
    print("PASS: 320/375/390/768/1440px, exact catalog/copy/dollar prices, genuine proportional lazy mockups/reserved frames, aligned desktop cards/prices/buttons, full-width tap targets, same-tab anchors, contrast/focus/reduced-motion hover, 200% text, mobile navigation, no overflow and no-JS content.")


def run_fixture(html_path):
    """Exercise real built HTML using synthetic product data without a supplier or preview deployment."""
    html = html_path.read_text(encoding="utf-8")
    assets = html_path.parent.parent / "_astro"
    with sync_playwright() as playwright:
        print("Launching synthetic configured-card browser checks.", flush=True)
        browser = playwright.chromium.launch(channel="msedge", headless=True)
        for width in [320, 375, 390, 768, 1440]:
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
                for selector in [".shop-card img", ".shop-card .shop-action"]:
                    page.goto("http://shop-fixture.test/shop/", timeout=10000)
                    page.locator(selector).first.click()
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
    parser.add_argument("--production", action="store_true")
    args = parser.parse_args()
    if args.fixture_html:
        run_fixture(args.fixture_html.resolve())
    else:
        if args.artifacts is None:
            parser.error("--artifacts is required with --url")
        args.artifacts.mkdir(parents=True, exist_ok=True)
        run(args.url.rstrip("/"), args.artifacts, args.production)
