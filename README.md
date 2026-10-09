# Bike Bus Chico — Website

The website for **Bike Bus Chico**, a volunteer-led community bike bus program in Chico, CA.

Live site: **[bikebuschico.org](https://bikebuschico.org)**

This site is intentionally simple. It's built to be fast, easy to run on a plain
laptop, and friendly to edit even if you've never touched code. Everything you'll
normally want to change lives in a handful of clearly labeled files.

---

## What this site is built with

- **[Astro](https://astro.build)** — a website builder that turns simple files into
  a fast, static website. "Static" means the finished site is just plain HTML files —
  no database, no server to babysit, nothing to log into.
- A little **CSS** for styling and a tiny bit of JavaScript. That's it.

You don't need to understand any of that to keep the site running. The sections
below cover everything you'll actually do.

---

## Running the site on your own computer

You only need this if you want to *preview* the site locally before publishing.

### One-time setup

1. Install **[Node.js](https://nodejs.org)** (pick the "LTS" version). This is the
   engine that runs the site builder.
2. Open a terminal (on Windows: **PowerShell**), and go to this folder:
   ```powershell
   cd "C:\Users\erilov\OneDrive\Documents\Bike Bus Chico\website"
   ```
3. Install the site's building blocks (only needed once, or after an update):
   ```powershell
   npm install
   ```

### Preview the site

```powershell
npm run dev
```

Then open **http://localhost:4321/** in your browser. The page updates automatically
as you save changes. Press `Ctrl + C` in the terminal to stop it.

### Build the final site (for publishing)

```powershell
npm run build
```

This creates a `dist/` folder containing the finished website. That folder is what
gets published to the internet (see **Publishing** below).

Run `npm run check` before publishing to type-check the Astro components and route data.

---

## The things you'll actually want to edit

### 1. Email, navigation, and site text

Open **`src/data/site.ts`**.

This file holds the site name, canonical domain, description, contact email,
navigation, and calls to action. Community Discord access is invite-only: families
find a route and contact its ride leader. No public invite link is required.
It's safe to edit any text inside quotes.

### 2. Routes (bike bus schedules)

Open **`src/data/routes.ts`**.

Each route is one block of information — school name, meeting day, start time,
arrival time, stops along the way, and its status. To add a new route, copy an
existing block, paste it below, and change the details. To retire one, change its
`status` to `'paused'`.

Statuses you can use:
- `'active'` — running now
- `'forming'` — being organized, not riding yet
- `'paused'` — on a break

### 3. Photos

The homepage carousel uses all 11 supplied community photos. Oriented, sRGB,
high-quality WebP derivatives live in **`public/photos/community/`**; the original
JPEGs remain unchanged outside the repository. Derivatives preserve full images,
have a maximum long edge of 1440 pixels, omit EXIF/XMP metadata, and use filenames
containing the first 12 characters of their SHA-256 hash.

| File name | Where it shows |
|---|---|
| `community/community-<hash>.webp` | Homepage carousel immediately below the hero |
| `hero.jpg` | About page photo |

Update **`src/data/gallery.ts`** when adding/replacing carousel images: include the
new content-specific URL, actual dimensions, and descriptive alt text grounded in
the visible photo. Keep referenced files available when replacing them.
The older `ride-*.jpg` files remain available for existing direct links, but are
not duplicated in a second homepage gallery.

`PhotoCarousel.astro` shows uncropped landscape and portrait images in a
scroll-snap row. Previous/Next buttons and Arrow/Home/End keys enhance native
scrolling; touch swipe and the ordinary scrollable photos work without JavaScript.
There is no automatic rotation. Reduced motion uses instant scrolling, controls
retain focus at either end, and noninitial images use native lazy loading with
explicit dimensions. The original gallery's community copy is retained here.

### Homepage promo video

`src/components/PromoVideo.astro` places the uncropped 16:9 promo beside the
homepage headline and CTA, replacing the former hero photo. Mobile stacks the
headline/CTA, video, then carousel. Its versioned poster and two MP4s live in
`public/media/`; the original source file remains unchanged outside the repository.
Desktop uses an original-quality 1080p fast-start remux with copied H264 video
and AAC audio streams: no lossy re-encoding, cadence change, or content trimming.
Both renditions retain the complete promo and its original 32 fps cadence.
Narrow screens and data-conscious playback use a smaller 720p rendition.
Reduced motion disables autoplay, but does not lower resolution after explicit
Play. Save-Data, slow effective connections, or a positive downlink estimate below
1 Mbps disable autoplay and select 720p for manual playback. Missing/unknown
connection information does not force desktop into lower quality. The poster is
generated directly from the original at 1920 x 1080 with high JPEG quality.
Do not overwrite these URLs when replacing media: create new versioned filenames
and update the component.

The native baseline has controls, a poster, and `preload="none"`, with no autoplay.
JavaScript enables two always-visible icon controls at the video's lower-right
corner: Play/Pause and Sound on/off. Their high-contrast translucent navy backing,
44 x 44 pixel touch targets, visible focus, accessible labels, titles, and
event-driven states remain usable by touch and keyboard. Clicking/tapping the
video itself also toggles playback; the separate buttons never double-toggle it.
There is no under-video toolbar or extra caption. Autoplay rejection and genuine
load failures provide visible status text and a working Play/retry control.
Muted autoplay only runs while the video is visible and the page is active.
Reduced motion, Save-Data, and supported slow-connection signals disable autoplay;
visitors can explicitly press Play. Explicit pauses are never undone by scrolling
or returning to the tab, and sound is only enabled by a visitor's gesture.
Active playback rechecks resolution when crossing the mobile/desktop breakpoint,
preserving playback position and sound preference. A paused or offscreen video
does not fetch another rendition on resize; it selects the appropriate one on
the next permitted playback. No download link is promoted, including in fallback
markup. Browsers without enhancement retain native playback controls; supported
browsers suppress their download item via `controlslist="nodownload"`. This only
removes download UI, not the ability to save publicly playable media. No source
files are removed or reduced in quality as part of the control simplification.

No unverified captions or audio description are supplied. Before production
publication, review the actual soundtrack for speech and provide verified captions
if needed. The initial video implementation is for local review only; publishing
requires separate approval. Each file is below Cloudflare Pages' 25 MiB asset limit.

Optional browser regression checks use an already-installed Python Playwright
and Microsoft Edge, without adding application dependencies. After building
and starting `npm run preview -- --host 127.0.0.1 --port 8778`, run:

```powershell
python tests\promo_video_browser.py --url http://127.0.0.1:8778 --artifacts "$env:TEMP\bike-bus-video-review"
```

The checks cover responsive full-frame layout, real playback/control events,
keyboard interaction, sound/loop state, reduced motion, simulated connection and
page-visibility signals, autoplay rejection, media errors, and native no-JS playback.
The same suite verifies hero/gallery placement, all carousel images, controls,
focus, native touch scrolling and JavaScript-disabled content. Screenshots and
JSON results go to the selected artifact directory, not the site.

### 4. Route maps & optional PDF

Store route maps in **`public/routes/`** and set each route's `mapImage` in
`src/data/routes.ts` to the current file:

| File name | What it is |
|---|---|
| `hancock-park-map-3b93b79529e3.png` | Current Hancock Park route map |
| `west-chico-map-6832c28e94a5.png` | Current two-branch West Chico route map |
| `hancock-park-route.pdf` | A downloadable/printable route sheet |

Both routes have map images. No printable PDF is currently included; the download
link appears only when the corresponding PDF is present. Maps show geography;
the stop list generated from `src/data/routes.ts` is the schedule reference.
Keep map screenshots uncropped with their original aspect ratios and visible
attribution. Each route page offers the full-size image and a PNG download for
static/print use, plus a lazy-loaded shared Google My Maps embed configured by
`routeMapEmbedUrl` in `src/data/site.ts`.

When replacing a map, use a new filename containing the first 12 lowercase
characters of its SHA-256 hash, then update `mapImage`, `mapWidth`, and `mapHeight`.
Images can remain cached in browsers for four hours, so overwriting an existing
filename can leave families seeing old artwork. Full-size and download links
automatically use `mapImage`; old files may remain for older direct links.

West Chico has two neighborhood branches. Its confirmed Warner St. Orchard
departure is 7:50 AM, both branches meet at the flashing sign at 8:00 AM, and
arrive at school by 8:15 AM. The other branch's starting point and departure
time are not published until confirmed. `startLabel` and `scheduleNote` make
this distinction explicit; do not apply the Warner departure to both branches.

### 5. Rider Bold brand assets

The approved Path 3 identity lives in **`public/brand/path3/`**. Header and footer
logos and the wide wheel-pattern banner are exact original kit SVGs. Do not
recolor, distort, or redraw them. The homepage callout uses the wide banner as a
cover/no-repeat background, with a compact navy text backdrop and a separate
cream button; it does not use a repeating square tile or a circular badge.

Lilita One headlines, Montserrat ExtraBold labels, and Inter body text are
self-hosted under `public/brand/path3/fonts/`, alongside their OFL license notices.
`social.png` uses the original logo proportionally on a 1200 x 630 warm-white
canvas. The favicon uses the original standalone color rider SVG at the versioned
`/brand/path3/rider-favicon-v2.svg` URL; the old badge asset is retained but no longer
linked. Site colors and responsive
layouts are defined in `src/styles/global.css`.

---

## Publishing to the internet (Cloudflare Pages)

This site is designed for **[Cloudflare Pages](https://pages.cloudflare.com)**, which
hosts sites like this for free.

**The short version:**

1. Put this project in a **GitHub** repository (a free code-storage account).
2. In Cloudflare Pages, choose **Create a project → Connect to Git** and pick that repo.
3. When it asks for build settings, use:
   - **Framework preset:** `Astro`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Click deploy. Cloudflare builds the site and gives you a live web address.
5. In Cloudflare, add your custom domain **bikebuschico.org** under the project's
   **Custom domains** tab and follow the prompts.

The existing project is **bike-bus-chico**, connected to
**elovelin/bike-bus-chico**. Its production branch is **main**. Push a feature
branch, check its Cloudflare Pages build, and merge normally into `main` to
publish. Do not change DNS or the Pages configuration for ordinary site updates.
Verify the Cloudflare check and the actual custom domain after merging; a push
alone is not proof of publication. Keep the previous production commit as a
rollback reference and use a normal revert commit if a rollback is needed.

---

## Editing with GitHub Copilot

You don't have to hand-edit these files if you'd rather describe what you want.
Copilot can make the change for you. Some prompts that work well:

- *"In `src/data/site.ts`, update the contact email or navigation label."*
- *"Add a new forming route to `src/data/routes.ts` for Chico Junior High that meets
  Thursdays, leaving at 7:45am and arriving 8:10am, with stops at Bidwell Park and
  1st & Flume."*
- *"Change the status of the Hancock Park route to paused."*
- *"Update the homepage headline in `src/pages/index.astro` to say '…'."*

Always **preview with `npm run dev`** after a change to make sure it looks right.

---

## Folder map (so you know where things live)

```
website/
├─ public/            ← Photos, maps, and files that get served as-is
│  ├─ photos/         ← Hash-versioned carousel derivatives and About photo
│  └─ routes/         ← Hash-versioned map images, optional route PDFs
├─ src/
│  ├─ data/
│  │  ├─ site.ts      ← ★ Site name, links, menu, calls-to-action
│  │  ├─ gallery.ts   ← Carousel image URLs, dimensions, and alt text
│  │  └─ routes.ts    ← ★ All bike bus routes & schedules
│  ├─ pages/          ← One file per page of the site
│  ├─ components/     ← Reusable building blocks (header, footer, cards…)
│  ├─ layouts/        ← The shared page frame
│  └─ styles/         ← Colors, fonts, spacing
├─ package.json       ← Project settings (rarely touched)
└─ README.md          ← This file
```

The two files marked ★ are the ones you'll edit most.

---

## Quick reference

| I want to… | Do this |
|---|---|
| Preview the site | `npm run dev`, open http://localhost:4321/ |
| Build for publishing | `npm run build` |
| Type-check the site | `npm run check` |
| Change email/navigation | Edit `src/data/site.ts` |
| Add or edit a route | Edit `src/data/routes.ts` |
| Add carousel photos | Generate versioned, metadata-free derivatives; update `src/data/gallery.ts` |
| Add the route map/PDF | Drop files in `public/routes/` |
| Publish a change | Merge into `main`, then verify Cloudflare and bikebuschico.org |

---

*Built with care for the families of Chico. Ride. Connect. Start one.* 🚲
