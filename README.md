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

---

## The things you'll actually want to edit

### 1. Discord & Instagram links, email, and site text

Open **`src/data/site.ts`**.

Near the top you'll see:

```ts
discordUrl: '#',
instagramUrl: '#',
```

Replace each `'#'` with your real link, keeping the quotes — for example:

```ts
discordUrl: 'https://discord.gg/your-invite-code',
instagramUrl: 'https://instagram.com/bikebuschico',
```

> ⚠️ **Until you paste in the real Discord link, every "Join the Community" button
> points to `#` and won't go anywhere.** This is the single most important edit to make.

The same file also holds the site name, tagline, description, contact email, and the
navigation menu. It's safe to edit any text inside quotes.

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

Real photos make this site come alive. Drop image files into the **`public/photos/`**
folder using these exact names and they'll appear automatically:

| File name | Where it shows |
|---|---|
| `hero.jpg` | Big image at the top of the homepage |
| `ride-01.jpg`, `ride-02.jpg`, `ride-03.jpg` | Photo strip further down the homepage |

Until real photos are added, the site shows clean placeholders — nothing looks broken.

**Photo tips:** landscape (wide) orientation works best, aim for real kids-and-families
moments over posed shots, and keep each file under ~500 KB so pages stay fast.

### 4. Route map & PDF (for the Hancock Park route)

Drop these into the **`public/routes/`** folder and they'll appear on that route's page:

| File name | What it is |
|---|---|
| `hancock-park-map.png` | An image of the route map |
| `hancock-park-route.pdf` | A downloadable/printable route sheet |

If they're missing, the page politely shows a placeholder instead — again, nothing breaks.

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

After that first setup, **every time you save a change to GitHub, Cloudflare
automatically rebuilds and republishes the site** within a minute or two. You never
have to run the build yourself for publishing.

---

## Editing with GitHub Copilot

You don't have to hand-edit these files if you'd rather describe what you want.
Copilot can make the change for you. Some prompts that work well:

- *"In `src/data/site.ts`, set the Discord link to https://discord.gg/abc123 and the
  Instagram link to https://instagram.com/bikebuschico."*
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
│  ├─ photos/         ← hero.jpg, ride-01.jpg … (add real photos here)
│  └─ routes/         ← hancock-park-map.png, hancock-park-route.pdf
├─ src/
│  ├─ data/
│  │  ├─ site.ts      ← ★ Site name, links, menu, calls-to-action
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
| Change Discord/Instagram links | Edit `src/data/site.ts` |
| Add or edit a route | Edit `src/data/routes.ts` |
| Add photos | Drop files in `public/photos/` |
| Add the route map/PDF | Drop files in `public/routes/` |
| Publish a change | Save it to GitHub — Cloudflare republishes automatically |

---

*Built with care for the families of Chico. Ride. Connect. Start one.* 🚲
