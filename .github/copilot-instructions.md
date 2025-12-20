## Quick orientation

This is a small static website for "Shree Jugal Kishore Ji Temple". It's a single-page layout composed of three panels (left/center/right) and a top header. Key files:

- `index.html` — main markup and the small app script (navigation, booking fetch, carousel).
- `css/style.css` — layout and simple visual rules (panels: 20% / 60% / 20%) plus carousel styling.
- `js/main.js` — optional helper that renders a calendar if an element with id `calendar` exists.
- `img/` — static images used by the site.

If you need to make changes, start from `index.html` — most behavior and integrations live there.

## Architecture & data flows (what matters)

- Single-page static site — no build system or backend code in the repo.
- Booking list is populated client-side by fetching a Google Apps Script web app. The constant is defined in `index.html`:

  const SHEET_URL = "https://script.google.com/macros/s/....../exec";

  The script is expected to return a JSON array of objects. Current UI expects `Full Name` and `Date of Aarti` keys.

- Booking UI: `#bookingList` in the right panel is refreshed by `loadBookings()` and `setInterval(loadBookings, 30000)`.

- Navigation: header links use inline onclick handlers that call `showSection('id')` and sections are regular `<div id="..." class="section">`. The `showSection` function hides all `.section` elements then shows the selected one.

- **Gallery Carousel:** Images in the `gallery` section auto-rotate every 5 seconds using `startCarouselAutoPlay()`. Manual control: arrow buttons call `changeCarouselSlide(±1)`, dots call `currentCarouselSlide(n)`. The carousel CSS classes are in `style.css` (`.carousel-container`, `.carousel-slide`, `.carousel-nav`, `.carousel-indicators`, `.dot`).

## Project-specific conventions & patterns

- Use inline navigation handlers (not a router). When adding a new page/section:
  - Add `<a onclick="showSection('yourId')">` in the header `nav`.
  - Add a `<div id="yourId" class="section" style="display:none;">...</div>` in the center panel.

- Section visibility: default home is visible, other sections start with `style="display:none;"`.

- Layout sizing is fixed in `css/style.css`: left 20%, center 60%, right 20%. Keep this unless you change CSS intentionally.

- Carousel pattern: to add more images, duplicate a `.carousel-slide` div with a new image src, add a corresponding `.dot` span in the indicators, and increment the carousel slide count in JavaScript if needed.

- Small JS utilities live in `index.html` script tag (carousel functions, bookings, navigation). Keep logic here for simplicity.

## Integration points and external dependencies

- Bootstrap is loaded from CDN in `index.html`. Keep that link if you rely on its classes (`table`, `list-group`, etc.).
- External embeds that are intentionally placeholders:
  - Google Form iframe used for booking (`aarti` section).
  - Google Maps embed in contact section — replace `src="https://www.google.com/maps/embed?pb=!1m18!..."` with a real embed link.
- Google Apps Script endpoint (SHEET_URL) is the primary data source. When changing fields in the sheet or script, update parsing logic inside `index.html` where `loadBookings()` reads `row["Full Name"]` and `row["Date of Aarti"]`.
- Gallery images: all `img/img*.jpg` files. To add more images, add new slides in the carousel HTML.

## Typical developer workflows (no build)

- Local preview quickly:
  - Preferred: use VS Code Live Server extension.
  - Or run a simple HTTP server from the repo root (PowerShell):

    python -m http.server 8000

  - Then open http://localhost:8000 in a browser.

- Debugging fetches:
  - Open the browser DevTools Console/Network to inspect requests to `SHEET_URL`.
  - If `loadBookings()` fails, the page shows an error message in the right panel and logs the error to console.

- Testing carousel:
  - Open Gallery section in browser and watch images auto-advance every 5 seconds.
  - Click arrows to manually step through slides.
  - Click dots to jump to a specific slide.

## Small implementation notes / examples

- **Adding carousel images:** Add new `.carousel-slide` div with an `<img src="img/yourImage.jpg">` inside the `.carousel-wrapper`, then add a corresponding `.dot` in `.carousel-indicators`.

- **Changing auto-advance speed:** Edit `setTimeout(..., 5000)` in `startCarouselAutoPlay()` function (value in ms).

- **Adding a new booking column:** if the Apps Script returns `Mobile` as a key, update the render loop in `index.html` to read `row["Mobile"]` and include it in the list markup.

- **Example: add a new section "Events":**
  1. In header `nav` add: `<a onclick="showSection('events')">Events</a>`
  2. In center-panel add: `<div id="events" class="section" style="display:none;">...your HTML...</div>`

## What not to change without coordination

- Avoid changing the `SHEET_URL` value unless you own the Google Apps Script endpoint — changing it will break live booking data.
- Keep the Bootstrap CDN or replace with a compatible CSS framework if you update classes across the site.
- Carousel autoplay interval is set to 5 seconds; adjust only if needed for user experience.

## Quick check-list before opening a PR

- Preview locally and test the booking list loads (or properly fails with console error).
- Test carousel: verify auto-advance, manual arrows, and dot clicks work.
- If you add new carousel images, ensure they exist in `img/` directory and update dot count in HTML.
- Replace any `YOUR_*_ID` or placeholder URLs (Drive folder, maps) with real values.
- Check small-screen behavior (no responsive CSS beyond Bootstrap CDN included).

## Where to add follow-ups

- Small tasks: edit `index.html`, `css/style.css`, `js/main.js`.
- New carousel features: add logic to index.html script, styling to css/style.css.
- Add new JS modules only if necessary; prefer keeping behavior minimal and in-file for this repo.

— End of guidance — 
