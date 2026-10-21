"""Compare opt-in school chooser designs in real homepage context."""
import argparse
import json
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


def run(url, artifacts):
    measurements = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            channel="msedge", headless=True, ignore_default_args=["--hide-scrollbars"]
        )
        for width in [320, 390, 768, 1440]:
            context = browser.new_context(
                viewport={"width": width, "height": 900},
                java_script_enabled=False, reduced_motion="reduce",
            )
            page = context.new_page()
            assert page.goto(url).ok
            expect(page.locator(".school-card")).to_have_count(2)
            original_height = page.locator("#school-selector").bounding_box()["height"]
            for variant in ["circles", "tiles"]:
                assert page.goto(f"{url}/review/{variant}/").ok
                expect(page.locator('meta[name="robots"]')).to_have_attribute("content", "noindex, nofollow")
                expect(page.locator(".hero")).to_have_count(1)
                expect(page.locator(".carousel-slide")).to_have_count(11)
                expect(page.locator(".closing-pattern")).to_have_count(1)
                expect(page.locator("#school-selector h2")).to_have_text("Find your school")
                expect(page.locator(".school-choice")).to_have_count(2)
                expect(page.locator(".school-card")).to_have_count(0)
                expect(page.locator(".school-status").nth(0)).to_have_text("2 routes · Fridays")
                expect(page.locator(".school-status").nth(1)).to_have_text("Starting soon · Fridays")
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
                for image in page.locator(".school-icon img").all():
                    image.scroll_into_view_if_needed()
                    expect(image).to_have_js_property("complete", True)
                    assert image.evaluate("e => e.naturalWidth === 1000 && getComputedStyle(e).objectFit === 'contain'")
                links = page.locator(".school-choice")
                links.first.focus()
                page.keyboard.press("Tab")
                expect(links.nth(1)).to_be_focused()
                assert links.nth(1).evaluate("e => getComputedStyle(e).outlineStyle !== 'none'")
                bounds = [link.bounding_box() for link in links.all()]
                if variant == "tiles" and width <= 760:
                    assert bounds[1]["y"] > bounds[0]["y"]
                if variant == "tiles" and width > 760:
                    assert abs(bounds[0]["y"] - bounds[1]["y"]) < 1
                if variant == "circles" and width >= 390:
                    assert abs(bounds[0]["y"] - bounds[1]["y"]) < 1
                section = page.locator("#school-selector")
                height = section.bounding_box()["height"]
                assert height < original_height * 0.65, (width, variant, height, original_height)
                measurements.append({
                    "width": width, "variant": variant, "height": round(height),
                    "original_height": round(original_height),
                    "reduction_percent": round((1 - height / original_height) * 100),
                })
                if width in [390, 1440]:
                    page.evaluate("document.activeElement.blur()")
                    section.screenshot(path=str(artifacts / f"{variant}-chooser-{width}.png"))
                    section.evaluate("e => scrollTo(0, e.getBoundingClientRect().top + scrollY - 120)")
                    page.screenshot(path=str(artifacts / f"{variant}-context-{width}.png"))
                    page.screenshot(path=str(artifacts / f"{variant}-homepage-{width}.png"), full_page=True)
                links.first.focus()
                page.keyboard.press("Enter")
                expect(page).to_have_url(f"{url}/schools/chico-country-day-school/")
                page.goto(f"{url}/review/{variant}/")
                page.locator(".school-choice").nth(1).click()
                expect(page).to_have_url(f"{url}/schools/parkview-elementary/")
            context.close()
        browser.close()
    (artifacts / "design-measurements.json").write_text(json.dumps(measurements, indent=2), encoding="utf-8")
    print(json.dumps(measurements, indent=2))
    print("PASS: both variants, native no-JS links, keyboard focus, responsive layout, substantial height reduction")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--artifacts", required=True, type=Path)
    args = parser.parse_args()
    args.artifacts.mkdir(parents=True, exist_ok=True)
    run(args.url.rstrip("/"), args.artifacts)
