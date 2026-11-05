# In Pictures — progress

> Living record so any session can resume. Keep it short; update it at the end of each piece of work.

**Product:** plan the photos worth taking, then turn them into a designed album automatically. Local-first web app (PWA), later iOS/Android.
**Name:** "In Pictures" (chosen 5 Nov 2026; trademark, domain and app-store checks not done yet).
**Origin:** built in the Oursome repository (`albums/`, branch `claude/albums-memory-scrapbook-app-gy9o1f`) and moved here as its own project.

## Status

| Area | Status |
| --- | --- |
| Full journey (occasion → questions → checklist → photos → style → album → edit → save → PDF) | ✅ Works in headless Chromium (desktop + emulated iPhone 13) |
| 20 occasions, 53 library shots, 51 layouts, 6 styles | ✅ |
| Local storage, autosave, storage warnings | ✅ IndexedDB `in-pictures` |
| PDF export 150 / 300 dpi with resolution checks | ✅ Not print-shop ready (no bleed/CMYK) |
| Bright lifestyle palette | ✅ Owner feedback round 1 |
| Hosting | GitHub Pages workflow ready (`deploy.yml`); needs Settings → Pages → GitHub Actions and a public repo (or paid plan) |
| Physical phone testing | ❌ Not done |

## Next

1. Turn on Pages, open the site on a real iPhone and Android phone, fix what turns up.
2. Backup/restore file (albums are lost if the browser clears its data).
3. Touch drag-to-reorder for photos and pages; undo.
4. Put the end-to-end Playwright flow in the repo and CI.
5. Name clearance (trademark, domain, app stores).

## Key decisions

- Local-first: photos never leave the device; no accounts or payments in the prototype. Cloud backup plugs into `src/services/repository.ts` later (see `docs/ARCHITECTURE.md`).
- Deterministic layout engine, no AI. AI, if added, goes behind a backend and only suggests; the user accepts.
- One scene builder drives both the on-screen SVG and the PDF canvas, so the export matches the preview.
- HashRouter + `base: './'`: the build works under any sub-path.
