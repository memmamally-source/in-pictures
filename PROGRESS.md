# In Pictures — progress

> Living record so any session can resume. Keep it short; update it at the end of each piece of work.

**Product:** plan the photos worth taking, then turn them into a designed album automatically. Local-first web app (PWA), later iOS/Android.
**Name:** "In Pictures" (chosen 5 Nov 2026; trademark, domain and app-store checks not done yet).
**Origin:** built in the Oursome repository (`albums/`, branch `claude/albums-memory-scrapbook-app-gy9o1f`) and moved here as its own project.

## Status

| Area | Status |
| --- | --- |
| Full journey (occasion → questions → checklist → photos → style → album → edit → save → PDF) | ✅ Works in headless Chromium (desktop + emulated iPhone 13) |
| 22 occasions (incl. Date nights, Work events), 678 photo ideas, 51 layouts, 6 styles | ✅ |
| Local storage, autosave, storage warnings | ✅ IndexedDB `in-pictures` |
| PDF export 150 / 300 dpi with resolution checks | ✅ |
| Print-ready PDF | ✅ 300 dpi, 1/8 in bleed (8.25 × 10.25 in), even pages, optional separate cover, sRGB. Verified with pdfinfo/pdfimages; not yet sent to a real printer |
| Quick album ("just add photos") | ✅ 60 photos imported and designed in ~9 s in headless Chromium |
| Bright lifestyle palette | ✅ Owner feedback round 1 |
| Multi-select "Who's in the photos?" + many more ideas | ✅ Owner feedback round 2: standard albums now 16–36 ideas (was 9–23), long 22–52; family + friends gets ideas for both and together |
| Hosting | GitHub Pages workflow ready (`deploy.yml`); needs Settings → Pages → GitHub Actions and a public repo (or paid plan) |
| Album sizes Simple / Deluxe / Extravagant (10–20 / 20–50 / 50–100 ideas) | ✅ Owner feedback round 3; free for everyone (owner decision); built so sizes could become paid later |
| Animated examples | ✅ "See what it makes" on the home page and a shareable page at `#/examples`: an example album (illustrations, labelled as such) laid out by the real engine, turning pages and cycling all six styles. Pauses off screen, on tap, and for reduced motion. Owner feedback round 4 |
| Review round (owner: "make it slick") | ✅ Smart selection (duplicates/blur, on-device), smart crop centres, backup/restore files, undo/redo, folded checklist + "Photography tips", "More options" in the questions form, returning users see their albums first, compact phone editor toolbar, privacy page (`#/privacy`); verified no requests leave the site |
| Photo-book vision (owner references: Rapid Studio brag book, Souvence, PikPerfect) | ✅ Book shapes (portrait / landscape 11 × 8.5 / square 12 × 12), generated professional layouts, two-page spreads (incl. panoramas) on screen and in print, Gallery and Bold Graphic styles, poster covers with 16 illustrations; occasions suggest shape + style (weddings → square Gallery) |
| Live site | ✅ https://memmamally-source.github.io/in-pictures/ (Pages on, deploys from `main`) |
| Physical phone testing | ❌ Not done |

## Next

1. Open the site on a real iPhone and Android phone, fix what turns up.
2. **App Store and Google Play (owner goal):** wrap the web app with Capacitor (keeps IndexedDB, the photo picker and PDF export), add native photo-library access and file sharing, then TestFlight / internal testing. Needs the owner's Apple Developer account (US$99/year) and Google Play developer account (US$25 once), privacy labels and store listings. Store submissions only with the owner's go-ahead.
3. Order one real test print (e.g. a photo-book service that takes 8 × 10 in PDFs with 1/8 in bleed) to check colours, trim and binding margins.
4. More print sizes (12 × 12 in square for weddings, landscape) and two-page panoramic spreads.
5. Backup/restore file (albums are lost if the browser clears its data).
6. Touch drag-to-reorder for photos and pages.
7. Put the end-to-end Playwright flow in the repo and CI.
8. Name clearance (trademark, domain, app stores).

## Key decisions

- Local-first: photos never leave the device; no accounts or payments in the prototype. Cloud backup plugs into `src/services/repository.ts` later (see `docs/ARCHITECTURE.md`).
- Deterministic layout engine, no AI. AI, if added, goes behind a backend and only suggests; the user accepts.
- One scene builder drives both the on-screen SVG and the PDF canvas, so the export matches the preview.
- HashRouter + `base: './'`: the build works under any sub-path.
