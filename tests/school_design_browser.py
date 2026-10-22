"""Check the selected circle design, shared text rows and review alternatives."""
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
            expect(page.locator('[data-school-design="circles"]')).to_have_count(1)
            expect(page.locator(".review-nav")).to_have_count(0)
            expect(page.locator('meta[name="robots"]')).to_have_count(0)
            for variant in ["selected", "circles", "tiles"]:
                target = url if variant == "selected" else f"{url}/review/{variant}/"
                assert page.goto(target).ok
                if variant != "selected":
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
                if variant != "tiles" and width >= 390:
                    assert abs(bounds[0]["y"] - bounds[1]["y"]) < 1
                    name_bounds = [name.bounding_box() for name in page.locator(".school-name").all()]
                    status_bounds = [status.bounding_box() for status in page.locator(".school-status").all()]
                    assert abs(name_bounds[0]["y"] - name_bounds[1]["y"]) < 1, name_bounds
                    assert abs(name_bounds[0]["height"] - name_bounds[1]["height"]) < 1, name_bounds
                    assert abs(status_bounds[0]["y"] - status_bounds[1]["y"]) < 1, status_bounds
                if variant != "tiles" and width == 320:
                    assert bounds[1]["y"] >= bounds[0]["y"] + bounds[0]["height"]
                expect(page.locator(".school-name").nth(0)).to_have_text("Chico Country Day School")
                expect(page.locator(".school-name").nth(1)).to_have_text("Parkview Elementary")
                if variant != "tiles":
                    phrase = page.locator(".school-phrase")
                    expect(phrase).to_have_text("Day School")
                    assert phrase.evaluate("e => e.getClientRects().length === 1 && getComputedStyle(e).whiteSpace === 'nowrap'")
                    if width >= 390:
                        assert phrase.bounding_box()["y"] > page.locator(".school-name").first.bounding_box()["y"] + 10
                for name in page.locator(".school-name").all():
                    assert name.evaluate("e => e.scrollHeight <= e.clientHeight + 1 && e.scrollWidth <= e.clientWidth + 1")
                section = page.locator("#school-selector")
                height = section.bounding_box()["height"]
                measurements.append({
                    "width": width, "variant": variant, "height": round(height),
                    "name_y": [round(name.bounding_box()["y"], 2) for name in page.locator(".school-name").all()],
                    "status_y": [round(status.bounding_box()["y"], 2) for status in page.locator(".school-status").all()],
                })
                if width in [320, 390, 768, 1440]:
                    page.evaluate("document.activeElement.blur()")
                    section.screenshot(path=str(artifacts / f"{variant}-chooser-{width}.png"))
                    section.evaluate("e => scrollTo(0, e.getBoundingClientRect().top + scrollY - 120)")
                    page.screenshot(path=str(artifacts / f"{variant}-context-{width}.png"))
                    page.screenshot(path=str(artifacts / f"{variant}-homepage-{width}.png"), full_page=True)
                if variant == "selected" and width == 1440:
                    page.locator(".school-name").evaluate_all("names => names.forEach(e => e.style.fontSize = `${parseFloat(getComputedStyle(e).fontSize) * 1.5}px`)")
                    enlarged = [status.bounding_box() for status in page.locator(".school-status").all()]
                    assert abs(enlarged[0]["y"] - enlarged[1]["y"]) < 1, enlarged
                links.first.focus()
                page.keyboard.press("Enter")
                expect(page).to_have_url(f"{url}/schools/chico-country-day-school/")
                page.goto(target)
                page.locator(".school-choice").nth(1).click()
                expect(page).to_have_url(f"{url}/schools/parkview-elementary/")
            context.close()
        browser.close()
    (artifacts / "design-measurements.json").write_text(json.dumps(measurements, indent=2), encoding="utf-8")
    print(json.dumps(measurements, indent=2))
    print("PASS: selected A and review alternatives, shared name/status alignment, no truncation, native no-JS links, focus and responsive layout")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--artifacts", required=True, type=Path)
    args = parser.parse_args()
    args.artifacts.mkdir(parents=True, exist_ok=True)
    run(args.url.rstrip("/"), args.artifacts)
