# In Pictures — architecture

The app is a static, local-first single-page app. Everything that decides *what the album looks like* is pure TypeScript with tests; React only displays it.

```
answers ─▶ planner ─▶ checklist (PlanItem[])
photos + checklist + chapters ─▶ generator ─▶ Album (pages: layoutId + photo slots + text)
page + theme ─▶ scene (display list) ─┬─▶ SVG on screen (PageView)
                                      └─▶ canvas → JPEG → PDF (export)
```

## 1. Template engine (photo plans)

Files: `src/templates/schema.ts`, `shots.ts`, `occasions.ts`, `planner.ts`.

Occasions are assembled from parts instead of written out as fixed lists:

| Part | Where | Role |
| --- | --- | --- |
| Shot library | `shots.ts` | 53 reusable prompts (departure, landmark, couple portrait, cake, candles, group photo…) with category, default chapter, priority and an optional condition |
| Occasion | `occasions.ts` | 20 entries: chapters (story order, one marked `ending`), the questions to ask, shot references (by id, optionally overridden) plus occasion-only shots, suggested themes and a title template |
| Conditions | `Condition` | keep a shot only for certain groups (`groups`, `notGroups`), with/without children, trip length (`minDays`), a named honoree, an occasion answer (`extra`, `extraEquals`), group size |
| Target rules | `TargetRule` | counts that scale: `base + perDay × (days − 1) + perPerson × (people − 1)`, capped |
| Per-day shots | `perDay: true` | one prompt per day (“Day 2 (Tue 2 Jun): highlight of the day”) up to 7 days, then one prompt with a target of N |
| Tokens | `{location}`, `{honoree}`, `{names}`, `{year}`, `{extra:id}` | filled only from the user’s answers; when an answer is missing the shot’s `fallbackTitle` is used — nothing is invented |
| Album length | short / standard / long | includes priority 1, ≤2 or ≤3 shots |

`buildPlan(occasion, answers)` is deterministic with stable item ids, so `mergePlan` can rebuild the plan after the user edits their details while keeping skips, ticks, edited titles/targets and custom prompts.

The combinations come from 20 occasions × 5 group types × children yes/no × trip length × occasion-specific answers × 3 lengths × 7 moods, on the planning side, and 6 themes × 51 layouts on the design side. None of these are stored as separate templates.

**Add an occasion:** append an `OccasionDef` to `OCCASIONS`. Reference library shots by id, override fields inline (`{ id: 'toast', chapter: 'table' }`), add new shots inline with all fields. Tests check every shot lands in one of the occasion’s chapters, every occasion has one ending chapter, and every group produces a usable plan.

## 2. Layout schema

Files: `src/layouts/schema.ts`, `layouts.ts`, `themes.ts`.

A page is 100 × 125 units (8 × 10 in portrait; 1 unit = 0.08 in). A `LayoutDef` contains:

- `photos`: frames `{x, y, w, h, rotate?, frame?, shape?, hero?}`; `hero` marks the slot for a favourite;
- `texts`: boxes with a role (title, heading, caption, date, names, note…), alignment, base size, `maxLines`, and `photo` for captions tied to a slot (`inFrame` puts it in a polaroid’s bottom strip);
- `decor`: vector ornaments (tape, sprig, postmark, corners, double border, …), below or `over` photos;
- `kind` (cover, photos, chapter, closing), `themes` (which styles may use it), `captions` (`required` = reserves room, only chosen when captions exist; `soft` = fine without), `weight`, `bleed`.

There are 51 layouts: 7 covers, 5 chapter openers, 9 one-photo, 8 two-photo, 9 three-photo, 5 four-, 3 five- and 3 six-photo pages, and 2 closing pages.

A `ThemeDef` sets paper colours and pattern, fonts per role (title, heading, body, caption, label), default frame (none, mat, polaroid, stamp, mount) and shape (rect, rounded, arch), tilt (how much rotation layouts keep), shadows, and ornaments cycled across pages. A theme’s look comes from the layouts it may use as well as from these values. Signature layouts (scattered prints for Scrapbook, photo-booth strips and polaroids for Polaroid, arches for Romantic, stamps and postmarks for Travel, mounts and borders for Heritage, white-space editorial pages for Minimal) are preferred slightly by the generator.

**Add a layout:** append to `LAYOUTS`. Tests check every frame stays on the page, photo layouts have a hero slot, and every theme still has a cover, chapter, closing and 1–6-photo layout. **Add a theme:** add a `ThemeDef`, then tag the layouts it should use.

## 3. Album generator

File: `src/engine/generate.ts`. Deterministic heuristics; no AI.

1. **Sections.** If photos have chapters (set by hand, or inherited from the checklist prompt they’re attached to), sections follow the occasion’s chapter order. Unsorted photos are grouped by capture day (EXIF) and placed before the ending chapter. If no photo has a chapter, sections are capture days (or months for long spans) when ≥70% of photos have dates; otherwise there is one section. One-photo sections are folded into a neighbour.
2. **Cover:** the chosen cover photo, else the first favourite, else the first photo. The cover layout is the one that crops it least. With 8+ photos the cover photo isn’t repeated inside.
3. **Chapter openers:** only with 2+ sections, only for sections of 3+ photos, the largest first, capped by length (2 / 4 / 8). Photo openers use a favourite that fits.
4. **Pages:** each section is split by dynamic programming over consecutive runs of 1–6 photos. For each run, every layout allowed by the theme is scored:
   - **crop loss** per photo (`1 − min(ar_photo/ar_frame, ar_frame/ar_photo)`), weighted towards large frames, with a steep penalty past 42%; the best photo-to-frame assignment is found by trying every permutation (greedy by aspect for 6);
   - **favourites** outside the hero slot cost more; a favourite alone on a page gets a bonus;
   - **captions**: layouts that reserve caption space need captions; captioned photos prefer layouts that show them;
   - **density**: a per-photo penalty for straying from the target photos per page (short 3.4, standard 2.5, long 1.7), so the page count isn’t biased;
   - **variety** between neighbouring pages: no back-to-back repeats of a layout, nor two full-bleed pages in a row, and a mix of photo counts;
   - small seeded jitter, so **Redesign** (new seed) gives a different but equally valid result.
5. **Closing:** with 10+ photos the last photo of the story gets a closing photo page; otherwise a text page. Only the user’s title, dates, names and closing note are used.

Text is only ever what the user typed (title, location, names, closing note, captions) or dates (from their answers or photo EXIF). No captions or descriptions are generated.

**Faces:** there is no face detection. When a tall photo is cropped to a wider frame, the default focal point is 40% from the top (where faces usually are), and the crop-loss limits keep crops moderate. Users can drag or zoom any crop.

Edits (`src/engine/edit.ts`) are pure functions on the `Album`: move, add, remove pages; change layout (keeps photos, fills new frames from unused photos); place a photo (swaps if it’s already used, so nothing is duplicated or lost); swap slots; set focal point or zoom; set text; “try another” (next-best layout for the same photos); apply a theme (moves each page to the closest layout the new theme allows).

## 4. Rendering and PDF

`src/render/scene.ts` turns a page into a display list (paths, frames with crop rectangles, fitted text lines) in page units. `PageView` draws it as inline SVG; `canvas.ts` draws the same list onto a canvas for export. Line breaks come from canvas `measureText` with the real fonts (`render/text.ts`), so the PDF breaks lines where the preview does. Fonts are bundled (`@fontsource`, OFL) and load before measuring and export.

PDF (`src/export/pdf.ts`, jsPDF loaded on demand): one canvas per page at 150 or 300 dpi, JPEG-encoded, placed on an 8 × 10 in page. Pages are drawn one at a time and canvases are freed straight away.

`src/export/quality.ts` computes each photo’s effective resolution in its frame (`pixels in the crop ÷ printed inches`) and flags anything under 220 ppi for high-quality exports (under 150 ppi = low), or under 100 ppi for standard.

**Printing limitations:** there’s no bleed, no crop marks and no CMYK/colour profile, and text is rasterised. The export is fine for screens and home printing but **not** set up for professional print shops. A print-partner integration would need a bleed-aware renderer (frames touching the edge extended by 0.125 in) and the partner’s size templates. The page-unit geometry makes that a renderer change, not a layout change.

## 5. Storage, autosave, recovery

- IndexedDB (`idb`), database `in-pictures`: `projects` (JSON), `photos` (metadata, indexed by project), `blobs` (`<photoId>:thumb|display|full`).
- Import (`storage/images.ts`): one photo at a time, decoded with EXIF orientation applied, then saved as three JPEGs (480 / 1600 / ≤3600 px). Transparent PNGs get a white background. Failures (unsupported format, full storage) are reported per file.
- Autosave (`state/project.ts`): project JSON 400 ms after a change, photo metadata immediately, each photo as soon as it’s processed. Saving is flushed when the tab is hidden and on `beforeunload`, with a warning if an import is still running. The header shows *Saving… / Saved on this device / Not saved*.
- Recovery: because everything is saved as it happens, reopening resumes where the user left off. The library links each draft to its last step.
- Storage health (`storage/quota.ts`): usage and quota from `navigator.storage.estimate()`, a warning at 80% and 95%, and a button to request persistent storage. The UI says plainly that this is not a cloud backup.

## 6. Future features — where they plug in

| Feature | Integration point |
| --- | --- |
| Firebase Auth | Add an auth service; nothing in the app needs a user today. Keep anonymous/local use working. |
| Cloud backup / sync | Implement `ProjectRepository` (`services/repository.ts`) with Firestore (`users/{uid}/projects/{id}`, `…/photos/{id}`) and Cloud Storage (`users/{uid}/photos/{photoId}/{variant}`); wrap local + cloud in a syncing repository (write local first, upload only after opt-in, merge by `updatedAt`). Swap `repo` in one place. |
| Collaborative albums, invites, QR codes, group submissions | Add `members`/`contributors` to `Project` and an `addedBy` to `Photo`; Firestore rules per album; submissions land as unsorted photos, which the generator already handles. |
| AI photo sorting, semantic grouping, captions | Behind a secure backend (never an API key in the browser). Results map onto existing fields: `Photo.chapter`, `planItemId`, `favourite` and suggested captions the user must accept. The generator and renderers need no change. |
| Destination-specific plans | More `ShotDef`s with a destination condition (e.g. `Condition.locationMatches`) or a server-provided shot pack in the same schema. |
| Trip maps and timelines | EXIF GPS can be added to `readExif`; a map page is a new `LayoutKind` with its own scene op. |
| Reminders | Plan items already have chapters/dates; notifications need a service worker push or a native wrapper. |
| Premium templates | Layouts and themes are data. A pack is a JSON module of `LayoutDef[]` / `ThemeDef[]` gated by an entitlement that the server verifies. |
| Printing partners | See printing limitations above; add a `PrintProvider` interface beside `export/pdf.ts`. |
| More formats (square books, landscape, slideshows) | Page units are fixed at 100 × 125 today. A format would add its own layout set and `PAGE_H`, which the scene builder and renderers already take from the schema. |
| iOS / Android apps | Wrap with Capacitor (keeps IndexedDB and the file input) or port the pure modules (`templates`, `layouts`, `engine`, `render/scene`) to React Native; they have no DOM dependencies. |

## 7. Known limitations

- Not tested on physical phones; tested with headless Chromium on desktop and an emulated iPhone 13 viewport.
- HEIC decoding depends on the browser (Safari yes, Chrome/Firefox no).
- Very large photos (e.g. 48 MP) are decoded at full size before resizing; on older phones that could run out of memory. They’re processed one at a time to reduce that risk.
- No undo history beyond reversible edits and “Redesign”.
- Reordering by drag uses HTML5 drag-and-drop (desktop); on touch devices use the Earlier/Later buttons.
- PDF text is part of the page image (not selectable or searchable).
- Data is per browser and device; nothing syncs.
