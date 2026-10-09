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
    playback_records = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="msedge", headless=True)

        def page_for(**kwargs):
            signals = kwargs.pop("connection", {"saveData": False, "effectiveType": "4g", "downlink": 10})
            context = browser.new_context(**kwargs)
            page = context.new_page()
            if signals is None:
                page.add_init_script("Object.defineProperty(navigator, 'connection', {get: () => undefined});")
            elif signals != "native":
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
            expect(page.locator("[data-play]")).to_have_attribute("aria-label", "Pause video")
            expect(page.locator("[data-play]")).to_have_attribute("title", "Pause video")
            expect(page.locator("[data-play]")).to_have_attribute("aria-pressed", "true")
            expect(page.locator(".icon-pause")).to_be_visible()
            expect(page.locator(".icon-play")).to_be_hidden()

        def paused(page):
            page.wait_for_function("document.querySelector('video').paused")
            expect(page.locator("[data-play]")).to_have_attribute("aria-label", "Play video")
            expect(page.locator("[data-play]")).to_have_attribute("title", "Play video")
            expect(page.locator("[data-play]")).to_have_attribute("aria-pressed", "false")
            expect(page.locator(".icon-play")).to_be_visible()
            expect(page.locator(".icon-pause")).to_be_hidden()

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
            assert details["width"] == page.locator(".hero .promo-band").evaluate("e => e.clientWidth"), details
            assert details["width"] < width, details
            assert details["muted"] and details["loop"] and details["inline"], details
            assert not details["native"] and details["fit"] == "contain", details
            assert 30.68 < details["duration"] < 30.75, details
            assert details["naturalWidth"] == (1280 if width <= 760 else 1920), details
            assert details["source"].endswith("720p-v2.mp4" if width <= 760 else "1080p-v2.mp4"), details
            playback_records.append({"viewport": width, **details})
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), width
            assert page.locator(".hero .button").get_attribute("href") == "/routes/"
            assert page.locator(".hero .promo-band").count() == 1
            assert page.locator(".promo-band").count() == 1
            assert page.locator(".promo-band a").count() == 0
            assert page.locator(".promo-band [download]").count() == 0
            assert page.locator(".promo-bar, .promo-label, .promo-download").count() == 0
            assert page.locator("video a").count() == 0
            expect(page.locator("video")).to_have_attribute("controlslist", "nodownload")
            bounds = page.locator("video").bounding_box()
            overlay = page.locator(".promo-controls").bounding_box()
            assert overlay["y"] >= bounds["y"] + bounds["height"] * 0.62, (overlay, bounds)
            assert overlay["x"] + overlay["width"] <= bounds["x"] + bounds["width"], (overlay, bounds)
            assert overlay["y"] + overlay["height"] <= bounds["y"] + bounds["height"], (overlay, bounds)
            assert abs(page.locator(".promo-band").bounding_box()["height"] - bounds["height"]) < 1
            for control in page.locator(".promo-controls button").all():
                target = control.bounding_box()
                assert target["width"] >= 44 and target["height"] >= 44, target
                assert control.get_attribute("aria-label") == control.get_attribute("title")
            assert page.locator(".photo-carousel").count() == 1
            assert page.locator(".photo-grid").count() == 0
            assert page.locator(".hero + .ride-gallery + .intro-band").count() == 1
            assert page.locator(".closing-pattern").count() == 1
            assert page.locator("link[rel=canonical]").get_attribute("href") == "https://bikebuschico.org/"
            assert page.locator('meta[name="robots"][content*="noindex"]').count() == 0
            page.locator("[data-play]").click()
            paused(page)
            if width in [390, 1440]:
                page.locator(".photo-carousel").scroll_into_view_if_needed()
                page.wait_for_function("Array.from(document.querySelectorAll('.carousel-slide img')).slice(0, 3).every(i => i.complete && i.naturalWidth > 0)")
                page.locator("video").scroll_into_view_if_needed()
                page.locator("video").evaluate("v => { v.currentTime = 3; }")
                page.wait_for_function("!document.querySelector('video').seeking && document.querySelector('video').readyState >= 2")
                page.screenshot(path=str(artifacts / f"homepage-overlay-v3-{width}.png"), full_page=True)
                page.locator(".hero").screenshot(path=str(artifacts / f"hero-overlay-v3-{width}.png"))
            if width in [320, 390, 1440]:
                page.locator("video").scroll_into_view_if_needed()
                page.locator("video").evaluate("v => { v.currentTime = 5; }")
                page.wait_for_function("!document.querySelector('video').seeking && document.querySelector('video').readyState >= 2")
                page.locator(".promo-inner").screenshot(path=str(artifacts / f"video-overlay-school-v3-{width}.png"))
            done(page, f"Layout and actual muted playback at {width}px")

        page = page_for(viewport={"width": 1440, "height": 160})
        page.goto(url)
        page.locator(".promo-controls").wait_for(state="visible")
        page.wait_for_timeout(300)
        assert not page.media_requests, "Offscreen video should not download"
        page.set_viewport_size({"width": 1440, "height": 900})
        page.locator("video").scroll_into_view_if_needed()
        playing(page)
        page.locator("[data-sound]").click()
        expect(page.locator("[data-sound]")).to_have_attribute("aria-label", "Sound off")
        expect(page.locator("[data-sound]")).to_have_attribute("title", "Sound off")
        expect(page.locator("[data-sound]")).to_have_attribute("aria-pressed", "true")
        expect(page.locator(".icon-audible")).to_be_visible()
        expect(page.locator(".icon-muted")).to_be_hidden()
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
        expect(page.locator("[data-sound]")).to_have_attribute("aria-label", "Sound on")
        expect(page.locator("[data-sound]")).to_have_attribute("title", "Sound on")
        expect(page.locator("[data-sound]")).to_have_attribute("aria-pressed", "false")
        expect(page.locator(".icon-muted")).to_be_visible()
        expect(page.locator(".icon-audible")).to_be_hidden()
        assert page.locator("video").evaluate("v => v.muted")
        done(page, "Keyboard controls, sound persistence, loop, offscreen/hidden lifecycle, explicit pause")

        page = page_for(viewport={"width": 1440, "height": 900})
        open_video(page)
        playing(page)
        page.locator("video").evaluate("""v => {
            window.gestureCounts = {play: 0, pause: 0};
            for (const event of ['play', 'pause']) v.addEventListener(event, () => window.gestureCounts[event]++);
        }""")
        page.locator("[data-sound]").click()
        playing(page)
        assert not page.locator("video").evaluate("v => v.muted")
        assert page.evaluate("gestureCounts") == {"play": 0, "pause": 0}
        page.locator("[data-play]").click()
        paused(page)
        page.wait_for_timeout(100)
        assert page.evaluate("gestureCounts") == {"play": 0, "pause": 1}
        video = page.locator("video")
        bounds = video.bounding_box()
        video.click(position={"x": bounds["width"] * 0.25, "y": bounds["height"] * 0.25})
        playing(page)
        assert page.evaluate("gestureCounts") == {"play": 1, "pause": 1}
        video.click(position={"x": bounds["width"] * 0.25, "y": bounds["height"] * 0.25})
        paused(page)
        page.wait_for_timeout(100)
        assert page.evaluate("gestureCounts") == {"play": 1, "pause": 2}
        page.locator("[data-play]").focus()
        page.keyboard.press("Space")
        playing(page)
        assert page.evaluate("gestureCounts") == {"play": 2, "pause": 2}
        expect(page.locator("[data-play]")).to_be_focused()
        assert page.locator("[data-play]").evaluate("e => e.matches(':focus-visible') && getComputedStyle(e).outlineStyle !== 'none'")
        video.evaluate("v => { v.currentTime = 3; }")
        page.wait_for_function("!document.querySelector('video').seeking && document.querySelector('video').readyState >= 2")
        page.locator(".promo-inner").screenshot(path=str(artifacts / "overlay-focus-playing-v3-1440.png"))
        page.locator("[data-sound]").focus()
        page.keyboard.press("Space")
        playing(page)
        assert page.locator("video").evaluate("v => v.muted")
        assert page.evaluate("gestureCounts") == {"play": 2, "pause": 2}
        page.keyboard.press("Tab")
        assert page.evaluate("!document.activeElement.closest('.promo-controls')"), "Overlay trapped keyboard focus"
        done(page, "Video clicks toggle exactly once, sound never toggles playback, focused icon keys and Tab exit work")

        page = page_for(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, reduced_motion="reduce")
        open_video(page)
        paused(page)
        assert not page.media_requests
        video = page.locator("video")
        bounds = video.bounding_box()
        video.tap(position={"x": bounds["width"] * 0.25, "y": bounds["height"] * 0.25})
        playing(page)
        assert video.evaluate("v => v.muted")
        page.locator("[data-sound]").tap()
        playing(page)
        assert not video.evaluate("v => v.muted")
        video.evaluate("v => { v.currentTime = 3; }")
        page.wait_for_function("!document.querySelector('video').seeking && document.querySelector('video').readyState >= 2")
        page.locator(".promo-inner").screenshot(path=str(artifacts / "overlay-playing-sound-v3-390.png"))
        page.locator("[data-play]").tap()
        paused(page)
        video.tap(position={"x": bounds["width"] * 0.25, "y": bounds["height"] * 0.25})
        playing(page)
        assert not video.evaluate("v => v.muted")
        done(page, "Actual touch taps on video and both overlay icons preserve sound and do not double-toggle")

        page = page_for(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
        open_video(page)
        page.wait_for_timeout(300)
        assert not page.media_requests, "Reduced-motion baseline downloaded media"
        paused(page)
        page.locator("[data-play]").click()
        playing(page)
        assert "1080p-v2" in page.locator("video").evaluate("v => v.currentSrc")
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

        for width in [1440, 1920]:
            for signals in [None, {}, {"effectiveType": "4g", "downlink": 1.3},
                            {"effectiveType": "unknown", "downlink": 0}]:
                page = page_for(viewport={"width": width, "height": 900}, connection=signals)
                open_video(page)
                playing(page)
                details = page.locator("video").evaluate("""v => ({
                    source: v.currentSrc, naturalWidth: v.videoWidth, naturalHeight: v.videoHeight,
                    renderedWidth: v.clientWidth, renderedHeight: v.clientHeight, time: v.currentTime
                })""")
                assert details["naturalWidth"] == 1920 and details["naturalHeight"] == 1080, details
                assert details["source"].endswith("1080p-v2.mp4"), details
                playback_records.append({"viewport": width, "connection": signals, **details})
                done(page, f"Original desktop quality at {width}px with connection={signals}")

        page = page_for(viewport={"width": 390, "height": 900}, reduced_motion="reduce")
        open_video(page)
        page.locator("[data-play]").click()
        playing(page)
        page.locator("video").evaluate("v => { v.currentTime = 5; }")
        page.wait_for_function("!document.querySelector('video').seeking && document.querySelector('video').currentTime >= 5")
        page.locator("[data-sound]").click()
        page.set_viewport_size({"width": 1440, "height": 900})
        page.locator("video").scroll_into_view_if_needed()
        page.wait_for_function("document.querySelector('video').videoWidth === 1920 && document.querySelector('video').currentTime >= 5")
        playing(page)
        assert not page.locator("video").evaluate("v => v.muted")
        assert page.locator("video").evaluate("v => v.currentTime < 8")
        page.locator("[data-play]").click()
        paused(page)
        request_count = len(page.media_requests)
        page.set_viewport_size({"width": 390, "height": 900})
        page.wait_for_timeout(300)
        paused(page)
        assert page.locator("video").evaluate("v => v.currentSrc.endsWith('1080p-v2.mp4')")
        assert not any("720p" in request for request in page.media_requests[request_count:])
        page.locator("[data-play]").click()
        page.wait_for_function("document.querySelector('video').videoWidth === 1280")
        playing(page)
        assert not page.locator("video").evaluate("v => v.muted")
        done(page, "Resize upgrades active playback, preserves time/sound, never overrides explicit pause")

        for width in [320, 390, 768, 1440]:
            page = page_for(viewport={"width": width, "height": 900}, reduced_motion="reduce")
            page.goto(url)
            track = page.locator(".carousel-row")
            track.scroll_into_view_if_needed()
            previous = page.locator("[data-previous]")
            next_button = page.locator("[data-next]")
            expect(previous).to_have_attribute("aria-disabled", "true")
            expect(next_button).to_have_attribute("aria-disabled", "false")
            assert page.locator(".carousel-slide").count() == 11
            assert page.locator('.carousel-slide img[loading="lazy"]').count() == 10
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            original_scroll = track.evaluate("e => e.scrollLeft")
            page.wait_for_timeout(500)
            assert track.evaluate("e => e.scrollLeft") == original_scroll, "Carousel rotated automatically"
            next_button.click()
            page.wait_for_function("document.querySelector('.carousel-row').scrollLeft > 0")
            expect(previous).to_have_attribute("aria-disabled", "false")
            expect(next_button).to_be_focused()
            track.focus()
            page.keyboard.press("End")
            expect(next_button).to_have_attribute("aria-disabled", "true")
            assert track.evaluate("e => Math.abs(e.scrollLeft - (e.scrollWidth - e.clientWidth)) < 2")
            next_button.focus()
            next_button.click(force=True)
            expect(next_button).to_be_focused()
            assert track.evaluate("e => Math.abs(e.scrollLeft - (e.scrollWidth - e.clientWidth)) < 2")
            previous.click()
            expect(next_button).to_have_attribute("aria-disabled", "false")
            expect(previous).to_be_focused()
            track.focus()
            page.keyboard.press("Home")
            expect(previous).to_have_attribute("aria-disabled", "true")
            page.keyboard.press("ArrowRight")
            expect(previous).to_have_attribute("aria-disabled", "false")
            assert page.locator(".carousel-status").inner_text()
            for image in page.locator(".carousel-slide img").all():
                image.scroll_into_view_if_needed()
                expect(image).to_have_js_property("complete", True)
                assert image.evaluate("e => e.naturalWidth > 0 && e.naturalHeight > 0 && getComputedStyle(e).objectFit === 'contain'")
                assert image.get_attribute("alt")
                assert image.get_attribute("width") and image.get_attribute("height")
            if width == 390:
                page.locator(".carousel-slide").nth(6).scroll_into_view_if_needed()
                expect(page.locator(".carousel-status")).to_have_text("Photo 7 of 11")
                page.evaluate("document.activeElement.blur()")
                page.locator(".ride-gallery").screenshot(path=str(artifacts / "carousel-portrait-overlay-v3-390.png"))
            done(page, f"Carousel controls, keyboard, ends/focus, no rotation and all 11 images at {width}px")

        page = page_for(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, reduced_motion="reduce")
        page.goto(url)
        track = page.locator(".carousel-row")
        track.scroll_into_view_if_needed()
        bounds = track.bounding_box()
        session = page.context.new_cdp_session(page)
        session.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 1})
        x = bounds["x"] + bounds["width"] * 0.8
        y = bounds["y"] + bounds["height"] / 2
        session.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
        for step in range(1, 16):
            session.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x - step * 15, "y": y}]})
            page.wait_for_timeout(20)
        session.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        page.wait_for_function("document.querySelector('.carousel-row').scrollLeft > 0")
        expect(page.locator("[data-previous]")).to_have_attribute("aria-disabled", "false")
        done(page, "Actual touch scroll gesture advances the native scroll-snap carousel")

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
        page.locator(".promo-band").screenshot(path=str(artifacts / "autoplay-rejected-overlay-v3.png"))
        page.locator("[data-play]").click()
        playing(page)
        done(page, "Rejected-autoplay poster and successful manual recovery, no unhandled rejection")

        page = page_for(viewport={"width": 1440, "height": 900})
        page.route("**/*.mp4", lambda route: route.fulfill(status=404, body="Missing test media"))
        open_video(page)
        expect(page.locator(".promo-status")).to_contain_text("could not load")
        assert "download" not in page.locator(".promo-status").inner_text().lower()
        paused(page)
        page.locator(".promo-band").screenshot(path=str(artifacts / "media-error-overlay-v3.png"))
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
        assert page.locator(".promo-band a").count() == 0
        assert page.locator(".promo-band [download]").count() == 0
        assert page.locator("video").evaluate("v => v.controlsList.contains('nodownload')")
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
        page.screenshot(path=str(artifacts / "native-controls-overlay-v3.png"))
        assert page.locator(".carousel-slide img").count() == 11
        expect(page.locator(".carousel-controls")).to_be_hidden()
        page.locator(".carousel-row").scroll_into_view_if_needed()
        page.locator(".carousel-row").focus()
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(500)
        assert page.locator(".carousel-row").evaluate("e => e.scrollLeft > 0")
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
    (artifacts / "homepage-overlay-browser-results-v3.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    (artifacts / "homepage-overlay-playback-sources-v3.json").write_text(json.dumps(playback_records, indent=2), encoding="utf-8")
    print(json.dumps(results, indent=2))
    print(f"PASS: {len(results)} scenarios")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8778")
    parser.add_argument("--artifacts", required=True, type=Path)
    args = parser.parse_args()
    args.artifacts.mkdir(parents=True, exist_ok=True)
    run(args.url.rstrip("/"), args.artifacts)
