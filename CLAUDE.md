# In Pictures — notes for Claude

Read `PROGRESS.md` first: status, decisions and what's next. Update it at the end of each piece of work.

- Vite 8 / React 19 / TypeScript 6 / Tailwind 4. Check `node_modules` types rather than memory when an API matters.
- Run `npm run check` (typecheck, lint incl. React Compiler rules, tests) before committing. Avoid setState inside effects; effects must return nothing or a cleanup function.
- Product name and tagline come from `src/config/brand.ts` (also `index.html`, `public/manifest.webmanifest`). App colours are tokens in `src/styles.css`; album colours are in `src/layouts/themes.ts` (a test keeps text at WCAG AA).
- Keep domain logic pure and tested (`src/templates`, `src/layouts`, `src/engine`, `src/render/scene.ts`); screens stay thin.
- Photos stay on the device. Never add uploads, analytics or third-party requests without the owner's say-so. Never put API keys in frontend code.
- Never invent text for someone's album: only what they typed, or dates.
- Never claim device testing that wasn't done. Ask before paid services, deploys, billing or store submissions.
