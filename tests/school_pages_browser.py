"""School discovery and route regressions, using installed Playwright and Edge."""
import argparse
import json
from pathlib import Path
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright, expect


def run(url, artifacts):
    results = []
    pages = [
        "/", "/routes/", "/schools/chico-country-day-school/",
        "/schools/parkview-elementary/", "/routes/centennial-parkview/",
        "/routes/hancock-park-ccds/", "/routes/west-chico-ccds/",
    ]
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="msedge", headless=True, ignore_default_args=["--hide-scrollbars"])
        for width in [320, 390, 768, 1440]:
            context = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce")
            page = context.new_page()
            for route in pages:
                assert page.goto(url + route).ok
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (width, route)
                for image in page.locator('img[src^="/schools/"]').all():
                    image.scroll_into_view_if_needed()
                    expect(image).to_have_js_property("complete", True)
                    assert image.evaluate("e => e.naturalWidth === 1000 && e.naturalHeight === 1000 && getComputedStyle(e).objectFit === 'contain'")
                if route == "/":
                    assert page.locator(".school-choice").count() == 2
                    assert page.locator(".route-card").count() == 0
                    expect(page.locator(".school-choice").nth(1)).to_contain_text("Starting soon")
                if route == "/routes/":
                    assert page.locator(".school-card").count() == 2
                    assert page.locator(".route-card").count() == 0
                    expect(page.locator(".school-card").nth(1)).to_contain_text("Not yet running")
                if route == "/schools/chico-country-day-school/":
                    assert page.locator(".route-card").count() == 2
                    expect(page.locator('main a[href="/routes/hancock-park-ccds/"]').first).to_be_visible()
                    expect(page.locator('main a[href="/routes/west-chico-ccds/"]').first).to_be_visible()
                    assert "Parkview" not in page.locator(".route-grid").inner_text()
                if route == "/schools/parkview-elementary/":
                    assert page.locator(".route-card").count() == 1
                    expect(page.locator(".route-card")).to_contain_text("Not yet running")
                    assert "Hancock" not in page.locator(".route-grid").inner_text()
                if route == "/routes/centennial-parkview/":
                    text = page.locator("main").inner_text()
                    for fact in ["not yet running", "Fridays", "8:00 AM", "8:10 AM", "Centennial Avenue", "E 8th Street", "Bidwell Park", "El Monte", "Forest", "Kern", "Glenn", "El Dorado"]:
                        assert fact in text, fact
                    for invented in ["This route is running", "This week's ride", "Distance", "mile", "Meet your ride leader"]:
                        assert invented not in text, invented
                    assert page.locator(".stop").count() == 2
                    iframe = page.locator(".live-map iframe")
                    assert "1_CZ_hDQOpPKBpDb2zlrSwhmsFYHcrDE" in iframe.get_attribute("src")
                    assert "/viewer?" in page.locator(".live-map a").get_attribute("href")
                    assert not page.locator('a[href*="/edit"]').count()
                if route.endswith("hancock-park-ccds/"):
                    assert page.locator(".static-map img").get_attribute("src") == "/routes/hancock-park-map-3b93b79529e3.png"
                    assert "7:25 AM" in page.locator("main").inner_text()
                if route.endswith("west-chico-ccds/"):
                    assert page.locator(".static-map img").get_attribute("src") == "/routes/west-chico-map-6832c28e94a5.png"
                    for time in ["7:50 AM", "8:00 AM", "8:15 AM"]:
                        assert time in page.locator("main").inner_text()
                if width in [390, 1440] and route in ["/", "/schools/chico-country-day-school/", "/schools/parkview-elementary/", "/routes/centennial-parkview/"]:
                    if route == "/":
                        page.locator(".ride-gallery").screenshot(path=str(artifacts / f"carousel-{width}.png"))
                    if route == "/routes/centennial-parkview/":
                        page.locator(".live-map iframe").scroll_into_view_if_needed()
                        expect(page.frame_locator(".live-map iframe").locator("body")).to_contain_text("Parkview", timeout=30000)
                        page.wait_for_timeout(1500)
                        page.locator(".live-map").screenshot(path=str(artifacts / f"parkview-map-{width}.png"))
                    page.evaluate("scrollTo(0, 0)")
                    page.screenshot(path=str(artifacts / f"{route.strip('/').replace('/', '-') or 'home'}-{width}.png"), full_page=True)
            results.append(f"{width}px: school cards, route ownership, facts, logos, maps and no overflow")
            context.close()

        context = browser.new_context(java_script_enabled=False, viewport={"width": 390, "height": 844})
        page = context.new_page()
        page.goto(url)
        page.locator('main a[href="/schools/parkview-elementary/"]').first.click()
        page.locator('main a[href="/routes/centennial-parkview/"]').first.click()
        expect(page.locator("h1")).to_contain_text("Centennial")
        page.locator(".crumb").click()
        expect(page.locator("h1")).to_have_text("Parkview Elementary")
        results.append("No-JS: homepage to school to route and back")
        checked = set()
        for route in pages:
            page.goto(url + route)
            for link in page.locator('a[href^="/"], img[src^="/"]').all():
                href = link.get_attribute("href") or link.get_attribute("src")
                if href not in checked:
                    response = page.request.get(urljoin(url, href))
                    assert response.ok, (href, response.status)
                    checked.add(href)
        results.append(f"{len(checked)} local page, image and download links return success")
        context.close()

        page = browser.new_page()
        for kind in ["viewer", "embed"]:
            response = page.goto(f"https://www.google.com/maps/d/{kind}?mid=1_CZ_hDQOpPKBpDb2zlrSwhmsFYHcrDE")
            assert response.ok
            page.wait_for_timeout(2000)
            text = page.locator("body").inner_text()
            assert "Parkview" in text
            assert "You need permission" not in text
        results.append("Parkview public viewer and embed show Parkview without authentication")
        browser.close()
    (artifacts / "school-results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--artifacts", required=True, type=Path)
    args = parser.parse_args()
    args.artifacts.mkdir(parents=True, exist_ok=True)
    run(args.url.rstrip("/"), args.artifacts)
