# pruthvip.tech

Personal portfolio of **Pruthvi Panchal**, a software engineer building real-time trading systems in Go and C++.

Plain HTML, CSS and JavaScript: no framework, no build step, no dependencies. The files in this folder are exactly what gets served.

The idea: *Pruthvi* (पृथ्वी) means Earth in Sanskrit, so the site opens on a spinning Earth with Gandhinagar lit up, and the side projects orbit it.

## What's in here

| Path | Purpose |
| --- | --- |
| `index.html` | The whole site. All the text lives here, one commented block per section |
| `assets/css/style.css` | Styles: dark by default, plus a light theme (the sun/moon button switches, and the choice is remembered) |
| `assets/js/main.js` | Optional extras: the spinning Earth and the light sent across it, the orbiting projects and their portraits, the platform diagram, the 250µs race, the page's own measurements, the command palette, the theme switch, the menu, scroll effects, copy-email and local time |
| `assets/js/earth-data.js` | Which dots of the globe are land. Generated; see "Earth data" below |
| `tools/build-earth.mjs` | Regenerates `earth-data.js`. Not needed to run or deploy the site |
| `assets/Pruthvi-Panchal-Resume.pdf` | The resume linked from the site |
| `assets/og-image.png` | Preview image shown when the link is shared on LinkedIn, WhatsApp, Slack or X |
| `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` | Browser and home-screen icons: the Earth with the Moon in orbit |
| `404.html` | The "This page drifted out of orbit" page GitHub Pages shows for unknown URLs |
| `CNAME` | Tells GitHub Pages to serve the site at `pruthvip.tech` |
| `.nojekyll` | Makes GitHub Pages serve the files as-is |
| `robots.txt`, `sitemap.xml` | Hints for search engines: what to read (the résumé is kept out) and which pages exist. See "Search engines" below |

## Preview locally

Double-click `index.html`. Everything works from the file system.

## Things to play with

All of these are optional extras in `assets/js/main.js`. Without JavaScript the page still reads in full; with reduced motion nothing moves on its own, but everything still works.

- **Spin the Earth:** the hero is a dotted globe built from real coastlines and lit by the real Sun, so day and night fall exactly where they do right now. Cities light up on the night side, a thin amber line marks dusk, and the Moon is drawn at tonight's real phase. The Gandhinagar pin is a live clock: it shows the time there with a Sun or a Moon worked out from that same sunlight, and hovering or tapping it says more. Drag the globe to spin it (sideways on a phone) and click the Moon to jump to Moonsplit. The amber arcs illustrate live prices streaming out of GIFT City.
- **Send light across it:** click or tap anywhere on the globe and a pulse of light leaves Gandhinagar for that place, along the shortest path. A chip lands with it: the place, the distance, how long light needs, and the 0.25 ms an order takes. It is shown 25 times slower than real. The buttons under the globe (Mumbai, Singapore, London, New York) do the same and turn the globe to show the whole path. A visitor whose clock is on another country's time gets one pulse sent their way. Only the browser's time-zone name is used, and nothing is sent anywhere.
- **Watch a day pass:** the button under the globe plays 24 hours in ten seconds. Night crosses the planet, the city lights come on, and the pin's clock runs along with it.
- **Things I've built:** each card opens with a small moving picture of what the system does, and folds out "How it's built" with points from the résumé. "See it in the diagram" jumps to that service in the diagram below.
- **See how it works:** six services pass prices (amber dots) and orders and events (green dots) over the bus, and small arrows show which way each link flows. Click a service to switch it off. Messages for a consumer (broadcast, notify, search) wait in JetStream with a "waiting" count and catch up when it's back on; switching off a source (market-data, orders, payments) leaves the services it feeds idle. "Send an order" sends your own, brighter order through; with notify off, its alert waits and arrives when notify is back. The status line under the diagram reports its health and can turn everything back on, next to a small legend.
- **Skills:** hover over a skill, or tap it, to see where it was used.
- **Pruthvi's Universe:** six side projects orbit a small Earth. Click a world, its label or a tab to open that project; the chosen one glides round to the front. Drag sideways to turn all the orbits. Each card opens on a window of sky with its namesake drawn in it, and choosing Spacetime shows the grid of spacetime bending under the Earth. A link such as `pruthvip.tech/#sirius` opens that project's card.
- **Can you beat 250µs?** A reaction race against the order system's average latency, with a report on your last five runs. Your best time is kept in this browser.
- **This page, measured:** click "loaded in … ms" in the footer. The page reads its own numbers in your browser: load time, first paint, weight, the round trip to the server and a live frame rate.
- **Command palette:** Ctrl/⌘ + K, `/`, or the search button in the header (the only way in on a phone), to jump anywhere, open a project, send light to a city, spin the Earth or start the race. Type `sudo` for a surprise.
- **Small things:** the Moon in the header's logo goes once round its Earth as you scroll down the page; a Sun rises over the Earth's edge at Contact; the line under the stats counts orders at 1,250 a second since you opened the page; Contact says how far your clock is from Gandhinagar's.

## Updating the site

- **Text:** edit `index.html`. Sections are marked `<!-- About -->`, `<!-- Experience -->` and so on.
- **Resume:** overwrite `assets/Pruthvi-Panchal-Resume.pdf` with the new PDF, keeping the same file name.
- **Pruthvi's Universe:** each project is an `<article class="project">` with a matching tab (`data-tab` set to the article's `id`) and a `<canvas class="project-art">` for its window of sky. The article's `data-body` picks how it's drawn, in orbit and in that window: `moon`, `star`, `nebula`, `hole`, `quasar` or `well`. Orbits run outward in tab order. A seventh project also needs a seventh entry in the `ORBITS`, `SPEED` and `angles` lists in `initUniverse()` in `main.js`; a new kind of body also needs a drawing in `DRAW` there and a portrait in `ART` in `initPortraits()`. Keep `../UNIVERSE.md` in step.
- **Things I've built:** each card is an `<li class="card">`. Its `.card-art` is the moving picture (pure CSS, under "Each card opens with a small moving picture" in `style.css`), its `<details class="how-built">` holds the points from the résumé, and the button's `data-spot` names its place in the diagram: a service (`md`, `bc`, `or`, `pay`, `nt`, `sr`), `bus` or `all`.
- **Skills:** a chip's `data-used` attribute is the line shown when it is hovered or tapped. Chips without one stay plain: gRPC, REST, Gin, Fasthttp, Docker, GitLab, KrakenD and pprof have none, because the résumé doesn't say where they were used. Keep every line to what the résumé says.
- **Places:** `PLACES` in `main.js` lists the cities that light up at night and that name wherever light lands, as `name,lat,lon`. The buttons under the globe are `data-light-to` buttons in `index.html`, and the palette has its own list; each name must match one in `PLACES`.
- **The numbers:** `ORDER_MS` (0.25) and `ORDERS_PER_S` (1,250) near the top of `main.js` feed the light chip, the running count under the stats and the measurement panel. If the résumé's figures change, change them there and in the page's text.
- **Earth data:** `assets/js/earth-data.js` is generated by `tools/build-earth.mjs` from Natural Earth's coastlines (public domain); the script's header says where to download them. Run `node tools/build-earth.mjs <ne_110m_land.geojson> assets/js/earth-data.js`. You only need this to change how many dots the globe has.
- **Publish:** commit and push to `main`. GitHub Pages redeploys in about a minute.

## Search engines

### What's in place

- **In `index.html`'s `<head>`:** the title, a description of about 155 characters, the canonical URL, Open Graph and X preview tags, and structured data (JSON-LD).
  - The structured data describes the site (`#website`), the profile page (`#profilepage`), you (`#person`) and the public projects.
  - The site's `name` is "Pruthvi Panchal", which is what Google shows as the site name in results. `og:site_name` says the same.
  - CodeNebula's reference names `https://pruthvip.tech/#person` as its author, so keep that `@id` as it is.
- **`robots.txt`:**
  - keeps the résumé (it carries the phone number), `tools/` and this README out of search;
  - lists two sitemaps: this site's and CodeNebula's (`/CodeNebula/sitemap.xml`, written by its VitePress build).
- **`sitemap.xml`:** lists the one page.
- **`rel="me"`** on the LinkedIn and GitHub links tells search engines those profiles are yours.
- **Google verification: `google36e9d14bf79de261.html`** at the root proves to Google Search Console that the site is yours. Keep it: Search Console re-checks it, and deleting it loses access.
- **IndexNow key: `0212f42f9b98fb67aab12f0c2fc6f87e.txt`** at the root proves to Bing, Yandex and the other IndexNow engines that notices about this site come from you. Keep it. After a big change, tell them straight away:

  ```powershell
  $body = @{ host = 'pruthvip.tech'; key = '0212f42f9b98fb67aab12f0c2fc6f87e'; keyLocation = 'https://pruthvip.tech/0212f42f9b98fb67aab12f0c2fc6f87e.txt'; urlList = @('https://pruthvip.tech/', 'https://pruthvip.tech/CodeNebula/') } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri https://api.indexnow.org/indexnow -ContentType 'application/json; charset=utf-8' -Body $body
  ```

  Google doesn't use IndexNow; for Google, use **Request indexing** in Search Console.

### When you change the page

- **Dates:** set `lastmod` in `sitemap.xml` and `dateModified` in the JSON-LD to the day you publish.
- **Structured data:** if a fact changes (job, skills, a project going public), change it in the JSON-LD too.
- **Previews:** after changing the title, description or preview image, re-scrape the link at <https://www.linkedin.com/post-inspector/>.

### One-time setup (done by hand)

1. **HTTPS.** In the repository, open **Settings → Pages** and tick **Enforce HTTPS**. Then `http://pruthvip.tech` redirects to `https://`, and search engines see only one copy.
2. **Google Search Console** (<https://search.google.com/search-console>):
   1. **Add property → Domain**, enter `pruthvip.tech`. Google shows a TXT record.
   2. In get.tech: **DNS tab → DNS Records → Add new record → TXT**. Leave **Host name** blank and paste Google's value. Click **Verify** in Search Console; it can take a few minutes to see the record.
   3. **Sitemaps:** submit `https://pruthvip.tech/sitemap.xml` and `https://pruthvip.tech/CodeNebula/sitemap.xml`.
   4. **URL inspection:** enter `https://pruthvip.tech/`, then **Request indexing**. Do the same for `https://pruthvip.tech/CodeNebula/`.
3. **Bing Webmaster Tools** (<https://www.bing.com/webmasters>): sign in and choose **Import from Google Search Console**. Bing's index also feeds DuckDuckGo, Yahoo, Copilot and ChatGPT search.
4. **Point your profiles here.** Search engines find and trust a new site through links from places they already know:
   - **GitHub profile → Edit profile:** Website `https://pruthvip.tech`, a short bio, location "Gandhinagar, India", company "Greeksoft Technologies".
   - **Each repository's About (gear icon) → Website:**
     - `pruthvipanchal.github.io`: `https://pruthvip.tech`
     - `CodeNebula`: `https://pruthvip.tech/CodeNebula/`
     - `Sirius`: `https://pruthvip.tech/#sirius`
   - **GitHub profile → Customize your pins:** CodeNebula, Sirius and `pruthvipanchal.github.io`.
   - **LinkedIn:** **Contact info → Website** (type: Portfolio) `https://pruthvip.tech`, and add the site under **Featured**. In **Settings → Visibility → Edit your public profile**, keep **Your profile's public visibility** on and every section shown: a hidden public profile never appears in Google.
   - **More profiles under the same name,** each with the same headline and a link here: for example Stack Overflow, X, Peerlist, or dev.to or Medium with an article. Profile pages on big sites often rank for a name themselves, so they fill the first page of results with you and point back here.
5. **Check back in a week or two.** Search Console's **Pages** report shows what's indexed. Test the structured data at <https://search.google.com/test/rich-results> and <https://validator.schema.org/>, and speed at <https://pagespeed.web.dev/>.
6. **Ranking first for your name.** Google decides the order, and your own searches are personalised, so measure it in Search Console: **Performance → Search results**, filtered to the query `pruthvi panchal`, shows the site's average position. A new domain usually takes weeks to climb; links from profiles that already rank for the name (step 4) are what move it.

If the résumé ever shows up in Google anyway (for example, because another site links to it), remove it with Search Console's **Removals** tool.

## Deploying: GitHub Pages + get.tech DNS

### 1. Push to GitHub

1. Create a new **public** repository named exactly `pruthvipanchal.github.io` at <https://github.com/new>. Leave "Add a README", `.gitignore` and license unticked.
2. In this folder:

   ```powershell
   git add -A
   git commit -m "Launch portfolio"
   git remote add origin https://github.com/pruthvipanchal/pruthvipanchal.github.io.git
   git push -u origin main
   ```

### 2. Turn on GitHub Pages

In the repository, open **Settings → Pages**:

1. **Build and deployment → Source:** Deploy from a branch. **Branch:** `main`, folder `/ (root)`, then **Save**.
2. **Custom domain:** enter `pruthvip.tech`, then **Save**. The `CNAME` file in this repo already contains it.

Do this before step 3, so the domain is claimed on GitHub before DNS points at it.

### 3. Point the domain at GitHub (get.tech)

1. Log in at <https://get.tech> (Login takes you to `manage.get.tech`).
2. **Your domains → pruthvip.tech → Manage → DNS tab → DNS Records.**
   Under **DNS tab → Nameservers**, the default nameservers must be selected (they are today: `tech-domains.*.orderbox-dns.com`).
3. Click **Add new record** once per row. For the root domain, leave **Host name** blank. TTL can stay on Auto.

   | Type | Host name | Value |
   | --- | --- | --- |
   | A | *(blank)* | `185.199.108.153` |
   | A | *(blank)* | `185.199.109.153` |
   | A | *(blank)* | `185.199.110.153` |
   | A | *(blank)* | `185.199.111.153` |
   | AAAA | *(blank)* | `2606:50c0:8000::153` |
   | AAAA | *(blank)* | `2606:50c0:8001::153` |
   | AAAA | *(blank)* | `2606:50c0:8002::153` |
   | AAAA | *(blank)* | `2606:50c0:8003::153` |
   | CNAME | `www` | `pruthvipanchal.github.io` |

   Do not add a wildcard (`*`) record: GitHub warns it allows domain takeover.

### 4. Check DNS and switch on HTTPS

```powershell
Resolve-DnsName pruthvip.tech -Type A -Server 8.8.8.8      # expect the four 185.199.x.153 addresses
Resolve-DnsName www.pruthvip.tech -Server 8.8.8.8          # expect pruthvipanchal.github.io
```

Once **Settings → Pages** says the DNS check succeeded, tick **Enforce HTTPS**. The certificate usually arrives within an hour, but GitHub allows up to 24 hours. `www.pruthvip.tech` then redirects to `pruthvip.tech` automatically.

### 5. Recommended: verify the domain with GitHub

Verification stops anyone else from publishing a GitHub Pages site on your domain.

1. GitHub → your profile picture → **Settings → Pages → Add a domain** → `pruthvip.tech`.
2. GitHub shows a TXT record. In get.tech, add a **TXT** record with Host name `_github-pages-challenge-pruthvipanchal` and the value GitHub gives you.
3. Back on GitHub, click **Verify**. It can take a few minutes for the record to be seen.

### Troubleshooting

- **"DNS check unsuccessful" or the HTTPS box is greyed out:** DNS hasn't propagated yet. Wait, re-run the `Resolve-DnsName` checks, then remove and re-save the custom domain in Settings → Pages to retry.
- **GitHub 404 page:** confirm Pages is publishing from `main` / `(root)` and that `index.html` sits at the repository root.
- **Old preview image on LinkedIn:** re-scrape the URL at <https://www.linkedin.com/post-inspector/>.
- **Renewal:** check the expiry date in `manage.get.tech` and turn on auto-renew. If the domain lapses, the site goes offline.
