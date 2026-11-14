"""Check the real no-config staged shop. Screenshot artifacts stay outside the site."""
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
                    "Official Bike Bus Chico merchandise for families, ride leaders, and supporters."
                )
                expect(page.locator('meta[name="robots"]')).to_have_attribute("content", "noindex, nofollow")
                expect(page.locator(".site-header")).to_have_count(1)
                expect(page.locator(".site-footer")).to_have_count(1)
                expect(page.locator(".shop-card")).to_have_count(2)
                expect(page.locator(".shop-card h3")).to_have_text(["Bike Bus Chico Trucker Hat", "One Mile Bidwell Park Tee"])
                expect(page.locator(".shop-planned-colors")).to_have_count(1)
                expect(page.locator(".shop-planned-colors")).to_have_text("Planned colors: Royal Blue and White.")
                expect(page.locator(".shop-card").nth(0).locator(".shop-planned-colors")).to_have_count(0)
                expect(page.locator(".shop-card").nth(1).locator(".shop-planned-colors")).to_have_count(1)
                expect(page.locator(".shop-placeholder")).to_have_count(2)
                expect(page.locator(".shop-card .status")).to_have_text(["Coming soon", "Coming soon"])
                expect(page.locator(".shop-card img, .shop-card a, .shop-card form, .shop-card select")).to_have_count(0)
                expect(page.locator(".shop-price")).to_have_count(0)
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
                else:
                    assert abs(cards[0]["y"] - cards[1]["y"]) < 1
                page.keyboard.press("Tab")
                expect(page.locator(".skip")).to_be_focused()
                page.keyboard.press("Enter")
                expect(page.locator("#main")).to_be_focused()
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
                    page.screenshot(path=str(artifacts / f"shop-{width}.png"), full_page=True)
                if width == 320 and javascript:
                    page.evaluate("document.documentElement.style.fontSize = '200%'")
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
                context.close()
        browser.close()
    print("PASS: staged Trucker Hat/Tee placeholders, textual planned tee colors only, shared header/footer, no purchase data, no nav link, responsive layout, skip link, keyboard menu/About and no-JS content.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--artifacts", required=True, type=Path)
    args = parser.parse_args()
    args.artifacts.mkdir(parents=True, exist_ok=True)
    run(args.url.rstrip("/"), args.artifacts)
