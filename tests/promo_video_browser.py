"""Optional integration checks using an existing Python Playwright + Edge install.

Build and start the local Astro preview before running this file.
python tests\\promo_video_browser.py --url http://127.0.0.1:8778 --artifacts <directory>
No application or npm dependencies are added by this test.
"""

import argparse
import json
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


def run(url, artifacts):
    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="msedge", headless=True)

        def page_for(**kwargs):
            signals = kwargs.pop("connection", {"saveData": False, "effectiveType": "4g", "downlink": 10})
            context = browser.new_context(**kwargs)
            page = context.new_page()
            page.add_init_script("""window.testConnection = Object.assign(new EventTarget(), """ +
                                 json.dumps(signals) + """);
                Object.defineProperty(navigator, 'connection', {get: () => window.testConnection});""")
            page.errors = []
            page.media_requests = []
            page.on("pageerror", lambda error: page.errors.append(str(error)))
            page.on("request", lambda request: page.media_requests.append(request.url)
                    if ".mp4" in request.url else None)
            return page

        def open_video(page):
            page.goto(url)
            page.locator(".promo-controls").wait_for(state="visible")
            page.locator("video").scroll_into_view_if_needed()

        def playing(page):
            page.wait_for_function("document.querySelector('video').currentTime > 0 && !document.querySelector('video').paused")
            expect(page.locator("[data-play]")).to_have_text("Pause video")
            expect(page.locator("[data-play]")).to_have_attribute("aria-pressed", "true")

        def paused(page):
            page.wait_for_function("document.querySelector('video').paused")
            expect(page.locator("[data-play]")).to_have_text("Play video")
            expect(page.locator("[data-play]")).to_have_attribute("aria-pressed", "false")

        def done(page, name):
            assert not page.errors, page.errors
            results.append(name)
            print(f"PASS: {name}", flush=True)
            page.context.close()

        for width in [320, 390, 768, 1440, 1920]:
            page = page_for(viewport={"width": width, "height": 900})
            open_video(page)
            playing(page)
            details = page.locator("video").evaluate("""v => ({
                width: v.clientWidth, height: v.clientHeight,
                muted: v.muted, loop: v.loop, inline: v.playsInline,
                native: v.controls, source: v.currentSrc, time: v.currentTime,
                duration: v.duration, naturalWidth: v.videoWidth,
                fit: getComputedStyle(v).objectFit
            })""")
            assert abs(details["width"] / details["height"] - 16 / 9) < 0.02, details
            assert details["width"] == min(width, 1440), details
            assert details["muted"] and details["loop"] and details["inline"], details
            assert not details["native"] and details["fit"] == "contain", details
            assert 30.68 < details["duration"] < 30.75, details
            assert details["naturalWidth"] == (1280 if width <= 760 else 1920), details
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), width
            assert page.locator(".hero .button").get_attribute("href") == "/routes/"
            assert page.locator(".closing-pattern").count() == 1
            assert page.locator("link[rel=canonical]").get_attribute("href") == "https://bikebuschico.org/"
            assert page.locator('meta[name="robots"][content*="noindex"]').count() == 0
            page.locator("[data-play]").click()
            paused(page)
            if width in [390, 1440]:
                page.locator(".photo-grid").scroll_into_view_if_needed()
                page.wait_for_function("Array.from(document.querySelectorAll('.photo-grid img')).every(i => i.complete && i.naturalWidth > 0)")
                page.locator("video").scroll_into_view_if_needed()
                page.locator("video").evaluate("v => { v.currentTime = 3; }")
                page.wait_for_function("!document.querySelector('video').seeking && document.querySelector('video').readyState >= 2")
                page.screenshot(path=str(artifacts / f"homepage-promo-{width}.png"), full_page=True)
                page.locator(".promo-band").screenshot(path=str(artifacts / f"video-band-{width}.png"))
            done(page, f"Layout and actual muted playback at {width}px")

        page = page_for(viewport={"width": 1440, "height": 800})
        page.goto(url)
        page.locator(".promo-controls").wait_for(state="visible")
        page.wait_for_timeout(300)
        assert not page.media_requests, "Offscreen video should not download"
        page.locator("video").scroll_into_view_if_needed()
        playing(page)
        page.locator("[data-sound]").click()
        expect(page.locator("[data-sound]")).to_have_text("Sound off")
        expect(page.locator("[data-sound]")).to_have_attribute("aria-pressed", "true")
        assert not page.locator("video").evaluate("v => v.muted")
        page.locator("[data-play]").focus()
        page.keyboard.press("Space")
        paused(page)
        page.keyboard.press("Enter")
        playing(page)
        assert not page.locator("video").evaluate("v => v.muted"), "Manual sound preference lost"
        page.locator("video").evaluate("v => { v.currentTime = v.duration - 0.15; }")
        page.wait_for_function("document.querySelector('video').currentTime < 2")
        playing(page)
        page.evaluate("scrollTo(0, document.body.scrollHeight)")
        paused(page)
        page.locator("video").scroll_into_view_if_needed()
        playing(page)
        assert not page.locator("video").evaluate("v => v.muted"), "Sound preference lost after viewport suspension"
        page.evaluate("""() => {
            Object.defineProperty(document, 'hidden', {configurable: true, get: () => true});
            document.dispatchEvent(new Event('visibilitychange'));
        }""")
        paused(page)
        page.evaluate("""() => {
            Object.defineProperty(document, 'hidden', {configurable: true, get: () => false});
            document.dispatchEvent(new Event('visibilitychange'));
        }""")
        playing(page)
        page.locator("[data-play]").click()
        page.evaluate("scrollTo(0, 0)")
        page.locator("video").scroll_into_view_if_needed()
        paused(page)
        page.emulate_media(reduced_motion="reduce")
        page.emulate_media(reduced_motion="no-preference")
        paused(page)
        page.locator("[data-sound]").click()
        expect(page.locator("[data-sound]")).to_have_text("Sound on")
        expect(page.locator("[data-sound]")).to_have_attribute("aria-pressed", "false")
        assert page.locator("video").evaluate("v => v.muted")
        done(page, "Keyboard controls, sound persistence, loop, offscreen/hidden lifecycle, explicit pause")

        page = page_for(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
        open_video(page)
        page.wait_for_timeout(300)
        assert not page.media_requests, "Reduced-motion baseline downloaded media"
        paused(page)
        page.locator("[data-play]").click()
        playing(page)
        assert "720p" in page.locator("video").evaluate("v => v.currentSrc")
        page.evaluate("""() => {
            window.motionChanges = 0;
            matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => window.motionChanges++);
        }""")
        page.emulate_media(reduced_motion="no-preference")
        page.wait_for_function("window.motionChanges === 1")
        playing(page)
        page.emulate_media(reduced_motion="reduce")
        page.wait_for_function("window.motionChanges === 2")
        paused(page)
        done(page, "Reduced-motion no-download baseline, manual opt-in and runtime preference pause")

        for signals in [
            {"saveData": True, "effectiveType": "4g", "downlink": 10},
            {"saveData": False, "effectiveType": "3g", "downlink": 2},
            {"saveData": False, "effectiveType": "4g", "downlink": 0.5},
        ]:
            page = page_for(viewport={"width": 1440, "height": 900}, connection=signals)
            open_video(page)
            page.wait_for_timeout(300)
            paused(page)
            assert not page.media_requests, signals
            page.locator("[data-play]").click()
            playing(page)
            assert "720p" in page.locator("video").evaluate("v => v.currentSrc")
            page.evaluate("window.testConnection.dispatchEvent(new Event('change'))")
            paused(page)
            done(page, f"Consent-aware connection loading: {signals}")

        page = page_for(viewport={"width": 1440, "height": 900})
        page.add_init_script("""(() => {
            const original = HTMLMediaElement.prototype.play;
            let reject = true;
            HTMLMediaElement.prototype.play = function() {
                if (reject) {
                    reject = false;
                    return Promise.reject(new DOMException('Simulated autoplay policy', 'NotAllowedError'));
                }
                return original.call(this);
            };
        })()""")
        open_video(page)
        expect(page.locator(".promo-status")).to_contain_text("Press Play")
        paused(page)
        assert page.locator("video").get_attribute("poster")
        page.locator("[data-play]").click()
        playing(page)
        done(page, "Rejected-autoplay poster and successful manual recovery, no unhandled rejection")

        page = page_for(viewport={"width": 1440, "height": 900})
        page.route("**/*.mp4", lambda route: route.fulfill(status=404, body="Missing test media"))
        open_video(page)
        expect(page.locator(".promo-status")).to_contain_text("could not load")
        paused(page)
        page.unroute("**/*.mp4")
        page.locator("[data-play]").click()
        playing(page)
        done(page, "Real media-load failure is visible and retry recovers")

        page = page_for(viewport={"width": 390, "height": 844}, java_script_enabled=False)
        page.goto(url)
        page.locator("video").scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        assert not page.media_requests
        assert page.locator("video").evaluate("v => v.controls && v.muted && v.preload === 'none' && !v.autoplay")
        expect(page.locator(".promo-controls")).to_be_hidden()
        assert page.locator(".promo-download").get_attribute("href").endswith("720p-v1.mp4")
        native_video = page.locator("video")
        native_video.hover()
        page.wait_for_timeout(500)
        native_video.click(position={"x": 24, "y": native_video.bounding_box()["height"] - 48})
        # Page rAF callbacks are disabled in the no-JS context; poll from the driver.
        for _ in range(25):
            page.wait_for_timeout(200)
            if native_video.evaluate("v => v.currentTime > 0 && !v.paused"):
                break
        assert native_video.evaluate("v => v.currentTime > 0 && !v.paused"), "Native Play did not start playback"
        page.screenshot(path=str(artifacts / "native-controls-review.png"))
        done(page, "JavaScript-disabled native Play control and no eager media download")

        page = page_for(viewport={"width": 390, "height": 844})
        page.goto(url + "/routes/west-chico-ccds/")
        text = page.locator("main").inner_text()
        for time in ["7:50", "8:00", "8:15"]:
            assert time in text, time
        assert "8:08" not in text
        page.locator(".menu-toggle").click()
        expect(page.locator(".menu-toggle")).to_have_attribute("aria-expanded", "true")
        page.keyboard.press("Escape")
        expect(page.locator(".menu-toggle")).to_have_attribute("aria-expanded", "false")
        for path in ["/", "/routes/", "/ride/", "/start-a-route/", "/about/",
                     "/routes/hancock-park-ccds/", "/routes/west-chico-ccds/"]:
            response = page.request.get(url + path)
            assert response.ok, (path, response.status)
        done(page, "West Chico schedule and existing mobile navigation preserved")

        browser.close()
    (artifacts / "promo-browser-results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(json.dumps(results, indent=2))
    print(f"PASS: {len(results)} scenarios")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8778")
    parser.add_argument("--artifacts", required=True, type=Path)
    args = parser.parse_args()
    args.artifacts.mkdir(parents=True, exist_ok=True)
    run(args.url.rstrip("/"), args.artifacts)
